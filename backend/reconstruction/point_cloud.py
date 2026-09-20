"""
Module 7 — 3D Point Generation
Unprojects 2D depth maps and RGB imagery into 3D camera-frame point clouds using camera intrinsics.
"""

from typing import Dict, Any, Optional, Tuple
import numpy as np
import open3d as o3d
from backend.reconstruction.calibration import CameraCalibration

class PointCloudGenerator:
    """Generates 3D point cloud data from depth maps and RGB images."""

    def __init__(self, calibration: CameraCalibration):
        self.calib = calibration

    def unproject_depth(
        self,
        image_bgr: np.ndarray,
        depth_map: np.ndarray,
        confidence_map: np.ndarray,
        frame_id: int = 0,
        timestamp: float = 0.0,
        stride: int = 4
    ) -> Dict[str, Any]:
        """
        Unprojects depth map (H, W) into 3D coordinates (N, 3) in camera coordinate system.
        Returns a dictionary with 'points', 'colors', 'confidences', 'timestamps', 'frame_ids'.
        """
        h, w = depth_map.shape[:2]
        
        # Grid of pixel coordinates
        u_coords = np.arange(0, w, stride)
        v_coords = np.arange(0, h, stride)
        u_grid, v_grid = np.meshgrid(u_coords, v_coords)

        u_flat = u_grid.ravel()
        v_flat = v_grid.ravel()
        z_flat = depth_map[v_flat, u_flat]
        conf_flat = confidence_map[v_flat, u_flat]

        # Valid depth mask (filtering out invalid/zero depths)
        valid_mask = (z_flat > 0.1) & (z_flat < 200.0)
        
        u_valid = u_flat[valid_mask]
        v_valid = v_flat[valid_mask]
        z_valid = z_flat[valid_mask]
        conf_valid = conf_flat[valid_mask]

        # Unproject to 3D camera coordinates
        x_cam = (u_valid - self.calib.cx) * z_valid / self.calib.fx
        y_cam = (v_valid - self.calib.cy) * z_valid / self.calib.fy
        points_cam = np.vstack([x_cam, y_cam, z_valid]).T

        # Extract RGB colors (convert BGR -> RGB normalized [0, 1])
        bgr_sampled = image_bgr[v_valid, u_valid]
        rgb_normalized = bgr_sampled[:, [2, 1, 0]].astype(np.float64) / 255.0

        return {
            "points": points_cam.astype(np.float64),
            "colors": rgb_normalized,
            "confidences": conf_valid.astype(np.float64),
            "timestamps": np.full(len(points_cam), timestamp, dtype=np.float64),
            "frame_ids": np.full(len(points_cam), frame_id, dtype=np.int32)
        }

    def to_open3d_point_cloud(self, point_data: Dict[str, Any]) -> o3d.geometry.PointCloud:
        """Converts point data dictionary to an Open3D PointCloud object."""
        pcd = o3d.geometry.PointCloud()
        if len(point_data["points"]) > 0:
            pcd.points = o3d.utility.Vector3dVector(point_data["points"])
            pcd.colors = o3d.utility.Vector3dVector(point_data["colors"])
        return pcd
