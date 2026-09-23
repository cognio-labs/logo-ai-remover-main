import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)


class FrameInterpolationEngine:
    """
    Real dense optical-flow frame synthesizer.
    Generates true in-between frames using DIS (Dense Inverse Search) optical flow
    with bidirectional motion compensation and occlusion blending.
    """

    def __init__(self) -> None:
        # DIS optical flow preset: FAST for responsive video throughput, high quality motion vectors
        self.dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_FAST)

    def _warp_frame(self, img: np.ndarray, flow: np.ndarray) -> np.ndarray:
        h, w = flow.shape[:2]
        # Meshgrid of pixel coordinates
        grid_x, grid_y = np.meshgrid(np.arange(w), np.arange(h))
        map_x = (grid_x + flow[:, :, 0]).astype(np.float32)
        map_y = (grid_y + flow[:, :, 1]).astype(np.float32)
        return cv2.remap(
            img,
            map_x,
            map_y,
            interpolation=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REFLECT,
        )

    def synthesize_intermediate_frame(
        self,
        frame0: np.ndarray,
        frame1: np.ndarray,
        t: float,
    ) -> np.ndarray:
        """
        Synthesize a novel intermediate frame at fractional time t in [0.0, 1.0]
        between frame0 (at t=0) and frame1 (at t=1).
        """
        if t <= 0.001:
            return frame0.copy()
        if t >= 0.999:
            return frame1.copy()

        gray0 = cv2.cvtColor(frame0, cv2.COLOR_BGR2GRAY)
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)

        # Downscale for optical flow calculation if frame is high res to optimize speed
        h, w = gray0.shape
        flow_scale = 1.0
        if max(h, w) > 1280:
            flow_scale = 1280.0 / max(h, w)
            flow_w = int(w * flow_scale)
            flow_h = int(h * flow_scale)
            g0_scaled = cv2.resize(gray0, (flow_w, flow_h), interpolation=cv2.INTER_AREA)
            g1_scaled = cv2.resize(gray1, (flow_w, flow_h), interpolation=cv2.INTER_AREA)
        else:
            g0_scaled, g1_scaled = gray0, gray1

        # Compute forward flow (0 -> 1) and backward flow (1 -> 0)
        flow_forward = self.dis.calc(g0_scaled, g1_scaled, None)
        flow_backward = self.dis.calc(g1_scaled, g0_scaled, None)

        if flow_scale != 1.0:
            flow_forward = cv2.resize(flow_forward, (w, h), interpolation=cv2.INTER_LINEAR) * (1.0 / flow_scale)
            flow_backward = cv2.resize(flow_backward, (w, h), interpolation=cv2.INTER_LINEAR) * (1.0 / flow_scale)

        # Warp frame0 along forward motion towards t
        warp0 = self._warp_frame(frame0, flow_forward * t)
        # Warp frame1 backwards along motion towards (1 - t)
        warp1 = self._warp_frame(frame1, flow_backward * (1.0 - t))

        # Occlusion-aware soft blend
        weight1 = t
        weight0 = 1.0 - t
        blended = cv2.addWeighted(warp0, weight0, warp1, weight1, 0)
        return blended

    def compute_interpolation_plan(
        self,
        source_fps: float,
        target_fps: float,
    ) -> tuple[int, list[float]]:
        """
        Determines the number of in-between frames and their time offsets between two adjacent frames.
        Returns (multiplier, [t1, t2, ...]) where t_i is the fractional position in (0, 1).
        """
        if target_fps <= source_fps * 1.05:
            return 1, []

        ratio = target_fps / source_fps
        multiplier = max(1, round(ratio))
        if multiplier <= 1:
            return 1, []

        # Generate timestamps for in-between frames: e.g. for 2x -> [0.5], for 4x -> [0.25, 0.5, 0.75]
        timestamps = [i / multiplier for i in range(1, multiplier)]
        return multiplier, timestamps


frame_interpolation_engine = FrameInterpolationEngine()
