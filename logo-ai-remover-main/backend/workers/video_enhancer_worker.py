import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import shutil
import cv2

from backend.models.video_enhancer_job import (
    VideoEnhancerJobStatus,
)
from backend.services.video_enhancer.audio_processor import audio_processor
from backend.services.video_enhancer.denoise_deblock_engine import denoise_deblock_engine
from backend.services.video_enhancer.frame_decoder import frame_decoder
from backend.services.video_enhancer.frame_interpolation_engine import frame_interpolation_engine
from backend.services.video_enhancer.job_service import (
    VideoEnhancerJobNotFoundError,
    video_enhancer_job_service,
)
from backend.services.video_enhancer.quality_validator import quality_validator
from backend.services.video_enhancer.super_resolution_engine import (
    SuperResolutionError,
    compute_target_dimensions,
    super_resolution_engine,
)
from backend.services.video_enhancer.video_encoder import video_encoder
from backend.services.video_enhancer.video_inspector import video_inspector

logger = logging.getLogger(__name__)

_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="video-enhancer-worker")


def _run_video_enhancer_job(job_id: str) -> None:
    try:
        job = video_enhancer_job_service.get(job_id)
    except VideoEnhancerJobNotFoundError:
        logger.error(f"Worker could not find job {job_id}")
        return

    if job.cancelled:
        logger.info(f"Job {job_id} was cancelled before starting")
        return

    root = video_enhancer_job_service.create_layout(job_id)
    frames_in_dir = root / "frames_in"
    frames_out_dir = root / "frames_out"
    temp_dir = root / "temp"
    audio_file = temp_dir / "audio.aac"
    input_path = Path(job.original_path)

    out_ext = job.options.output_format.lower()
    if out_ext not in ("mp4", "mov", "webm"):
        out_ext = "mp4"
    output_video_path = root / f"enhanced_{job_id}.{out_ext}"

    try:
        # 1. Probing & Validation
        video_enhancer_job_service.update(
            job_id,
            status=VideoEnhancerJobStatus.PROBING,
            stage="Analyzing Source",
            message="Probing video stream metadata and signature",
            progress=5.0,
        )

        meta = video_inspector.probe_video(input_path)
        video_enhancer_job_service.update(job_id, input_metadata=meta)

        # Target dimensions calculation & bounds checking
        target_w, target_h = compute_target_dimensions(
            orig_w=meta.width,
            orig_h=meta.height,
            scale=job.options.scale,
            target_preset=job.options.target_resolution,
        )

        target_meta = {
            "target_width": target_w,
            "target_height": target_h,
            "target_scale": job.options.scale,
            "codec": job.options.codec,
        }
        video_enhancer_job_service.update(job_id, target_metadata=target_meta)

        # Generate thumbnail preview if not present
        preview_file = root / "thumbnail.jpg"
        if not preview_file.exists():
            frame_decoder.generate_thumbnail(input_path, preview_file)
        video_enhancer_job_service.update(job_id, preview_path=str(preview_file))

        # Check for cancellation
        job = video_enhancer_job_service.get(job_id)
        if job.cancelled:
            return

        # 2. Extract Frames
        video_enhancer_job_service.update(
            job_id,
            status=VideoEnhancerJobStatus.EXTRACTING,
            stage="Decoding Frames",
            message="Extracting video frames for AI processing",
            progress=12.0,
        )

        extracted_frame_paths = frame_decoder.extract_frames(input_path, frames_in_dir)
        total_extracted = len(extracted_frame_paths)
        if total_extracted == 0:
            raise RuntimeError("Frame decoder extracted 0 frames from the input video")

        video_enhancer_job_service.update(
            job_id,
            total_frames=total_extracted,
            progress=20.0,
        )

        # Extract audio if available
        has_audio = False
        if job.options.preserve_audio and meta.audio_present:
            has_audio = audio_processor.extract_audio(input_path, audio_file)

        # 3. AI Enhancement & Super-Resolution
        video_enhancer_job_service.update(
            job_id,
            status=VideoEnhancerJobStatus.ENHANCING,
            stage="AI Processing",
            message=f"Enhancing 0/{total_extracted} frames",
            progress=22.0,
            current_frame=0,
        )

        super_resolution_engine.reset_temporal_state()
        enhanced_frame_paths: list[Path] = []

        for idx, f_path in enumerate(extracted_frame_paths):
            # Check for cancellation every frame
            current_job = video_enhancer_job_service.get(job_id)
            if current_job.cancelled:
                logger.info(f"Job {job_id} cancelled during frame {idx + 1}")
                return

            frame_bgr = cv2.imread(str(f_path))
            if frame_bgr is None:
                continue

            # Deblock, denoise, and sharpen
            processed_bgr = denoise_deblock_engine.process_frame(
                frame_bgr,
                denoise_level=job.options.denoise,
                deblock=job.options.deblock,
                sharpen_level=job.options.sharpen,
            )

            # Super-resolution upscaling
            upscaled_bgr = super_resolution_engine.upscale_frame(
                processed_bgr,
                target_w=target_w,
                target_h=target_h,
                scale=job.options.scale,
                mode=job.options.enhancement,
            )

            out_frame_file = frames_out_dir / f"enhanced_{idx:06d}.png"
            cv2.imwrite(str(out_frame_file), upscaled_bgr)
            enhanced_frame_paths.append(out_frame_file)

            current_frame_num = idx + 1
            # Progress calculation: 22.0% to 75.0%
            if current_frame_num % 5 == 0 or current_frame_num == total_extracted:
                progress_val = 22.0 + (53.0 * (current_frame_num / total_extracted))
                video_enhancer_job_service.update(
                    job_id,
                    status=VideoEnhancerJobStatus.ENHANCING,
                    stage="AI Processing",
                    message=f"Enhanced {current_frame_num}/{total_extracted} frames ({target_w}x{target_h})",
                    progress=progress_val,
                    current_frame=current_frame_num,
                    total_frames=total_extracted,
                )

        # 4. Optional Optical-Flow Frame Interpolation
        active_frame_dir = frames_out_dir
        active_frame_pattern = "enhanced_%06d.png"
        final_fps = meta.fps

        current_job = video_enhancer_job_service.get(job_id)
        if current_job.cancelled:
            return

        if job.options.interpolation and job.options.target_fps and job.options.target_fps > (meta.fps * 1.05):
            video_enhancer_job_service.update(
                job_id,
                status=VideoEnhancerJobStatus.INTERPOLATING,
                stage="Motion Synthesis",
                message=f"Synthesizing optical-flow motion vectors ({meta.fps:.0f} -> {job.options.target_fps:.0f} FPS)",
                progress=76.0,
            )

            interp_dir = root / "frames_interp"
            interp_dir.mkdir(parents=True, exist_ok=True)

            multiplier, timestamps = frame_interpolation_engine.compute_interpolation_plan(
                source_fps=meta.fps,
                target_fps=job.options.target_fps,
            )

            interp_idx = 0
            num_enhanced = len(enhanced_frame_paths)
            for i in range(num_enhanced):
                # Write current frame
                img_curr = cv2.imread(str(enhanced_frame_paths[i]))
                cv2.imwrite(str(interp_dir / f"interp_{interp_idx:06d}.png"), img_curr)
                interp_idx += 1

                # If there is a next frame, synthesize in-between frames
                if i < num_enhanced - 1 and timestamps:
                    img_next = cv2.imread(str(enhanced_frame_paths[i + 1]))
                    for t in timestamps:
                        synth = frame_interpolation_engine.synthesize_intermediate_frame(img_curr, img_next, t)
                        cv2.imwrite(str(interp_dir / f"interp_{interp_idx:06d}.png"), synth)
                        interp_idx += 1

                if (i + 1) % 10 == 0 or (i + 1) == num_enhanced:
                    interp_progress = 76.0 + (9.0 * ((i + 1) / num_enhanced))
                    video_enhancer_job_service.update(
                        job_id,
                        status=VideoEnhancerJobStatus.INTERPOLATING,
                        stage="Motion Synthesis",
                        message=f"Synthesized motion frames: {interp_idx} frames created",
                        progress=interp_progress,
                    )

            active_frame_dir = interp_dir
            active_frame_pattern = "interp_%06d.png"
            final_fps = float(job.options.target_fps)

        # Check cancellation
        current_job = video_enhancer_job_service.get(job_id)
        if current_job.cancelled:
            return

        # 5. Encoding
        video_enhancer_job_service.update(
            job_id,
            status=VideoEnhancerJobStatus.ENCODING,
            stage="Mastering & Encoding",
            message=f"Encoding video with {job.options.codec.upper()} at {final_fps:.1f} FPS",
            progress=86.0,
        )

        encoded_path = video_encoder.encode_frames(
            frame_dir=active_frame_dir,
            output_file=output_video_path,
            fps=final_fps,
            codec=job.options.codec,
            quality=job.options.quality,
            audio_path=audio_file if has_audio else None,
            frame_pattern=active_frame_pattern,
        )

        # 6. Quality Validation
        video_enhancer_job_service.update(
            job_id,
            status=VideoEnhancerJobStatus.VALIDATING_OUTPUT,
            stage="Quality Verification",
            message="Verifying stream integrity and metadata with FFprobe",
            progress=96.0,
        )

        out_meta = quality_validator.validate_output(
            output_file=encoded_path,
            expected_width=target_w,
            expected_height=target_h,
            expected_fps=final_fps,
            expected_duration=meta.duration,
            audio_expected=has_audio,
        )

        # 7. Completed!
        video_enhancer_job_service.update(
            job_id,
            status=VideoEnhancerJobStatus.COMPLETED,
            stage="Complete",
            message=f"Ready! Enhanced to {out_meta.width}x{out_meta.height} ({out_meta.file_size_bytes / (1024*1024):.2f} MB)",
            progress=100.0,
            result_path=str(encoded_path),
            output_metadata=out_meta,
        )

        # Cleanup large intermediate frames
        video_enhancer_job_service.cleanup_intermediate_frames(job_id)
        logger.info(f"Video enhancement job {job_id} successfully completed")

    except SuperResolutionError as sre:
        logger.warning(f"Super resolution validation failed for job {job_id}: {sre}")
        video_enhancer_job_service.update(
            job_id,
            status=VideoEnhancerJobStatus.FAILED,
            stage="Resolution Limit Exceeded",
            message=str(sre),
            error=str(sre),
            progress=0.0,
        )
        video_enhancer_job_service.cleanup_intermediate_frames(job_id)
    except Exception as exc:
        logger.exception(f"Video enhancement job {job_id} failed: {exc}")
        video_enhancer_job_service.update(
            job_id,
            status=VideoEnhancerJobStatus.FAILED,
            stage="Failed",
            message=f"Enhancement failed: {str(exc)}",
            error=str(exc),
            progress=0.0,
        )
        video_enhancer_job_service.cleanup_intermediate_frames(job_id)


def submit_video_enhancer_job(job_id: str) -> None:
    """Dispatches a job to the background thread pool."""
    _pool.submit(_run_video_enhancer_job, job_id)
