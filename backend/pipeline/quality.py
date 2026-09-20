"""
Module 2 — Frame Quality Assessment
Evaluates blur, contrast, exposure, and feature richness for UAV frames to reject degraded or redundant images.
"""

from typing import Dict, Any
import numpy as np
import cv2

class FrameQualityAnalyzer:
    """Calculates frame quality score Q and diagnostic metrics for frame filtering."""
    
    def __init__(self, blur_threshold: float = 100.0, min_features: int = 200):
        self.blur_threshold = blur_threshold
        self.min_features = min_features
        self.orb = cv2.ORB_create(nfeatures=1000)

    def analyze_frame(self, frame: np.ndarray, frame_id: int = 0, timestamp: float = 0.0) -> Dict[str, Any]:
        """
        Analyzes a BGR image frame and computes quality metrics.
        Returns a dictionary containing blur, contrast, exposure, feature_count, and Q score.
        """
        if frame is None or frame.size == 0:
            return {
                "frame_id": frame_id,
                "timestamp": timestamp,
                "quality_score": 0.0,
                "blur_score": 0.0,
                "contrast": 0.0,
                "exposure": 0.0,
                "feature_count": 0,
                "accepted": False,
                "reason": "Empty frame"
            }
            
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 1. Blur Score (Variance of Laplacian)
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        
        # 2. Contrast Score (Standard Deviation of intensity)
        contrast = float(np.std(gray))
        
        # 3. Exposure Score (Deviation from ideal mean intensity ~128)
        mean_intensity = float(np.mean(gray))
        exposure_penalty = abs(mean_intensity - 128.0) / 128.0 # 0 (perfect) to 1 (over/underexposed)
        exposure_score = max(0.0, 1.0 - exposure_penalty)
        
        # 4. Feature Count
        keypoints = self.orb.detect(gray, None)
        feature_count = len(keypoints)
        
        # Normalize sub-scores for weighted combination Q
        norm_blur = min(1.0, laplacian_var / 500.0)
        norm_contrast = min(1.0, contrast / 80.0)
        norm_features = min(1.0, feature_count / 800.0)
        
        # Composite Quality Score Q (0.0 to 1.0)
        Q = 0.4 * norm_blur + 0.3 * norm_features + 0.2 * norm_contrast + 0.1 * exposure_score
        
        # Acceptance criteria
        accepted = True
        reason = "Pass"
        if laplacian_var < self.blur_threshold:
            accepted = False
            reason = f"Excessive blur (Laplacian {laplacian_var:.1f} < {self.blur_threshold})"
        elif feature_count < self.min_features:
            accepted = False
            reason = f"Feature poor ({feature_count} < {self.min_features})"
        elif mean_intensity < 20.0 or mean_intensity > 235.0:
            accepted = False
            reason = f"Extreme exposure (mean={mean_intensity:.1f})"

        return {
            "frame_id": frame_id,
            "timestamp": timestamp,
            "quality_score": float(np.round(Q, 4)),
            "blur_score": float(np.round(laplacian_var, 2)),
            "contrast": float(np.round(contrast, 2)),
            "exposure": float(np.round(exposure_score, 4)),
            "mean_intensity": float(np.round(mean_intensity, 2)),
            "feature_count": feature_count,
            "accepted": accepted,
            "reason": reason
        }
