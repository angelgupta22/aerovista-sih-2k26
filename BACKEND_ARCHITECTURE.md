# AEROVISTA Backend Technical Architecture & Execution Mechanics

This document provides a comprehensive technical reference for the AEROVISTA single-pass UAV 3D reconstruction and geospatial processing backend engine.

---

## 1. Executive Summary & Core Pipeline Diagram

The AEROVISTA backend is built on **FastAPI**, **OpenCV**, **PyTorch/MiDaS**, and **Open3D**. It processes single overhead flight recordings (`.mp4`), camera calibration intrinsics (`.yaml`/`.json`), and flight telemetry (`.csv`), outputting scale-locked 3D point clouds, textured meshes, metric spatial measurements, and disaster analytics.

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                       INPUT DATA (Video, GPS, YAML)                    │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Step 1: Video Ingestion & Quality Assessment (Laplacian Blur & Q Filter)│
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Step 2: Camera Calibration & Intrinsic Matrix Recovery (K, dist)       │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Step 3: Visual Odometry (ORB Tracking & Essential Matrix E)            │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Step 4: Module 4B — VO Scale Registration (Weighted Least-Squares GPS) │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Step 5: Scale-Aligned Hybrid Depth (AI + StereoSGBM Blending)          │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Step 6: 3D Point Unprojection & Dynamic Object Removal (Vehicle Mask)  │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Step 7: Sliding-Window ICP Refinement & Voxel Point Cloud Fusion       │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Step 8: Surface Meshing, Unified Confidence & Disaster Analytics       │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │          FastAPI REST API  <──>  React / Three.js 3D Viewer           │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Exhaustive Step-by-Step Backend Execution Breakdown

---

