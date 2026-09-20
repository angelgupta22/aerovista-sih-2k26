"""
Module 5 (Phase 1.5) — Geometric Depth Estimator
Computes dense geometric metric stereo depth using OpenCV StereoSGBM / triangulation between keyframe pairs.
"""

from typing import Tuple, Optional
import numpy as np
import cv2
from backend.reconstruction.calibration import CameraCalibration

class GeometricDepthEstimator:
    """Computes metric geometric depth using stereo block matching / optical flow triangulation."""

    def __init__(self, calibration: CameraCalibration):
        self.calib = calibration
        # StereoSGBM parameter configuration
        self.min_disparity = 0
        self.num_disparities = 64 # Must be divisible by 16
        self.block_size = 7
        
        self.sgbm = cv2.StereoSGBM_create(
            minDisparity=self.min_disparity,
            numDisparities=self.num_disparities,
            blockSize=self.block_size,
            P1=8 * 3 * self.block_size**2,
            P2=32 * 3 * self.block_size**2,
            disp12MaxDiff=1,
            uniquenessRatio=10,
            speckleWindowSize=100,
            speckleRange=32,
            mode=cv2.STEREO_SGBM_MODE_SGBM_3WAY
        )

    def estimate_geometric_depth(
        self,
        img_curr: np.ndarray,
        img_prev: Optional[np.ndarray],
        baseline_meters: float = 1.0
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Computes geometric depth map and per-pixel geometric confidence.
        Depth is metric by construction: Z = (fx * baseline) / disparity.
        """
        h, w = img_curr.shape[:2]
        
        if img_prev is None or baseline_meters <= 1e-4:
            # Single frame fallback: return neutral low-confidence depth
            depth = np.full((h, w), 20.0, dtype=np.float32)
            conf = np.zeros((h, w), dtype=np.float32)
            return depth, conf

        gray_curr = cv2.cvtColor(img_curr, cv2.COLOR_BGR2GRAY)
        gray_prev = cv2.cvtColor(img_prev, cv2.COLOR_BGR2GRAY)

        # Compute Disparity Map using StereoSGBM
        disp = self.sgbm.compute(gray_curr, gray_prev).astype(np.float32) / 16.0

        # Mask invalid disparities
        valid_mask = disp > 0.5
        
        # Metric Depth: Z = (fx * baseline) / disparity
        depth = np.zeros((h, w), dtype=np.float32)
        depth[valid_mask] = (self.calib.fx * max(0.1, baseline_meters)) / disp[valid_mask]
        depth[~valid_mask] = 20.0 # fallback background depth

        # Geometric confidence derived from disparity validity & local texture
        grad_x = cv2.Sobel(gray_curr, cv2.CV_32F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray_curr, cv2.CV_32F, 0, 1, ksize=3)
        texture_score = np.clip(np.sqrt(grad_x**2 + grad_y**2) / 100.0, 0.0, 1.0)
        
        conf = np.zeros((h, w), dtype=np.float32)
        conf[valid_mask] = np.clip(0.5 + 0.5 * texture_score[valid_mask], 0.4, 0.98)

        return depth, conf
