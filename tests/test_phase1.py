"""
Phase 1 Integration Test — Minimal Working Reconstruction Core
Verifies end-to-end processing from synthetic drone video + GPS to scale-locked 3D point cloud.
"""

import os
import pytest
import numpy as np

from backend.pipeline.ingestion import VideoIngestor
from backend.pipeline.quality import FrameQualityAnalyzer
from backend.reconstruction.calibration import CameraCalibration
from backend.vio.odometry import VisualOdometry
from backend.scale_registration.scale_lock import VOScaleRegistrar
from backend.depth.monocular import MonocularDepthEstimator
from backend.reconstruction.point_cloud import PointCloudGenerator
from backend.fusion.fuser import PointCloudFuser
from scripts.generate_demo_data import generate_uav_mission_data

@pytest.fixture(scope="module")
def sample_data():
    input_dir = "data/input"
    generate_uav_mission_data(output_dir=input_dir, duration_sec=5.0, fps=30)
    video_path = os.path.join(input_dir, "sample_mission.mp4")
    gps_path = os.path.join(input_dir, "gps.csv")
    camera_path = os.path.join(input_dir, "camera.json")
    return video_path, gps_path, camera_path

def test_phase1_reconstruction_pipeline(sample_data):
    video_path, gps_path, camera_path = sample_data
    
    # 1. Video Ingestion & Metadata
    ingestor = VideoIngestor()
    meta = ingestor.get_video_metadata(video_path)
    assert meta["total_frames"] == 150
    assert meta["width"] == 1280
    assert meta["height"] == 720

    # Keyframe Extraction
    kf_meta, kf_images = ingestor.extract_keyframes(video_path, target_fps=5.0)
    assert len(kf_images) > 0
    assert len(kf_meta) == len(kf_images)

    # 2. Camera Calibration
    calib = CameraCalibration.from_file_or_estimate(camera_path, meta["width"], meta["height"])
    assert calib.fx > 0
    assert calib.width == 1280

    # 3. Visual Odometry
    vo = VisualOdometry(calib)
    raw_trajectory = vo.estimate_trajectory(kf_images, kf_meta)
    assert len(raw_trajectory) == len(kf_images)
    assert "x" in raw_trajectory[0]

    # 4. Module 4B VO Scale Registration
    # Parse GPS CSV
    import csv
    gps_records = []
    with open(gps_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            gps_records.append(row)

    scale_registrar = VOScaleRegistrar()
    scaled_trajectory, scale_meta = scale_registrar.register_scale(raw_trajectory, gps_records)
    
    assert scale_meta["is_scaled"] is True
    assert scale_meta["scale_factor"] > 0.0
    assert scale_meta["scale_confidence"] >= 0.0
    assert "scale_confidence" in scaled_trajectory[0]

    # 5. Depth Estimation & Scale Application
    depth_estimator = MonocularDepthEstimator(use_gpu=False)
    pt_generator = PointCloudGenerator(calib)
    
    kf_point_data = []
    for img, meta_item in zip(kf_images[:5], kf_meta[:5]): # Process first 5 keyframes for fast test
        depth_map, conf_map = depth_estimator.estimate_depth(img, scale_factor=scale_meta["scale_factor"])
        assert depth_map.shape == (720, 1280)
        assert conf_map.shape == (720, 1280)

        p_data = pt_generator.unproject_depth(img, depth_map, conf_map, frame_id=meta_item["frame_id"], timestamp=meta_item["timestamp"])
        assert len(p_data["points"]) > 0
        kf_point_data.append(p_data)

    # 6. Point Cloud Fusion & Sliding-Window ICP
    fuser = PointCloudFuser(voxel_size=0.2, window_size=3)
    fused_dict, o3d_pcd = fuser.fuse_sequence(kf_point_data, scaled_trajectory[:5])

    assert fused_dict["num_points"] > 0
    assert fused_dict["points"].shape[1] == 3
    assert fused_dict["colors"].shape[1] == 3
    print(f"\n[Test Success] Phase 1 Core Pipeline verified cleanly! Fused {fused_dict['num_points']} metric 3D points.")

if __name__ == "__main__":
    pytest.main(["-s", "tests/test_phase1.py"])
