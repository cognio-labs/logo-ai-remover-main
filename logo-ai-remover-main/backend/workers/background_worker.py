import logging
import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from backend.models.background_job import (
    BackgroundJobStatus,
    BackgroundImageMetadata,
    BackgroundConfig,
    BackgroundType,
)
from backend.services.background_service import background_job_service
from backend.services.model_manager import model_manager
from backend.services.mask_refiner import MaskRefiner
from backend.services.compositing_service import CompositingService
from backend.services.bg_verifier import BackgroundQualityVerifier

logger = logging.getLogger(__name__)


def process_background_removal(job_id: str) -> None:
    """
    Executes end-to-end background removal pipeline for a job.
    Called in a background task or synchronously.
    """
    start_time = time.time()
    try:
        # Step 1: Validating
        background_job_service.update(
            job_id,
            status=BackgroundJobStatus.VALIDATING,
            progress=10,
            stage="Validating",
            message="Validating image integrity, format, and dimensions",
        )

        job = background_job_service.get(job_id)
        img_rgb, orig_meta = background_job_service.load_original_rgb(job_id)
        h, w = img_rgb.shape[:2]

        background_job_service.update(
            job_id,
            status=BackgroundJobStatus.PREPARING,
            progress=25,
            stage="Preparing",
            message=f"Preparing {w}x{h} image for AI segmentation",
        )

        # Step 2: Segmenting
        background_job_service.update(
            job_id,
            status=BackgroundJobStatus.SEGMENTING,
            progress=50,
            stage="Segmenting",
            message="Running AI saliency segmentation network",
        )

        quality_mode = job.config.quality_mode
        fast_mode = quality_mode == "fast"
        ultra_hd = quality_mode == "ultra_hd" or max(h, w) > 2048

        # Run inference
        raw_mask = model_manager.predict_mask(img_rgb, fast_mode=fast_mode, tiled=ultra_hd)

        # Subject Detection & Landscape Protection
        from backend.engines.subject_detector import subject_detector
        confidence_report = subject_detector.analyze_mask(raw_mask.astype(np.float32) / 255.0, img_rgb)
        if confidence_report.status == "NO_SUBJECT":
            # A second architecture can recover small products that the first model misses.
            alternate = model_manager.get_engine("balanced" if fast_mode else "fast")
            alternate_mask = alternate.remove_background(
                cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR),
                quality_mode="balanced" if fast_mode else "fast",
            )
            alternate_report = subject_detector.analyze_mask(
                alternate_mask.astype(np.float32) / 255.0, img_rgb
            )
            if alternate_report.status != "NO_SUBJECT":
                raw_mask = alternate_mask
                confidence_report = alternate_report
        logger.info(
            "Job %s subject confidence: status=%s score=%.2f area=%.3f",
            job_id, confidence_report.status, confidence_report.confidence_score, confidence_report.mask_area_ratio
        )

        if confidence_report.status == "NO_SUBJECT":
            logger.warning("No prominent foreground subject detected in job %s. Preserving original image.", job_id)
            # Safe Fallback: keep original image intact, do NOT tear into shredded cutout!
            refined_mask = np.full((h, w), 255, dtype=np.uint8)
            processed_fg = img_rgb
            mask_path = background_job_service.save_mask(job_id, refined_mask)

            export_ext = "png" if job.config.bg_type == BackgroundType.TRANSPARENT else job.config.export_format.value
            composited_img = np.dstack([img_rgb, refined_mask]) if job.config.bg_type == BackgroundType.TRANSPARENT else img_rgb
            result_path = background_job_service.save_result(job_id, composited_img, ext=export_ext)
            preview_path = background_job_service.save_preview(job_id, composited_img)

            elapsed_ms = int((time.time() - start_time) * 1000)
            result_meta = BackgroundImageMetadata(
                width=w, height=h, channels=4 if job.config.bg_type == BackgroundType.TRANSPARENT else 3,
                format=export_ext, size_bytes=Path(result_path).stat().st_size
            )
            background_job_service.update(
                job_id,
                status=BackgroundJobStatus.NO_CLEAR_SUBJECT,
                progress=100,
                stage="No Clear Subject",
                message="No prominent foreground subject detected in this landscape/scene photo.",
                mask_path=str(mask_path),
                result_path=str(result_path),
                preview_path=str(preview_path),
                result_metadata=result_meta,
                processing_time_ms=elapsed_ms,
                confidence_score=confidence_report.confidence_score,
                confidence_report=confidence_report.to_dict(),
                warnings=confidence_report.warnings,
                actions=confidence_report.actions,
            )
            return

        # Step 3: Refining
        background_job_service.update(
            job_id,
            status=BackgroundJobStatus.REFINING,
            progress=70,
            stage="Refining",
            message="Applying sub-pixel edge matting and hair/fur smoothing",
        )

        if job.config.edge_refinement:
            refined_mask = MaskRefiner.refine_mask(
                img_rgb,
                raw_mask,
                bilateral_refine=True,
                fill_holes=True,
                smooth_radius=2
            )
        else:
            refined_mask = raw_mask

        # Save alpha mask
        mask_path = background_job_service.save_mask(job_id, refined_mask)

        # Step 4: Compositing
        background_job_service.update(
            job_id,
            status=BackgroundJobStatus.COMPOSITING,
            progress=85,
            stage="Compositing",
            message="Generating high-fidelity composite and transparent layers",
        )

        # Color decontamination if requested
        if job.config.color_decontamination:
            processed_fg = MaskRefiner.color_decontaminate(img_rgb, refined_mask)
        else:
            processed_fg = img_rgb

        # Composite output
        composited_img = CompositingService.composite(
            image_rgb=processed_fg,
            alpha_mask=refined_mask,
            bg_type=job.config.bg_type.value,
            bg_color=job.config.bg_color,
            backdrop_id=job.config.backdrop_id,
            shadow_config=job.config.shadow.model_dump() if job.config.shadow else None,
        )

        # Step 5: Verifying
        background_job_service.update(
            job_id,
            status=BackgroundJobStatus.VERIFYING,
            progress=92,
            stage="Verifying",
            message="Verifying output dimensions, alpha channel, and color accuracy",
        )

        mask_verification = BackgroundQualityVerifier.verify_alpha_mask(refined_mask, (h, w))
        if not mask_verification["valid"]:
            logger.warning("Mask verification notice for job %s: %s", job_id, mask_verification["issues"])

        # Determine export format
        export_ext = job.config.export_format.value
        # Force png if transparent
        if job.config.bg_type == BackgroundType.TRANSPARENT:
            export_ext = "png"

        result_path = background_job_service.save_result(job_id, composited_img, ext=export_ext)
        preview_path = background_job_service.save_preview(job_id, composited_img)

        # Check output image verification
        expected_channels = 4 if job.config.bg_type == BackgroundType.TRANSPARENT else 3
        img_verification = BackgroundQualityVerifier.verify_output_image(
            str(result_path),
            expected_shape=(h, w),
            expected_channels=expected_channels
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        result_meta = BackgroundImageMetadata(
            width=w,
            height=h,
            channels=expected_channels,
            format=export_ext,
            size_bytes=Path(result_path).stat().st_size,
        )

        # Step 6: Completed
        background_job_service.update(
            job_id,
            status=BackgroundJobStatus.COMPLETED,
            progress=100,
            stage="Completed",
            message="Background removal completed successfully",
            mask_path=str(mask_path),
            result_path=str(result_path),
            preview_path=str(preview_path),
            result_metadata=result_meta,
            processing_time_ms=elapsed_ms,
            confidence_score=confidence_report.confidence_score,
            confidence_report=confidence_report.to_dict(),
            warnings=confidence_report.warnings,
            actions=confidence_report.actions,
        )
        logger.info("Job %s completed in %d ms", job_id, elapsed_ms)

    except Exception as exc:
        logger.exception("Error processing background removal for job %s", job_id)
        background_job_service.update(
            job_id,
            status=BackgroundJobStatus.FAILED,
            progress=100,
            stage="Failed",
            message="Processing failed",
            error=str(exc),
        )
