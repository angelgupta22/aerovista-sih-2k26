"""
Module 23 & 24 — Metric Measurement Engine & Semantic Inspection
Calculates distance, height, 2D area, elevation, slope, and watertight-gated 3D volume.
"""

from typing import Dict, Any, List, Tuple
import math
import numpy as np

class MetricMeasurementEngine:
    """Computes metric distance, height, area, slope, and gated volume measurements."""

    def measure_distance_3d(self, pt_a: List[float], pt_b: List[float], geometry_confidence: float = 0.9) -> Dict[str, Any]:
        """Calculates 3D Euclidean distance, horizontal distance, and height difference between two points."""
        a = np.array(pt_a, dtype=np.float64)
        b = np.array(pt_b, dtype=np.float64)

        dist_3d = float(np.linalg.norm(b - a))
        dist_2d = float(np.linalg.norm(b[:2] - a[:2]))
        height_diff = float(abs(b[2] - a[2]))
        
        slope_deg = float(math.degrees(math.atan2(height_diff, max(1e-4, dist_2d))))

        return {
            "type": "DISTANCE_3D",
            "point_a": pt_a,
            "point_b": pt_b,
            "distance_meters": float(np.round(dist_3d, 2)),
            "horizontal_distance_meters": float(np.round(dist_2d, 2)),
            "height_delta_meters": float(np.round(height_diff, 2)),
            "slope_degrees": float(np.round(slope_deg, 1)),
            "confidence": float(np.round(geometry_confidence, 2))
        }

    def measure_area_2d(self, polygon_pts: List[List[float]], geometry_confidence: float = 0.9) -> Dict[str, Any]:
        """Calculates 2D planar footprint area of a closed polygon using Shoelace formula."""
        if len(polygon_pts) < 3:
            return {"area_sq_meters": 0.0, "valid": False, "message": "At least 3 points required"}

        pts = np.array(polygon_pts, dtype=np.float64)[:, :2]
        x = pts[:, 0]
        y = pts[:, 1]
        
        area = 0.5 * np.abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))

        return {
            "type": "FOOTPRINT_AREA_2D",
            "num_vertices": len(polygon_pts),
            "area_sq_meters": float(np.round(area, 2)),
            "perimeter_meters": float(np.round(sum(np.linalg.norm(pts[i] - pts[i-1]) for i in range(len(pts))), 2)),
            "confidence": float(np.round(geometry_confidence, 2)),
            "valid": True
        }

    def measure_volume_3d(
        self,
        mesh_is_watertight: bool,
        mesh_volume_func=None,
        geometry_confidence: float = 0.9
    ) -> Dict[str, Any]:
        """
        Calculates 3D mesh volume if and ONLY IF the surface geometry is closed/watertight.
        Gates open 2.5D aerial surfaces per technical review requirement.
        """
        if not mesh_is_watertight:
            return {
                "type": "VOLUME_3D",
                "volume_cubic_meters": None,
                "volume_valid": False,
                "status": "INSUFFICIENT_COVERAGE",
                "message": "Insufficient coverage for volume (surface is open 2.5D aerial geometry). Watertight mesh required.",
                "confidence": float(np.round(geometry_confidence, 2))
            }

        try:
            vol = float(mesh_volume_func()) if mesh_volume_func else 0.0
            return {
                "type": "VOLUME_3D",
                "volume_cubic_meters": float(np.round(vol, 2)),
                "volume_valid": True,
                "status": "WATERTIGHT_CLOSED",
                "message": "Watertight volume calculated successfully.",
                "confidence": float(np.round(geometry_confidence, 2))
            }
        except Exception as e:
            return {
                "type": "VOLUME_3D",
                "volume_cubic_meters": None,
                "volume_valid": False,
                "status": "ERROR",
                "message": f"Mesh volume computation failed: {e}",
                "confidence": float(np.round(geometry_confidence, 2))
            }
