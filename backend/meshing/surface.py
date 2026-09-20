"""
Module 16 — Surface Mesh Generation
Converts fused point clouds into clean 3D triangle meshes using Poisson Surface Reconstruction or Ball Pivoting.
"""

from typing import Tuple, Dict, Any
import numpy as np
import open3d as o3d

class SurfaceMeshBuilder:
    """Builds 3D surface meshes from point clouds using Open3D algorithms."""

    def __init__(self, depth: int = 8, density_threshold: float = 0.05):
        self.depth = depth # Octree depth for Poisson reconstruction
        self.density_threshold = density_threshold

    def build_mesh(
        self,
        pcd: o3d.geometry.PointCloud,
        method: str = "poisson"
    ) -> Tuple[o3d.geometry.TriangleMesh, Dict[str, Any]]:
        """
        Generates 3D surface mesh from input Open3D PointCloud.
        Computes surface normals, reconstructs surface, prunes low-density faces, and checks watertightness.
        """
        if len(pcd.points) < 10:
            mesh = o3d.geometry.TriangleMesh()
            return mesh, {"num_vertices": 0, "num_triangles": 0, "is_watertight": False}

        # 1. Estimate Surface Normals
        pcd.estimate_normals(
            search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.3, max_nn=30)
        )
        pcd.orient_normals_consistent_tangent_plane(10)

        # 2. Reconstruct Mesh
        if method.lower() == "poisson":
            mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
                pcd, depth=self.depth
            )
            # Density-based vertex pruning (remove unobserved boundary artifacts)
            vertices_to_remove = densities < np.quantile(densities, self.density_threshold)
            mesh.remove_vertices_by_mask(vertices_to_remove)
        else:
            # Ball Pivoting Algorithm (BPA) fallback
            radii = [0.1, 0.2, 0.4]
            mesh = o3d.geometry.TriangleMesh.create_from_point_cloud_ball_pivoting(
                pcd, o3d.utility.DoubleVector(radii)
            )

        # 3. Post-Processing & Mesh Cleaning
        mesh.compute_vertex_normals()
        mesh.remove_degenerate_triangles()
        mesh.remove_duplicated_vertices()
        mesh.remove_duplicated_triangles()

        is_watertight = mesh.is_watertight()
        num_vertices = len(mesh.vertices)
        num_triangles = len(mesh.triangles)

        meta = {
            "method": method,
            "num_vertices": num_vertices,
            "num_triangles": num_triangles,
            "is_watertight": is_watertight,
            "has_vertex_normals": mesh.has_vertex_normals()
        }

        print(f"[Mesh Builder] Reconstructed mesh: {num_vertices} vertices, {num_triangles} triangles (Watertight: {is_watertight}).")
        return mesh, meta
