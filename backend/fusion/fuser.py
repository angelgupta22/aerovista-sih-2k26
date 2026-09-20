"""
Module 8 — Temporal Point-Cloud Fusion & Sliding-Window ICP Refinement
Transforms frame point clouds into world coordinates, performs sliding-window ICP drift correction,
voxel grid downsampling, and statistical outlier removal.
"""

from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import open3d as o3d

class PointCloudFuser:
    """Fuses temporal frame point clouds using scale-locked camera poses, sliding-window ICP, and voxel filtering."""

    def __init__(
        self,
        voxel_size: float = 0.1, # 10 cm voxel grid size
        window_size: int = 5,    # Sliding window size for local ICP refinement
        nb_neighbors: int = 20,  # Outlier removal neighbors
        std_ratio: float = 2.0   # Outlier removal std ratio
    ):
        self.voxel_size = voxel_size
        self.window_size = window_size
        self.nb_neighbors = nb_neighbors
        self.std_ratio = std_ratio

    def transform_to_world(self, points_cam: np.ndarray, R_world: np.ndarray, t_world: np.ndarray) -> np.ndarray:
        """
        Transforms camera-frame 3D points (N, 3) to world coordinates.
        Standard OpenCV camera frame: +Z forward, +X right, +Y down.
        World frame: +X East, +Y North, +Z Up.
        P_world = R_world * P_cam + t_world
        """
        if len(points_cam) == 0:
            return np.zeros((0, 3), dtype=np.float64)
            
        # Convert OpenCV camera convention to ENU world convention before rotation
        cam_to_enu = np.array([
            [1.0, 0.0, 0.0],
            [0.0, 0.0, 1.0], # +Z_cam -> +Y_enu
            [0.0, -1.0, 0.0] # -Y_cam -> +Z_enu
        ], dtype=np.float64)

        points_enu = points_cam @ cam_to_enu.T
        
        # Apply World Rotation and Translation
        t_vec = t_world.reshape(3)
        points_world = (points_enu @ R_world.T) + t_vec
        return points_world

    def fuse_sequence(
        self,
        keyframe_point_data: List[Dict[str, Any]],
        trajectory: List[Dict[str, Any]]
    ) -> Tuple[Dict[str, Any], o3d.geometry.PointCloud]:
        """
        Fuses a sequence of keyframe point clouds into a global unified point cloud.
        Applies sliding-window ICP refinement between adjacent frames and performs voxel downsampling.
        """
        if len(keyframe_point_data) == 0:
            empty_pcd = o3d.geometry.PointCloud()
            return {
                "points": np.zeros((0, 3)),
                "colors": np.zeros((0, 3)),
                "confidences": np.zeros(0),
                "num_points": 0
            }, empty_pcd

        all_world_points = []
        all_world_colors = []
        all_world_confs = []

        # Sliding window buffer of recent frame point clouds for ICP
        sliding_window_pcds: List[o3d.geometry.PointCloud] = []

        for i, (p_data, pose) in enumerate(zip(keyframe_point_data, trajectory)):
            pts_cam = p_data["points"]
            colors = p_data["colors"]
            confs = p_data["confidences"]

            if len(pts_cam) == 0:
                continue

            R_world = pose["R"]
            t_world = pose["t"]

            # 1. Pose Transformation to World Frame
            pts_world = self.transform_to_world(pts_cam, R_world, t_world)

            # Create frame Open3D cloud
            frame_pcd = o3d.geometry.PointCloud()
            frame_pcd.points = o3d.utility.Vector3dVector(pts_world)
            frame_pcd.colors = o3d.utility.Vector3dVector(colors)

            # 2. Sliding-Window ICP Refinement against previous local cloud
            if len(sliding_window_pcds) > 0:
                target_local_map = sliding_window_pcds[-1]
                
                # Estimate normals for Point-to-Plane ICP
                frame_pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=self.voxel_size * 2, max_nn=30))
                target_local_map.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=self.voxel_size * 2, max_nn=30))

                # Fine ICP alignment (max correspondence distance 0.5m)
                icp_res = o3d.pipelines.registration.registration_icp(
                    frame_pcd,
                    target_local_map,
                    max_correspondence_distance=self.voxel_size * 5,
                    init=np.eye(4),
                    estimation_method=o3d.pipelines.registration.TransformationEstimationPointToPlane()
                )

                # Apply ICP alignment transform if fitness is high
                if icp_res.fitness > 0.4:
                    frame_pcd.transform(icp_res.transformation)
                    pts_world = np.asarray(frame_pcd.points)

            # Update sliding window
            sliding_window_pcds.append(frame_pcd)
            if len(sliding_window_pcds) > self.window_size:
                sliding_window_pcds.pop(0)

            all_world_points.append(pts_world)
            all_world_colors.append(colors)
            all_world_confs.append(confs)

        if len(all_world_points) == 0:
            empty_pcd = o3d.geometry.PointCloud()
            return {"points": np.zeros((0, 3)), "colors": np.zeros((0, 3)), "confidences": np.zeros(0), "num_points": 0}, empty_pcd

        raw_points = np.vstack(all_world_points)
        raw_colors = np.vstack(all_world_colors)
        raw_confs = np.concatenate(all_world_confs)

        # 3. Global Open3D PointCloud Assembly
        global_pcd = o3d.geometry.PointCloud()
        global_pcd.points = o3d.utility.Vector3dVector(raw_points)
        global_pcd.colors = o3d.utility.Vector3dVector(raw_colors)

        # 4. Voxel Grid Downsampling
        down_pcd = global_pcd.voxel_down_sample(voxel_size=self.voxel_size)

        # 5. Statistical Outlier Removal
        cl, ind = down_pcd.remove_statistical_outlier(nb_neighbors=self.nb_neighbors, std_ratio=self.std_ratio)
        clean_pcd = cl

        final_points = np.asarray(clean_pcd.points)
        final_colors = np.asarray(clean_pcd.colors)
        
        # Heuristic confidence assignment for fused downsampled points
        final_confs = np.full(len(final_points), float(np.mean(raw_confs) if len(raw_confs) > 0 else 0.8), dtype=np.float64)

        print(f"[Point Cloud Fusion] Fused {len(raw_points)} raw points -> {len(final_points)} voxel-filtered, ICP-aligned points.")

        fused_dict = {
            "points": final_points,
            "colors": final_colors,
            "confidences": final_confs,
            "num_points": len(final_points)
        }

        return fused_dict, clean_pcd
