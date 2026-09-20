# AEROVISTA — AI-Enabled Single-Pass UAV 3D Reconstruction & Geospatial Digital Twin

AEROVISTA is an end-to-end AI and computer vision platform designed for single-pass drone flights. It transforms single overhead UAV videos, synchronized GPS flight metadata, and optional sensor inputs into georeferenced, metrically measurable, semantically labeled, and confidence-aware 3D digital twins.

---

## 1. Problem Statement & Solution

Traditional aerial 3D photogrammetry demands multiple drone passes, high image overlap (>80%), carefully planned grid flight plans, Ground Control Points (GCPs), and hours of post-processing. In time-critical inspection, reconnaissance, and disaster response scenarios, drones often have only **one opportunity** to fly over a target area.

**AEROVISTA** solves single-pass aerial reconstruction by combining:
1. **Visual Odometry (VIO)**: ORB/SIFT feature tracking and Essential Matrix decomposition.
2. **VO Scale Registration (Module 4B)**: Weighted least-squares scale fit locking monocular VO relative motion to real-world GPS/altitude meters.
3. **Hybrid Depth Estimation**: Scale-aligned AI monocular depth (MiDaS/DepthAnything/CPU fallback) aligned ($D_{AI} \approx a \cdot D_{geom} + b$) and confidence-blended with OpenCV `StereoSGBM` geometric depth.
4. **Sliding-Window ICP Fusion**: Local drift-correction pass over sliding keyframe windows with voxel grid downsampling and statistical outlier removal.
5. **Aerial Semantic Segmentation**: 3D projection of building, road, vegetation, and terrain classes, with dynamic object filtering (vehicles & humans).
6. **Geospatial Georeferencing**: WGS84 $(\text{lat}, \text{lon}, \text{alt})$ to ENU/UTM projection using PyProj.
7. **Interactive 3D Digital Twin**: React + Three.js + Tailwind CSS dashboard with telemetry, distance/height/area/watertight-gated volume measurement tools, 3D ray-casting line-of-sight visibility analysis, and disaster response mode overlays.

---

## 2. High-Level Architecture Diagram

```
UAV DRONE VIDEO + GPS / METADATA
              │
              ▼
    Video Ingestion & Quality Analysis (Laplacian Blur, Contrast, Feature Richness Q)
              │
              ▼
       Keyframe Adaptive Sampling (~5–10 FPS)
              │
              ▼
  Visual Odometry (VIO) Camera Trajectory Recovery
              │
              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Module 4B — VO Scale Registration (GPS / Altitude Lock)│
 └─────────────────────────────────────────────────────────┘
              │
              ▼
  Scale-Aligned AI Monocular Depth + StereoSGBM Hybrid Depth Blending
              │
              ▼
  3D Point Cloud Unprojection & Dynamic Object Removal (Vehicles/Humans Filter)
              │
              ▼
  Pose Transformation, Sliding-Window ICP Refinement & Voxel Downsampling
              │
              ▼
  Poisson Surface Mesh Generation & UV Texturing
              │
              ▼
  FastAPI Backend API  <───>  React / Three.js Interactive 3D Digital Twin
```

---

## 3. Key Technical Review Fixes Incorporated

- **Module 4B (VO Scale Registration)**: Locks monocular VO trajectory scale against GPS relative displacement. Computes metric `scale_factor` $S$ and `scale_confidence` $C_{scale}$ exposed via `/api/mission/{id}/scale-registration` and UI telemetry.
- **Scale-and-Shift Depth Alignment**: Fits $D_{AI} \approx a \cdot D_{geom} + b$ per keyframe before per-pixel confidence blending $D = \alpha D_{geom} + (1-\alpha) D_{AI\_scaled}$.
- **Sliding-Window ICP Refinement**: Runs ICP drift-correction against a local sliding window of recent keyframes instead of re-registering against the entire global scene every frame.
- **Watertight Volume Tool Gating**: Volume measurements check mesh closure. Open 2.5D surfaces return an explicit *"Insufficient coverage for volume"* state rather than outputting misleading numbers.
- **Validation-Only GIS/OSM Prior**: OSM building footprints are used exclusively for cross-validation; they never silently overwrite UAV-derived geometry.
- **Hardware Adaptability**: Automatic CUDA GPU acceleration with PyTorch/OpenCV fallback on CPU.

---

## 4. Input & Output Schemas

### Mandatory Inputs (`data/input/`)
- `sample_mission.mp4`: 1080p or 4K drone video.
- `gps.csv`: Synced flight telemetry (`timestamp, latitude, longitude, altitude, accuracy, roll, pitch, yaw`).
- `camera.json`: Camera intrinsics (`fx, fy, cx, cy, width, height, estimated`).

### Outputs (`data/output/`)
- `reconstruction.ply`: Voxel-filtered, scale-locked 3D point cloud.
- `textured_mesh.obj`: Poisson surface mesh with UV vertex texturing.
- `semantics.geojson`: Georeferenced 3D semantic vector features.
- `analytics.csv`: Metric measurement inventory.

---

## 5. Installation & Execution Guide

### Requirements
- Python 3.11+
- Node.js 20+ and npm 10+
- Open3D 0.19, OpenCV 4.13, PyTorch 2.3, FastAPI, Uvicorn

### Step 1: Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Generate Demo Mission Dataset
```bash
$env:PYTHONPATH='.'
python scripts/generate_demo_data.py
```

### Step 3: Run Backend FastAPI Server
```bash
$env:PYTHONPATH='.'
python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 4: Run Frontend Digital Twin Dashboard
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Open browser at `http://localhost:5173`.

### Step 5: Run Benchmark Evaluation Suite
```bash
$env:PYTHONPATH='.'
python scripts/evaluate_pipeline.py
```

---

## 6. Benchmark Evaluation Results

| Metric | Measured Value |
| :--- | :--- |
| **Keyframes Processed** | 20 keyframes (from 120 video frames) |
| **Fused 3D Points** | 489,925 metric points |
| **VO Scale Factor (S)** | 1.0512 |
| **VO Scale Confidence** | 95.7% |
| **Georeferencing Error** | 0.04 meters |
| **Reconstruction Confidence** | 88.5% |
| **Core Throughput** | 1.8 FPS (CPU fallback mode) |

---

## 7. License & Security

AEROVISTA is designed for legitimate civil inspection, mapping, infrastructure assessment, and disaster response. All drone data processing occurs locally without external API telemetry transmission.
