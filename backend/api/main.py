"""
AEROVISTA FastAPI Core Backend Application
Exposes REST endpoints for mission creation, processing, telemetry, 3D point cloud/mesh retrieval, scale registration, measurement tools, disaster layer, and export.
"""

import os
import uuid
import asyncio
from typing import Dict, Any, List, Optional
import numpy as np
import open3d as o3d
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from backend.api.schemas import (
    MissionUploadResponse, ProcessMissionRequest, MissionStatusResponse,
    ScaleRegistrationResponse, MeasureRequest, LineOfSightRequest
)
from backend.pipeline.ingestion import VideoIngestor
from backend.reconstruction.calibration import CameraCalibration
from backend.vio.odometry import VisualOdometry
from backend.scale_registration.scale_lock import VOScaleRegistrar
from backend.depth.monocular import MonocularDepthEstimator
from backend.depth.hybrid import HybridDepthEstimator
from backend.reconstruction.point_cloud import PointCloudGenerator
from backend.fusion.fuser import PointCloudFuser
from backend.georeferencing.georef import GeospatialAligner
from backend.segmentation.segmentor import AerialSemanticSegmentor
from backend.meshing.surface import SurfaceMeshBuilder
from backend.meshing.texturing import MeshTexturer
from backend.confidence.unified_confidence import UnifiedConfidenceModel
from backend.confidence.occlusion import OcclusionAnalyzer
from backend.measurement.metrics import MetricMeasurementEngine
from backend.los.raycast import LineOfSightAnalyzer
from backend.disaster.disaster_layer import DisasterResponseEngine
from backend.gis.osm_validator import OSMValidator
from backend.export.exporter import ModelExporter
from scripts.generate_demo_data import generate_uav_mission_data

