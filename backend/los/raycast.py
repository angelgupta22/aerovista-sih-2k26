"""
Module 26 — Line-Of-Sight / Ray-Casting Visibility Analysis
Performs 3D ray-casting through reconstructed geometry to test line-of-sight visibility between Observer and Target points.
"""

from typing import List, Dict, Any, Tuple
import numpy as np

class LineOfSightAnalyzer:
    """Ray-casts through 3D scene point cloud to detect obstructions between Observer and Target."""

    def analyze_line_of_sight(
        self,
        observer_pt: List[float],
        target_pt: List[float],
        scene_points: np.ndarray,
        step_meters: float = 0.5,
        clearance_radius: float = 1.0
    ) -> Dict[str, Any]:
        """
        Ray-casts along line segment from Observer to Target and tests point cloud proximity.
        Returns visibility status (CLEAR/BLOCKED), obstruction point, and distance to obstacle.
        """
        obs = np.array(observer_pt, dtype=np.float64)
        tgt = np.array(target_pt, dtype=np.float64)

        ray_vec = tgt - obs
        total_dist = float(np.linalg.norm(ray_vec))

        if total_dist < 1e-3 or len(scene_points) == 0:
            return {
                "status": "CLEAR",
                "observer": observer_pt,
                "target": target_pt,
                "total_distance_meters": total_dist,
                "obstruction": None
            }

        unit_dir = ray_vec / total_dist
        
        # Sample test points along ray
        num_steps = max(5, int(total_dist / step_meters))
        t_values = np.linspace(0.5, total_dist - 0.5, num_steps)

        for t in t_values:
            ray_sample = obs + t * unit_dir
            # Find minimum distance to scene points
            dists = np.linalg.norm(scene_points - ray_sample, axis=1)
            min_dist = float(np.min(dists))

            if min_dist < clearance_radius:
                obs_idx = np.argmin(dists)
                obstruction_pt = scene_points[obs_idx].tolist()
                return {
                    "status": "BLOCKED",
                    "observer": observer_pt,
                    "target": target_pt,
                    "total_distance_meters": float(np.round(total_dist, 2)),
                    "obstruction": {
                        "point": obstruction_pt,
                        "distance_from_observer_meters": float(np.round(t, 2)),
                        "clearance_violation_meters": float(np.round(min_dist, 2)),
                        "object_name": f"Building/Terrain Obstacle (z={obstruction_pt[2]:.1f}m)"
                    }
                }

        return {
            "status": "CLEAR",
            "observer": observer_pt,
            "target": target_pt,
            "total_distance_meters": float(np.round(total_dist, 2)),
            "obstruction": None
        }
