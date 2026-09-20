"""
Module 17 — Mesh Texturing & UV Projection
Projects keyframe RGB colors onto reconstructed mesh vertices/faces to generate textured 3D models.
"""

from typing import List, Dict, Any
import numpy as np
import open3d as o3d

class MeshTexturer:
    """Projects keyframe RGB color maps onto mesh vertices."""

    def apply_vertex_colors_from_point_cloud(
        self,
        mesh: o3d.geometry.TriangleMesh,
        pcd: o3d.geometry.PointCloud
    ) -> o3d.geometry.TriangleMesh:
        """Transfers nearest-neighbor RGB colors from dense point cloud to mesh vertices."""
        if len(mesh.vertices) == 0 or len(pcd.points) == 0:
            return mesh

        # Use KDTree for nearest neighbor color lookup
        pcd_tree = o3d.geometry.KDTreeFlann(pcd)
        mesh_vertices = np.asarray(mesh.vertices)
        pcd_colors = np.asarray(pcd.colors)

        vertex_colors = []
        for v in mesh_vertices:
            [_, idx, _] = pcd_tree.search_knn_vector_3d(v, 3)
            # Average color of nearest 3 points
            avg_color = np.mean(pcd_colors[idx], axis=0)
            vertex_colors.append(avg_color)

        mesh.vertex_colors = o3d.utility.Vector3dVector(np.array(vertex_colors))
        return mesh