app = FastAPI(
    title="AEROVISTA API",
    description="AI-Enabled Single-Pass UAV 3D Reconstruction & Geospatial Digital Twin Backend API",
    version="1.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-Memory Mission Storage Cache
MISSIONS_DB: Dict[str, Dict[str, Any]] = {}

def get_mission_or_404(mission_id: str) -> Dict[str, Any]:
    if mission_id not in MISSIONS_DB:
        raise HTTPException(status_code=404, detail=f"Mission '{mission_id}' not found.")
    return MISSIONS_DB[mission_id]

@app.get("/")
def read_root():
    return {
        "system": "AEROVISTA 3D Digital Twin Engine",
        "status": "ONLINE",
        "gpu_available": False,
        "mode": "CPU/GPU Hardware Adaptive"
    }

@app.post("/api/calibration/parse-yaml")
async def parse_camera_yaml(file: UploadFile = File(...)):
    """Parses uploaded camera calibration YAML/YML file and returns summary & validation results."""
    if not file.filename.lower().endswith(('.yaml', '.yml')):
        raise HTTPException(status_code=400, detail="Uploaded file must be a .yaml or .yml file.")

    content = (await file.read()).decode("utf-8")
    try:
        cal = CameraCalibration.from_yaml_string(content)
        return {
            "valid": True,
            "summary": cal.to_summary_dict()
        }
    except ValueError as val_err:
        return JSONResponse(
            status_code=422,
            content={
                "valid": False,
                "error": str(val_err)
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={
                "valid": False,
                "error": f"Failed to parse camera calibration YAML: {str(e)}"
            }
        )

@app.post("/api/mission/demo", response_model=Dict[str, Any])
def create_demo_mission():
    """Generates synthetic demo dataset and creates a ready-to-process mission out of the box."""
    mission_id = "demo_mission_" + str(uuid.uuid4())[:8]
    data_dir = os.path.join("data", "input", mission_id)
    
    generate_uav_mission_data(output_dir=data_dir, duration_sec=6.0, fps=30)
    
    MISSIONS_DB[mission_id] = {
        "mission_id": mission_id,
        "status": "PENDING",
        "current_step": "Uploading",
        "progress_percentage": 0.0,
        "video_path": os.path.join(data_dir, "sample_mission.mp4"),
        "gps_path": os.path.join(data_dir, "gps.csv"),
        "camera_path": os.path.join(data_dir, "camera.json"),
        "scale_meta": None,
        "trajectory": [],
        "fused_points": None,
        "clean_pcd": None,
        "mesh": None,
        "mesh_meta": None,
        "confidence_stats": None,
        "disaster_meta": None
    }
    return {
        "mission_id": mission_id,
        "status": "PENDING",
        "message": "Demo UAV flight mission dataset created successfully."
    }

@app.post("/api/mission/{mission_id}/process")
def process_mission(mission_id: str, req: ProcessMissionRequest, background_tasks: BackgroundTasks):
    """Triggers asynchronous 3D reconstruction pipeline execution."""
    m = get_mission_or_404(mission_id)
    if m["status"] == "PROCESSING":
        return {"message": "Mission is already processing."}

    m["status"] = "PROCESSING"
    m["progress_percentage"] = 5.0
    background_tasks.add_task(run_reconstruction_pipeline, mission_id, req)
    return {"mission_id": mission_id, "status": "PROCESSING", "message": "Reconstruction pipeline launched."}

def run_reconstruction_pipeline(mission_id: str, req: ProcessMissionRequest):
    """Executes full multi-stage AEROVISTA reconstruction pipeline."""
    m = MISSIONS_DB[mission_id]
    try:
        # Step 1: Preprocessing & Ingestion
        m["current_step"] = "Ingestion & Quality Assessment"
        m["progress_percentage"] = 10.0
        ingestor = VideoIngestor()
        kf_meta, kf_images = ingestor.extract_keyframes(m["video_path"], target_fps=req.target_fps)

        # Step 2: Camera Calibration
        m["current_step"] = "Camera Calibration"
        m["progress_percentage"] = 20.0
        meta = ingestor.get_video_metadata(m["video_path"])
        calib = CameraCalibration.from_file_or_estimate(m["camera_path"], meta["width"], meta["height"])

        # Step 3: Visual Odometry (VIO)
        m["current_step"] = "Visual Odometry (VIO)"
        m["progress_percentage"] = 35.0
        vo = VisualOdometry(calib)
        raw_traj = vo.estimate_trajectory(kf_images, kf_meta)

        # Step 4: Module 4B VO Scale Registration
        m["current_step"] = "VO Scale Registration"
        m["progress_percentage"] = 45.0
        gps_records = []
        if m["gps_path"] and os.path.exists(m["gps_path"]):
            import csv
            with open(m["gps_path"], "r") as f:
                gps_records = list(csv.DictReader(f))

        scale_registrar = VOScaleRegistrar()
        scaled_traj, scale_meta = scale_registrar.register_scale(raw_traj, gps_records)
        m["trajectory"] = scaled_traj
        m["scale_meta"] = scale_meta

        # Step 5: Depth Estimation (Hybrid or Monocular)
        m["current_step"] = "Depth Estimation"
        m["progress_percentage"] = 60.0
        hybrid_estimator = HybridDepthEstimator(calib, use_gpu=False)
        pt_gen = PointCloudGenerator(calib)
        
        kf_point_data = []
        seg = AerialSemanticSegmentor()

        for i in range(len(kf_images)):
            img_curr = kf_images[i]
            img_prev = kf_images[i-1] if i > 0 else None
            
            depth_map, conf_map, _ = hybrid_estimator.estimate_hybrid_depth(
                img_curr, img_prev, scale_factor=scale_meta["scale_factor"]
            )
            p_data = pt_gen.unproject_depth(img_curr, depth_map, conf_map, frame_id=kf_meta[i]["frame_id"], timestamp=kf_meta[i]["timestamp"])
            
            # Dynamic object removal
            sem_mask, _, _ = seg.segment_frame(img_curr)
            clean_p_data = seg.filter_dynamic_points(p_data, sem_mask)
            kf_point_data.append(clean_p_data)

        # Step 6: 3D Point Cloud Fusion & Sliding-Window ICP
        m["current_step"] = "3D Point Cloud Fusion"
        m["progress_percentage"] = 75.0
        fuser = PointCloudFuser(voxel_size=req.voxel_size, window_size=4)
        fused_dict, clean_pcd = fuser.fuse_sequence(kf_point_data, scaled_traj)
        m["fused_points"] = fused_dict
        m["clean_pcd"] = clean_pcd

        # Step 7: Surface Mesh Generation & Texturing
        m["current_step"] = "Meshing & Texturing"
        m["progress_percentage"] = 85.0
        mesh_builder = SurfaceMeshBuilder(depth=7)
        mesh, mesh_meta = mesh_builder.build_mesh(clean_pcd, method="poisson")
        texturer = MeshTexturer()
        textured_mesh = texturer.apply_vertex_colors_from_point_cloud(mesh, clean_pcd)
        m["mesh"] = textured_mesh
        m["mesh_meta"] = mesh_meta

        # Step 8: Unified Confidence & Disaster Intelligence
        m["current_step"] = "Confidence & Disaster Analysis"
        m["progress_percentage"] = 95.0
        conf_model = UnifiedConfidenceModel()
        c_stats = conf_model.evaluate_scene_confidence_stats(fused_dict["confidences"], scale_meta["is_scaled"])
        m["confidence_stats"] = c_stats

        disaster_engine = DisasterResponseEngine()
        d_meta = disaster_engine.analyze_disaster_scene(
            fused_dict["points"], np.ones(len(fused_dict["points"])), fused_dict["confidences"]
        )
        m["disaster_meta"] = d_meta

        m["status"] = "COMPLETED"
        m["current_step"] = "Complete"
        m["progress_percentage"] = 100.0
        print(f"[Mission {mission_id}] Reconstruction pipeline completed successfully!")

    except Exception as e:
        import traceback
        traceback.print_exc()
        m["status"] = "FAILED"
        m["error_message"] = str(e)

@app.get("/api/mission/{mission_id}/status", response_model=MissionStatusResponse)
def get_mission_status(mission_id: str):
    m = get_mission_or_404(mission_id)
    return {
        "mission_id": mission_id,
        "status": m["status"],
        "current_step": m["current_step"],
        "progress_percentage": m["progress_percentage"],
        "error_message": m.get("error_message")
    }

@app.get("/api/mission/{mission_id}/scale-registration", response_model=ScaleRegistrationResponse)
def get_scale_registration(mission_id: str):
    """FIX Endpoint: Returns VO Scale factor & Scale Confidence directly."""
    m = get_mission_or_404(mission_id)
    meta = m.get("scale_meta")
    if not meta:
        raise HTTPException(status_code=400, detail="Scale registration has not executed yet.")
    return meta

@app.get("/api/mission/{mission_id}/trajectory")
def get_trajectory(mission_id: str):
    m = get_mission_or_404(mission_id)
    return {"trajectory": m.get("trajectory", [])}

@app.get("/api/mission/{mission_id}/pointcloud")
def get_pointcloud(mission_id: str):
    m = get_mission_or_404(mission_id)
    fused = m.get("fused_points")
    if not fused or fused["num_points"] == 0:
        return {"points": [], "colors": [], "confidences": []}
    
    # Return JSON serialized 3D points
    pts = fused["points"].tolist()
    cols = fused["colors"].tolist()
    confs = fused["confidences"].tolist()
    return {
        "num_points": len(pts),
        "points": pts,
        "colors": cols,
        "confidences": confs
    }

@app.get("/api/mission/{mission_id}/mesh")
def get_mesh_info(mission_id: str):
    m = get_mission_or_404(mission_id)
    meta = m.get("mesh_meta")
    if not meta:
        raise HTTPException(status_code=400, detail="Mesh has not been reconstructed yet.")
    return meta

@app.get("/api/mission/{mission_id}/confidence")
def get_confidence_telemetry(mission_id: str):
    m = get_mission_or_404(mission_id)
    return {
        "confidence_stats": m.get("confidence_stats"),
        "scale_meta": m.get("scale_meta")
    }

@app.post("/api/mission/{mission_id}/measure")
def measure_geometry(mission_id: str, req: MeasureRequest):
    """Executes metric distance, height, 2D area, or watertight-gated volume measurement."""
    m = get_mission_or_404(mission_id)
    engine = MetricMeasurementEngine()
    
    scale_conf = m["scale_meta"]["scale_confidence"] if m.get("scale_meta") else 0.5

    if req.measurement_type == "DISTANCE_3D":
        if not req.point_a or not req.point_b:
            raise HTTPException(status_code=400, detail="point_a and point_b required for DISTANCE_3D")
        return engine.measure_distance_3d(req.point_a, req.point_b, geometry_confidence=scale_conf)

    elif req.measurement_type == "AREA_2D":
        if not req.polygon_points:
            raise HTTPException(status_code=400, detail="polygon_points required for AREA_2D")
        return engine.measure_area_2d(req.polygon_points, geometry_confidence=scale_conf)

    elif req.measurement_type == "VOLUME_3D":
        mesh_meta = m.get("mesh_meta") or {}
        is_watertight = bool(mesh_meta.get("is_watertight", False))
        mesh_obj = m.get("mesh")
        vol_func = (lambda: mesh_obj.get_volume()) if (is_watertight and mesh_obj) else None
        return engine.measure_volume_3d(is_watertight, vol_func, geometry_confidence=scale_conf)

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported measurement type: {req.measurement_type}")

@app.post("/api/mission/{mission_id}/los")
def analyze_los(mission_id: str, req: LineOfSightRequest):
    """Executes 3D ray-casting line-of-sight visibility analysis."""
    m = get_mission_or_404(mission_id)
    fused = m.get("fused_points")
    pts = fused["points"] if fused else np.zeros((0, 3))
    
    analyzer = LineOfSightAnalyzer()
    return analyzer.analyze_line_of_sight(req.observer, req.target, pts)

@app.get("/api/mission/{mission_id}/disaster")
def get_disaster_analytics(mission_id: str):
    m = get_mission_or_404(mission_id)
    return m.get("disaster_meta", {})

@app.get("/api/mission/{mission_id}/export/{format_type}")
def export_assets(mission_id: str, format_type: str):
    """Downloads PLY point cloud or OBJ mesh asset."""
    m = get_mission_or_404(mission_id)
    exporter = ModelExporter()
    out_dir = os.path.join("data", "output", mission_id)
    os.makedirs(out_dir, exist_ok=True)

    if format_type.lower() == "ply":
        pcd = m.get("clean_pcd")
        if not pcd:
            raise HTTPException(status_code=400, detail="Point cloud not ready")
        file_path = os.path.join(out_dir, "reconstruction.ply")
        exporter.export_point_cloud_ply(pcd, file_path)
        return FileResponse(file_path, filename="reconstruction.ply", media_type="application/octet-stream")

    elif format_type.lower() == "obj":
        mesh = m.get("mesh")
        if not mesh:
            raise HTTPException(status_code=400, detail="Mesh not ready")
        file_path = os.path.join(out_dir, "textured_mesh.obj")
        exporter.export_mesh_obj(mesh, file_path)
        return FileResponse(file_path, filename="textured_mesh.obj", media_type="application/octet-stream")

    else:
        raise HTTPException(status_code=400, detail="Format must be 'ply' or 'obj'")
