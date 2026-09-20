"""
Module 15 — Unified Confidence Model & Classification
Calculates composite spatial confidence scores C = f(depth, pose, GPS, reprojection, density, semantic confidence)
and classifies 3D geometry into HIGH, MEDIUM, LOW, INFERRED, UNKNOWN categories.
"""

from typing import Dict, Any, List, Tuple
import numpy as np

class UnifiedConfidenceModel:
    """Computes spatial confidence maps and categorizes 3D reconstruction quality."""

    def evaluate_point_confidence(
        self,
        depth_conf: float,
        pose_conf: float,
        scale_conf: float,
        reprojection_err: float = 0.5,
        is_inferred: bool = False
    ) -> Tuple[float, str]:
        """
        Computes composite confidence score C in [0.0, 1.0] and returns category tag.
        Categories: HIGH, MEDIUM, LOW, INFERRED, UNKNOWN.
        """
        if is_inferred:
            # Generative / AI-inferred geometry is explicitly capped at LOW/INFERRED confidence
            c_score = float(np.clip(0.4 * depth_conf + 0.3 * scale_conf, 0.1, 0.45))
            return c_score, "INFERRED"

        reproj_factor = max(0.0, 1.0 - (reprojection_err / 3.0)) # <1px error = high
        
        # Composite Confidence Formula
        C = 0.35 * depth_conf + 0.30 * pose_conf + 0.20 * scale_conf + 0.15 * reproj_factor
        C = float(np.clip(C, 0.0, 1.0))

        if C >= 0.80:
            category = "HIGH"
        elif C >= 0.55:
            category = "MEDIUM"
        elif C >= 0.30:
            category = "LOW"
        else:
            category = "UNKNOWN"

        return float(np.round(C, 4)), category

    def evaluate_scene_confidence_stats(self, confidences: np.ndarray, is_scaled: bool) -> Dict[str, Any]:
        """Computes scene-wide confidence statistics for dashboard telemetry."""
        if len(confidences) == 0:
            return {
                "mean_confidence": 0.0,
                "high_confidence_pct": 0.0,
                "medium_confidence_pct": 0.0,
                "low_confidence_pct": 0.0,
                "inferred_pct": 0.0,
                "reconstruction_confidence": 0.0
            }

        high_mask = confidences >= 0.80
        med_mask = (confidences >= 0.55) & (confidences < 0.80)
        low_mask = confidences < 0.55

        mean_c = float(np.mean(confidences))
        high_pct = float(np.mean(high_mask) * 100.0)
        med_pct = float(np.mean(med_mask) * 100.0)
        low_pct = float(np.mean(low_mask) * 100.0)

        return {
            "mean_confidence": float(np.round(mean_c, 4)),
            "high_confidence_pct": float(np.round(high_pct, 1)),
            "medium_confidence_pct": float(np.round(med_pct, 1)),
            "low_confidence_pct": float(np.round(low_pct, 1)),
            "reconstruction_confidence": float(np.round(mean_c * 100.0, 1))
        }
