"""
Module 4B — VO Scale Registration (GPS / Altitude Scale Locking)
Locks monocular Visual Odometry relative trajectory scale to real-world metric units using GPS/Altitude telemetry.
"""

from typing import List, Dict, Any, Tuple, Optional
import math
import numpy as np

class VOScaleRegistrar:
    """Estimates metric scale factor S and scale confidence C_scale for VO trajectory."""

    @staticmethod
    def gps_to_local_meters(lat: float, lon: float, alt: float, ref_lat: float, ref_lon: float, ref_alt: float) -> np.ndarray:
        """Converts WGS84 GPS coordinate to local ENU meters relative to reference point."""
        dlat = math.radians(lat - ref_lat)
        dlon = math.radians(lon - ref_lon)
        lat_rad = math.radians(ref_lat)
        
        # Approximate WGS84 earth radii
        R_lat = 6378137.0
        R_lon = 6378137.0 * math.cos(lat_rad)
        
        e = dlon * R_lon
        n = dlat * R_lat
        u = alt - ref_alt
        return np.array([e, n, u], dtype=np.float64)

    def register_scale(
        self,
        trajectory: List[Dict[str, Any]],
        gps_records: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Fits unscaled VO displacements against real-world GPS displacements.
        Returns (scaled_trajectory, scale_registration_metadata).
        """
        if len(trajectory) < 2 or not gps_records or len(gps_records) < 2:
            print("[Scale Lock] Warning: Insufficient GPS data. Proceeding in UNSCALED relative frame.")
            scale_meta = {
                "scale_factor": 1.0,
                "scale_confidence": 0.0,
                "is_scaled": False,
                "mode": "UNSCALED",
                "message": "No GPS telemetry provided; reconstruction is unscaled."
            }
            scaled_traj = [dict(p, scale_confidence=0.0) for p in trajectory]
            return scaled_traj, scale_meta

        # Align GPS records with keyframe timestamps
        vo_displacements = []
        gps_displacements = []
        weights = []

        ref_gps = gps_records[0]
        ref_lat, ref_lon, ref_alt = float(ref_gps["latitude"]), float(ref_gps["longitude"]), float(ref_gps["altitude"])

        # Map keyframe timestamp to nearest GPS record
        gps_positions = []
        for pt in trajectory:
            t = pt["timestamp"]
            # Find closest GPS record
            closest = min(gps_records, key=lambda g: abs(float(g["timestamp"]) - t))
            pos_m = self.gps_to_local_meters(
                float(closest["latitude"]), float(closest["longitude"]), float(closest["altitude"]),
                ref_lat, ref_lon, ref_alt
            )
            gps_positions.append((pos_m, float(closest.get("accuracy", 1.0))))

        for i in range(1, len(trajectory)):
            p_prev = np.array([trajectory[i-1]["x"], trajectory[i-1]["y"], trajectory[i-1]["z"]])
            p_curr = np.array([trajectory[i]["x"], trajectory[i]["y"], trajectory[i]["z"]])
            d_vo = np.linalg.norm(p_curr - p_prev)

            g_prev, acc_prev = gps_positions[i-1]
            g_curr, acc_curr = gps_positions[i]
            d_gps = np.linalg.norm(g_curr - g_prev)

            if d_vo > 1e-4 and d_gps > 0.05:
                vo_displacements.append(d_vo)
                gps_displacements.append(d_gps)
                # Weight by inverse GPS inaccuracy
                w = 1.0 / max(0.1, (acc_prev + acc_curr) / 2.0)
                weights.append(w)

        if len(vo_displacements) < 2:
            print("[Scale Lock] Warning: Motion segment displacement too small for robust fit.")
            scale_meta = {
                "scale_factor": 1.0,
                "scale_confidence": 0.1,
                "is_scaled": False,
                "mode": "FALLBACK",
                "message": "Vehicle motion too static for GPS scale fit."
            }
            scaled_traj = [dict(p, scale_confidence=0.1) for p in trajectory]
            return scaled_traj, scale_meta

        vo_arr = np.array(vo_displacements)
        gps_arr = np.array(gps_displacements)
        w_arr = np.array(weights)

        # Weighted Least Squares Scale Factor: S = sum(w * d_vo * d_gps) / sum(w * d_vo^2)
        scale_factor = float(np.sum(w_arr * vo_arr * gps_arr) / np.sum(w_arr * (vo_arr ** 2)))
        
        # Calculate goodness of fit (R^2 / Residual error confidence)
        pred_gps = scale_factor * vo_arr
        residuals = np.abs(gps_arr - pred_gps)
        mean_err = float(np.mean(residuals))
        scale_confidence = float(np.clip(1.0 - (mean_err / max(1.0, np.mean(gps_arr))), 0.0, 1.0))

        # Scale all trajectory points
        scaled_traj = []
        for pt in trajectory:
            p_scaled = dict(pt)
            p_scaled["x"] *= scale_factor
            p_scaled["y"] *= scale_factor
            p_scaled["z"] *= scale_factor
            p_scaled["t"] = pt["t"] * scale_factor # translation vector scaled
            p_scaled["scale_confidence"] = scale_confidence
            scaled_traj.append(p_scaled)

        scale_meta = {
            "scale_factor": float(np.round(scale_factor, 4)),
            "scale_confidence": float(np.round(scale_confidence, 4)),
            "is_scaled": True,
            "mode": "GPS_LOCKED",
            "mean_residual_meters": float(np.round(mean_err, 3)),
            "num_segments_fitted": len(vo_displacements)
        }

        print(f"[Scale Lock] Scale factor S={scale_factor:.4f} locked against GPS (Confidence: {scale_confidence*100:.1f}%)")
        return scaled_traj, scale_meta