### Step 1: Video Ingestion & Quality-Adaptive Keyframe Extraction
- **Module File**: [`backend/pipeline/ingestion.py`](file:///e:/SIH-2026/backend/pipeline/ingestion.py), [`backend/pipeline/quality.py`](file:///e:/SIH-2026/backend/pipeline/quality.py)
- **Primary Function**: `VideoIngestor.extract_keyframes(video_path, target_fps=5.0)`
- **Mathematical / Algorithmic Details**:
  1. Opens OpenCV `VideoCapture` and extracts stream metadata (resolution, frame rate $f_{\text{src}}$, total frame count).
  2. Computes the keyframe sampling step interval:
     $$\text{frame\_interval} = \max\left(1, \left\lfloor \frac{f_{\text{src}}}{f_{\text{target}}} \right\rceil\right)$$
  3. Evaluates candidates for motion blur using the **Laplacian Variance Score**:
     $$\text{Score} = \text{Var}\left( \nabla^2 I \right) = \text{Var}\left( \frac{\partial^2 I}{\partial x^2} + \frac{\partial^2 I}{\partial y^2} \right)$$
     Frames with $\text{Score} < \theta_{\text{blur}}$ (default 100.0) are rejected as blurry.
- **Rationale Behind This Step**:
  Raw 30–60 FPS UAV videos contain high spatial overlap and motion blur during turns. Extracting sharp keyframes reduces processing load by ~85–90% while improving feature matching accuracy.

---

### Step 2: Camera Calibration & Intrinsic Matrix Recovery
- **Module File**: [`backend/reconstruction/calibration.py`](file:///e:/SIH-2026/backend/reconstruction/calibration.py)
- **Primary Function**: `CameraCalibration.from_file_or_estimate(camera_path, width, height)`
- **Mathematical / Algorithmic Details**:
  - Parses focal length ($f_x, f_y$), principal optical center ($c_x, c_y$), and radial/tangential distortion coefficients $(k_1, k_2, p_1, p_2)$.
  - Uncalibrated fallback estimates focal length based on standard UAV $80^\circ$ FOV:
    $$f_x = f_y = 1.2 \times \max(W, H), \qquad c_x = \frac{W}{2}, \qquad c_y = \frac{H}{2}$$
  - Assembles the pinhole camera intrinsic matrix $K$:
    $$K = \begin{bmatrix} f_x & 0 & c_x \\ 0 & f_y & c_y \\ 0 & 0 & 1 \end{bmatrix}$$
- **Rationale Behind This Step**:
  Photogrammetric unprojection relies on camera matrix $K$ to map 2D image coordinates $(u, v)$ to 3D ray vectors $(x/z, y/z)$ and remove lens distortion.

---

### Step 3: Visual Odometry (VIO) & Unscaled Trajectory Estimation
- **Module File**: [`backend/vio/odometry.py`](file:///e:/SIH-2026/backend/vio/odometry.py)
- **Primary Function**: `Visual Odometry.estimate_trajectory(keyframe_images, keyframe_meta)`
- **Mathematical / Algorithmic Details**:
  1. Detects $N=2,000$ ORB features per keyframe and matches descriptors across keyframes using Hamming distance matching.
  2. Estimates the **Essential Matrix ($E$)** via RANSAC ($p=0.999$, $\text{threshold}=1.0\text{px}$):
     $$p_2^T K^{-T} E K^{-1} p_1 = 0$$
  3. Decomposes $E$ into relative rotation $R_{\text{rel}}$ and unscaled unit translation $t_{\text{rel}}$ using SVD (`cv2.recoverPose`).
  4. Accumulates unscaled world poses:
     $$t_{\text{world}}^{i} = t_{\text{world}}^{i-1} + R_{\text{world}}^{i-1} \cdot t_{\text{rel}}^{i}, \qquad R_{\text{world}}^{i} = R_{\text{world}}^{i-1} \cdot R_{\text{rel}}^{i}$$
- **Rationale Behind This Step**:
  Recovers relative 6-DoF camera flight path without requiring ground control points (GCPs) or differential GPS hardware.

---

### Step 4: Module 4B — VO Scale Registration (GPS / Altitude Scale Lock)
- **Module File**: [`backend/scale_registration/scale_lock.py`](file:///e:/SIH-2026/backend/scale_registration/scale_lock.py)
- **Primary Function**: `VOScaleRegistrar.register_scale(trajectory, gps_records)`
- **Mathematical / Algorithmic Details**:
  1. Converts WGS84 GPS coordinates $(\text{lat}, \text{lon}, \text{alt})$ into local ENU (East-North-Up) metric positions relative to reference origin $(0, 0, 0)$.
  2. Pairs relative visual displacements $d_{\text{VO}} = \|t_i - t_{i-1}\|$ with metric GPS displacements $d_{\text{GPS}} = \|g_i - g_{i-1}\|$.
  3. Computes metric scale factor $S$ using **Weighted Least-Squares (WLS)**:
     $$S = \frac{\sum_{i} w_i \cdot d_{\text{VO}, i} \cdot d_{\text{GPS}, i}}{\sum_{i} w_i \cdot (d_{\text{VO}, i})^2}, \qquad w_i = \frac{1}{\text{GPS\_Accuracy}_i}$$
  4. Scales trajectory coordinates $t_{\text{metric}} = S \cdot t_{\text{VO}}$ and computes scale confidence $C_{\text{scale}} = 1 - \frac{\text{MeanResidual}}{\text{MeanDisplacement}}$.
- **Rationale Behind This Step**:
  Monocular visual odometry is scale-ambiguous. Scale locking converts unscaled displacements into real-world meters, enabling real metric measurements.

---

### Step 5: Scale-Aligned Hybrid Depth Estimation
- **Module File**: [`backend/depth/hybrid.py`](file:///e:/SIH-2026/backend/depth/hybrid.py), [`backend/depth/monocular.py`](file:///e:/SIH-2026/backend/depth/monocular.py), [`backend/depth/geometric.py`](file:///e:/SIH-2026/backend/depth/geometric.py)
- **Primary Function**: `HybridDepthEstimator.estimate_hybrid_depth(img_curr, img_prev, scale_factor)`
- **Mathematical / Algorithmic Details**:
  1. Computes AI monocular depth map $D_{\text{AI}}$ (MiDaS / DepthAnything model).
  2. Computes stereo geometric depth map $D_{\text{geom}}$ via OpenCV `StereoSGBM`.
  3. Performs **Scale-and-Shift Linear Regression** ($D_{\text{geom}} \approx a \cdot D_{\text{AI}} + b$) over valid geometric pixels.
  4. Blends per-pixel using geometric confidence $\alpha$:
     $$D_{\text{final}}(u, v) = \alpha(u, v) \cdot D_{\text{geom}}(u, v) + \big(1 - \alpha(u, v)\big) \cdot \big(a \cdot D_{\text{AI}}(u, v) + b\big)$$
- **Rationale Behind This Step**:
  Geometric stereo depth is accurate but sparse in low-texture regions (roads, roofs). AI monocular depth is continuous but unscaled. Linear scale-and-shift alignment fuses both into a dense, scale-accurate depth map.

---

### Step 6: 3D Point Unprojection & Dynamic Object Removal
- **Module File**: [`backend/reconstruction/point_cloud.py`](file:///e:/SIH-2026/backend/reconstruction/point_cloud.py), [`backend/segmentation/segmentor.py`](file:///e:/SIH-2026/backend/segmentation/segmentor.py)
- **Primary Function**: `PointCloudGenerator.unproject_depth(...)` & `AerialSemanticSegmentor.filter_dynamic_points(...)`
- **Mathematical / Algorithmic Details**:
  1. Unprojects 2D depth pixels $(u, v, Z)$ into 3D camera coordinates:
     $$X = \frac{(u - c_x) \cdot Z}{f_x}, \qquad Y = \frac{(v - c_y) \cdot Z}{f_y}, \qquad Z = Z$$
  2. Evaluates semantic categories (Buildings, Roads, Vegetation, Terrain, Vehicles, Personnel).
  3. Strips points matching dynamic class masks (vehicles/humans).
- **Rationale Behind This Step**:
  Moving vehicles and pedestrians create streaks and ghosting artifacts in 3D digital twins. Semantic filtering ensures only permanent infrastructure is preserved.

---

### Step 7: Sliding-Window ICP Refinement & Point Cloud Fusion
- **Module File**: [`backend/fusion/fuser.py`](file:///e:/SIH-2026/backend/fusion/fuser.py)
- **Primary Function**: `PointCloudFuser.fuse_sequence(keyframe_point_data, trajectory)`
- **Mathematical / Algorithmic Details**:
  1. Transforms camera points into ENU world coordinates:
     $$P_{\text{world}} = R_{\text{world}} \cdot P_{\text{ENU}} + t_{\text{world}}$$
  2. Runs **Point-to-Plane ICP Alignment** against a sliding window buffer of recent keyframes ($N=4$) to correct pose drift.
  3. Executes **Voxel Grid Downsampling** ($\text{voxel\_size}=0.15\text{m}$) and **Statistical Outlier Removal** ($\text{neighbors}=20, \sigma=2.0$).
- **Rationale Behind This Step**:
  Global ICP over thousands of keyframes is $O(N^2)$ and impractically slow on CPU. Bounded sliding-window ICP corrects local camera drift in real-time, while voxel filtering keeps cloud memory bounded.

---

### Step 8: Surface Meshing, Unified Confidence & Disaster Intelligence
- **Module File**: [`backend/meshing/surface.py`](file:///e:/SIH-2026/backend/meshing/surface.py), [`backend/confidence/unified_confidence.py`](file:///e:/SIH-2026/backend/confidence/unified_confidence.py), [`backend/disaster/disaster_layer.py`](file:///e:/SIH-2026/backend/disaster/disaster_layer.py)
- **Primary Function**: `SurfaceMeshBuilder.build_mesh(...)` & `DisasterResponseEngine.analyze_disaster_scene(...)`
- **Mathematical / Algorithmic Details**:
  1. Computes 3D Poisson surface reconstruction to generate a textured 3D surface mesh.
  2. Evaluates composite confidence score $C \in [0.0, 1.0]$:
     $$C = 0.35 C_{\text{depth}} + 0.30 C_{\text{pose}} + 0.20 C_{\text{scale}} + 0.15 C_{\text{reproj}}$$
  3. Evaluates structural collapse risks, road blockages, and debris volumes.
- **Rationale Behind This Step**:
  Converts raw points into actionable 3D mesh assets, spatial telemetry, and safety intelligence for emergency mapping and infrastructure inspection.

---

## 3. REST API Endpoint Specifications

- `POST /api/mission/upload`: Upload MP4 video and calibration YAML/JSON.
- `POST /api/mission/{id}/process`: Trigger asynchronous 3D reconstruction pipeline.
- `GET /api/mission/{id}/status`: Poll phase name and progress percentage.
- `GET /api/mission/{id}/pointcloud`: Download preview point cloud data $(X, Y, Z, R, G, B, C)$.
- `GET /api/mission/{id}/scale-registration`: Get scale factor $S$ and scale confidence $C_{\text{scale}}$.
- `GET /api/mission/{id}/trajectory`: Retrieve 6-DoF camera trajectory points.
- `POST /api/mission/{id}/measure`: Compute 3D distance, 2D area, or watertight-gated volume.
- `POST /api/mission/{id}/los`: Perform 3D ray-casting line-of-sight visibility analysis.
- `GET /api/mission/{id}/disaster`: Retrieve disaster assessment analytics.
- `GET /api/mission/{id}/export/{format}`: Download `.ply` point cloud or `.obj` mesh asset.
