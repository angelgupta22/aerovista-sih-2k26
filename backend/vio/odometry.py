"""
Module 4 — Visual Odometry / VIO Trajectory Estimation
Computes relative camera poses across keyframe sequences using feature tracking, Essential Matrix recovery, RANSAC, and PnP.
"""

from typing import List, Dict, Any, Tuple
import numpy as np
import cv2
from backend.reconstruction.calibration import CameraCalibration

class VisualOdometry:
    """Estimates unscaled camera trajectory (motion up to an arbitrary scale) from keyframe images."""

    def __init__(self, calibration: CameraCalibration):
        self.calib = calibration
        self.K = calibration.get_intrinsic_matrix()
        self.dist_coeffs = calibration.get_distortion_coeffs()
        self.detector = cv2.ORB_create(nfeatures=2000)
        self.matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    def estimate_trajectory(self, keyframe_images: List[np.ndarray], keyframe_meta: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Processes a sequence of keyframe images and returns estimated 6-DoF camera poses per keyframe.
        Each pose contains: frame_id, timestamp, x, y, z, roll, pitch, yaw, pose_matrix, confidence.
        """
        if len(keyframe_images) == 0:
            return []

        trajectory = []
        
        # Initial camera pose at World Origin (0,0,0) with Identity rotation
        curr_R = np.eye(3, dtype=np.float64)
        curr_t = np.zeros((3, 1), dtype=np.float64)

        # Record Frame 0
        r_deg, p_deg, y_deg = self._rotation_matrix_to_euler(curr_R)
        trajectory.append({
            "keyframe_index": 0,
            "frame_id": keyframe_meta[0]["frame_id"],
            "timestamp": keyframe_meta[0]["timestamp"],
            "x": float(curr_t[0, 0]),
            "y": float(curr_t[1, 0]),
            "z": float(curr_t[2, 0]),
            "roll": float(r_deg),
            "pitch": float(p_deg),
            "yaw": float(y_deg),
            "R": curr_R.copy(),
            "t": curr_t.copy(),
            "confidence": 1.0,
            "tracked_features": 0
        })

        if len(keyframe_images) == 1:
            return trajectory

        # Extract features for first frame
        prev_gray = cv2.cvtColor(keyframe_images[0], cv2.COLOR_BGR2GRAY)
        prev_kp, prev_des = self.detector.detectAndCompute(prev_gray, None)

        for i in range(1, len(keyframe_images)):
            curr_gray = cv2.cvtColor(keyframe_images[i], cv2.COLOR_BGR2GRAY)
            curr_kp, curr_des = self.detector.detectAndCompute(curr_gray, None)

            if prev_des is None or curr_des is None or len(prev_kp) < 10 or len(curr_kp) < 10:
                # Missing tracking -> keep previous pose with reduced confidence
                r_deg, p_deg, y_deg = self._rotation_matrix_to_euler(curr_R)
                trajectory.append({
                    "keyframe_index": i,
                    "frame_id": keyframe_meta[i]["frame_id"],
                    "timestamp": keyframe_meta[i]["timestamp"],
                    "x": float(curr_t[0, 0]),
                    "y": float(curr_t[1, 0]),
                    "z": float(curr_t[2, 0]),
                    "roll": float(r_deg),
                    "pitch": float(p_deg),
                    "yaw": float(y_deg),
                    "R": curr_R.copy(),
                    "t": curr_t.copy(),
                    "confidence": 0.2,
                    "tracked_features": 0
                })
                prev_gray, prev_kp, prev_des = curr_gray, curr_kp, curr_des
                continue

            # Match features
            matches = self.matcher.match(prev_des, curr_des)
            matches = sorted(matches, key=lambda x: x.distance)

            # Filter top matches
            good_matches = matches[:min(300, len(matches))]
            
            if len(good_matches) < 8:
                r_deg, p_deg, y_deg = self._rotation_matrix_to_euler(curr_R)
                trajectory.append({
                    "keyframe_index": i,
                    "frame_id": keyframe_meta[i]["frame_id"],
                    "timestamp": keyframe_meta[i]["timestamp"],
                    "x": float(curr_t[0, 0]),
                    "y": float(curr_t[1, 0]),
                    "z": float(curr_t[2, 0]),
                    "roll": float(r_deg),
                    "pitch": float(p_deg),
                    "yaw": float(y_deg),
                    "R": curr_R.copy(),
                    "t": curr_t.copy(),
                    "confidence": 0.3,
                    "tracked_features": len(good_matches)
                })
                prev_gray, prev_kp, prev_des = curr_gray, curr_kp, curr_des
                continue

            pts1 = np.float32([prev_kp[m.queryIdx].pt for m in good_matches])
            pts2 = np.float32([curr_kp[m.trainIdx].pt for m in good_matches])

            # Compute Essential Matrix with RANSAC
            E, mask = cv2.findEssentialMat(pts1, pts2, self.K, method=cv2.RANSAC, prob=0.999, threshold=1.0)

            if E is None or E.shape != (3, 3):
                rel_R = np.eye(3)
                rel_t = np.array([[0.0], [1.0], [0.0]]) # Default relative motion
                inlier_count = 0
            else:
                inlier_count, rel_R, rel_t, _ = cv2.recoverPose(E, pts1, pts2, self.K, mask=mask)

            # Update world pose (Unscaled unit translation)
            # World_t = World_t + World_R * rel_t
            curr_t = curr_t + (curr_R @ rel_t)
            curr_R = curr_R @ rel_R

            tracking_conf = min(1.0, inlier_count / max(1.0, float(len(good_matches))))
            r_deg, p_deg, y_deg = self._rotation_matrix_to_euler(curr_R)

            trajectory.append({
                "keyframe_index": i,
                "frame_id": keyframe_meta[i]["frame_id"],
                "timestamp": keyframe_meta[i]["timestamp"],
                "x": float(curr_t[0, 0]),
                "y": float(curr_t[1, 0]),
                "z": float(curr_t[2, 0]),
                "roll": float(r_deg),
                "pitch": float(p_deg),
                "yaw": float(y_deg),
                "R": curr_R.copy(),
                "t": curr_t.copy(),
                "confidence": float(np.round(tracking_conf, 4)),
                "tracked_features": inlier_count
            })

            prev_gray, prev_kp, prev_des = curr_gray, curr_kp, curr_des

        print(f"[Visual Odometry] Estimated trajectory for {len(trajectory)} keyframes.")
        return trajectory

    def _rotation_matrix_to_euler(self, R: np.ndarray) -> Tuple[float, float, float]:
        """Converts 3x3 rotation matrix to Euler angles (roll, pitch, yaw) in degrees."""
        sy = np.sqrt(R[0, 0] * R[0, 0] + R[1, 0] * R[1, 0])
        singular = sy < 1e-6
        if not singular:
            x = np.arctan2(R[2, 1], R[2, 2])
            y = np.arctan2(-R[2, 0], sy)
            z = np.arctan2(R[1, 0], R[0, 0])
        else:
            x = np.arctan2(-R[1, 2], R[1, 1])
            y = np.arctan2(-R[2, 0], sy)
            z = 0.0
        return np.degrees(x), np.degrees(y), np.degrees(z)
