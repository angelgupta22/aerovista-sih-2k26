"""
Module 27 — Reconstruction Exporters
Exports point clouds, meshes, telemetry JSON, measurements, and geospatial GeoJSON.
"""

import os
import json
import csv
from typing import Dict, Any, List
import numpy as np
import open3d as o3d

class ModelExporter:
    """Exports 3D assets and geospatial data to standard formats (PLY, OBJ, GLB, GeoJSON, CSV, JSON)."""

    def export_point_cloud_ply(self, pcd: o3d.geometry.PointCloud, output_path: str):
        """Exports point cloud as PLY file."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        o3d.io.write_point_cloud(output_path, pcd, write_ascii=False)
        print(f"[Exporter] Saved Point Cloud PLY: {output_path}")

    def export_mesh_obj(self, mesh: o3d.geometry.TriangleMesh, output_path: str):
        """Exports textured surface mesh as OBJ file."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        o3d.io.write_triangle_mesh(output_path, mesh, write_ascii=True)
        print(f"[Exporter] Saved Mesh OBJ: {output_path}")

    def export_mesh_glb(self, mesh: o3d.geometry.TriangleMesh, output_path: str):
        """Exports 3D mesh as GLB / GLTF file."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        o3d.io.write_triangle_mesh(output_path, mesh)
        print(f"[Exporter] Saved Mesh GLB: {output_path}")

    def export_geojson_semantics(self, geo_points: List[Dict[str, float]], classes: List[int], output_path: str):
        """Exports 3D semantic objects as GeoJSON FeatureCollection."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        features = []
        for pt, cls_id in zip(geo_points, classes):
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [pt["longitude"], pt["latitude"], pt["altitude"]]
                },
                "properties": {
                    "class_id": int(cls_id),
                    "class_name": "BUILDING" if cls_id == 1 else ("ROAD" if cls_id == 2 else "VEGETATION")
                }
            })
        geojson_data = {
            "type": "FeatureCollection",
            "features": features
        }
        with open(output_path, "w") as f:
            json.dump(geojson_data, f, indent=2)
        print(f"[Exporter] Saved GeoJSON: {output_path}")

    def export_analytics_csv(self, metrics: List[Dict[str, Any]], output_path: str):
        """Exports metric measurements inventory to CSV."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        if not metrics:
            return
        keys = list(metrics[0].keys())
        with open(output_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(metrics)
        print(f"[Exporter] Saved Analytics CSV: {output_path}")
