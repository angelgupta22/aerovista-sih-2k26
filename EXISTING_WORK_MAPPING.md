# AEROVISTA — Existing Codebase Audit & Work Mapping

## Overview
This document audits the workspace (`e:\SIH-2026`) against the required AEROVISTA architecture. The workspace is a fresh initialization containing hardware resources (NVIDIA GeForce RTX 4060 GPU with 8GB VRAM, OpenCV 4.13, PyTorch 2.3, Open3D 0.19, Node v24). All modules will be built with clean, modular Python backend components and a modern React/TypeScript/Three.js frontend dashboard.

## Module Audit & Reusability Matrix

| Existing Module | Current Implementation | AEROVISTA Target Module | Reusable? | Required Modification / Action |
| :--- | :--- | :--- | :--- | :--- |
| Video Ingestion | None (Fresh workspace) | `backend/pipeline/ingestion.py` | No (Build new) | Implement OpenCV/FFmpeg adaptive keyframe extractor, metadata reader, resolution/FPS detection |
| Frame Quality | None | `backend/pipeline/quality.py` | No (Build new) | Implement blur, contrast, exposure, & feature richness scoring ($Q$) |
| Camera Calibration | None | `backend/reconstruction/calibration.py` | No (Build new) | Support pinhole camera intrinsics ($f_x, f_y, c_x, c_y, k_1, k_2$), default estimator & configuration UI |
| Visual Odometry | None | `backend/vio/odometry.py` | No (Build new) | Feature tracking (ORB/SIFT + FLANN/BFMatcher), Essential matrix decomposition, PnP, RANSAC camera trajectory estimation |
| Scale Registration | None | `backend/scale_registration/scale.py` | No (Build new) | **Module 4B**: Fit VO relative displacements to GPS/altitude displacement via least-squares scale recovery; compute VO Scale Confidence |
| Depth Estimation | None | `backend/depth/estimator.py` | No (Build new) | Implement `DepthEstimator` abstraction with `MonocularDepthEstimator` (MiDaS/DepthAnything CPU/GPU fallback), `GeometricDepthEstimator` (StereoSGBM), scale-alignment regression ($D_{AI} \approx a \cdot D_{geom} + b$), and per-pixel confidence blending |
| Depth Confidence | None | `backend/confidence/depth_confidence.py` | No (Build new) | Compute multi-criteria per-pixel confidence map (triangulation parallax, reprojection error, temporal consistency) |
| 3D Point Generation | None | `backend/reconstruction/point_cloud.py` | No (Build new) | Unproject depth maps using intrinsics to metric 3D point cloud with RGB, confidence, timestamp, frame ID |
| Point-Cloud Fusion | None | `backend/fusion/fuser.py` | No (Build new) | Pose transformation, local sliding-window ICP refinement, voxel downsampling, statistical outlier removal |
| Semantic Segmentation| None | `backend/segmentation/segmentor.py` | No (Build new) | Semantic segmentation (buildings, roads, terrain, vegetation, vehicles, humans), dynamic object mask extraction & removal |
| Dynamic Object Removal| None | `backend/segmentation/dynamic.py` | No (Build new) | Remove dynamic objects (vehicles, humans) from static scene point cloud; maintain dynamic object layer |
| Georeferencing | None | `backend/georeferencing/georef.py` | No (Build new) | Convert local ENU reconstruction to global WGS84 / UTM via PyProj; GPS trajectory smoothing & noise handling |
| GIS / OSM Prior | None | `backend/gis/osm.py` | No (Build new) | Load building/road vector priors for cross-validation and discrepancy alerting (non-overwriting) |
| Occlusion Handling | None | `backend/confidence/occlusion.py` | No (Build new) | Classify geometry (Observed, AI-inferred, Unknown) and surface completion behind clean interface |
| Mesh & Texturing | None | `backend/meshing/mesh_builder.py` | No (Build new) | Poisson Surface Reconstruction, Ball Pivoting, mesh cleaning, UV projection texture generation |
| API Layer | None | `backend/api/main.py` | No (Build new) | FastAPI backend serving mission creation, async processing, status, trajectory, scale registration, pointcloud, mesh, measurements, exports |
| Frontend Dashboard | None | `frontend/` | No (Build new) | React + Vite + TypeScript + Three.js + React Three Fiber + Tailwind CSS digital twin dashboard with interactive 3D viewer, measurement tools, disaster layer, LOS analysis, scale confidence telemetry |
| Demo & Testing | None | `scripts/generate_demo_data.py`, `tests/` | No (Build new) | Synthetic single-pass UAV flight video + GPS metadata generator; end-to-end automated unit/integration tests |

## Target Environment & Execution Readiness
- **Hardware Detected**: NVIDIA GeForce RTX 4060 Laptop GPU (8GB VRAM), CUDA 12.7 driver available.
- **Python Stack**: Python 3.11, PyTorch, OpenCV 4.13, Open3D 0.19, SciPy, NumPy, PyProj, FastAPI, Uvicorn.
- **Frontend Stack**: Node.js 24, Vite, React 18, TypeScript, Three.js / R3F, Lucide React, Tailwind CSS.
