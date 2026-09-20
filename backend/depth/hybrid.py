"""
Module 5 (Phase 1.5) — Hybrid Depth Estimator & Scale-Shift Linear Alignment
Combines scale-aligned AI depth with metric geometric depth using per-pixel confidence blending.
Fit: D_AI_scaled ≈ a * D_AI + b over regions where geometric depth exists.
Blend: D_final(pixel) = alpha(pixel) * D_geom(pixel) + (1 - alpha(pixel)) * D_AI_scaled(pixel).
"""

from typing import Tuple, Optional, Dict, Any
import numpy as np
from scipy.stats import linregress

from backend.depth.monocular import MonocularDepthEstimator
from backend.depth.geometric import GeometricDepthEstimator
from backend.reconstruction.calibration import CameraCalibration

class HybridDepthEstimator:
    """Hybrid depth estimator blending metric geometric depth with scale-aligned AI depth."""

    def __init__(self, calibration: CameraCalibration, use_gpu: bool = True):
        self.calib = calibration
        self.mono_estimator = MonocularDepthEstimator(use_gpu=use_gpu)
        self.geom_estimator = GeometricDepthEstimator(calibration)

    def estimate_hybrid_depth(
        self,
        img_curr: np.ndarray,
        img_prev: Optional[np.ndarray] = None,
        scale_factor: float = 1.0,
        baseline_meters: float = 1.0
    ) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Estimates hybrid depth map and unified per-pixel confidence.
        Aligns AI depth scale & shift (a * D_AI + b) against geometric depth in valid regions,
        then blends per-pixel using geometric confidence alpha.
        """
        h, w = img_curr.shape[:2]

        # 1. AI Monocular Depth (scaled by VO scale factor S)
        ai_depth, ai_conf = self.mono_estimator.estimate_depth(img_curr, scale_factor=scale_factor)

        # If no previous frame for stereo geometric depth, fallback to AI depth
        if img_prev is None or baseline_meters <= 1e-3:
            meta = {"mode": "AI_ONLY", "aligned_a": 1.0, "aligned_b": 0.0}
            return ai_depth, ai_conf, meta

        # 2. Geometric Depth (StereoSGBM)
        geom_depth, geom_conf = self.geom_estimator.estimate_geometric_depth(
            img_curr, img_prev, baseline_meters=baseline_meters
        )

        # 3. Scale-and-Shift Alignment via Linear Regression (D_geom ≈ a * D_AI + b)
        # Select overlap regions where geometric confidence is high (conf > 0.5) and depth is valid
        valid_mask = (geom_conf > 0.5) & (geom_depth > 0.5) & (geom_depth < 150.0)

        a_scale = 1.0
        b_shift = 0.0

        if np.sum(valid_mask) > 50:
            x_ai = ai_depth[valid_mask]
            y_geom = geom_depth[valid_mask]
            slope, intercept, r_value, _, _ = linregress(x_ai, y_geom)
            
            # Robust check to prevent degenerate fits
            if not np.isnan(slope) and slope > 0.01 and slope < 100.0:
                a_scale = float(slope)
                b_shift = float(intercept)

        # Apply linear scale and shift to AI depth
        ai_depth_scaled = np.clip(a_scale * ai_depth + b_shift, 0.1, 200.0)

        # 4. Per-Pixel Confidence Blending: alpha(pixel) driven by geometric confidence
        alpha = np.clip(geom_conf, 0.0, 0.9) # max weight 0.9 for geometry

        final_depth = alpha * geom_depth + (1.0 - alpha) * ai_depth_scaled
        final_conf = np.clip(alpha * geom_conf + (1.0 - alpha) * ai_conf, 0.1, 0.99)

        meta = {
            "mode": "HYBRID_BLENDED",
            "aligned_a": float(np.round(a_scale, 4)),
            "aligned_b": float(np.round(b_shift, 4)),
            "geometric_valid_ratio": float(np.round(np.mean(valid_mask), 4))
        }

        return final_depth.astype(np.float32), final_conf.astype(np.float32), meta
