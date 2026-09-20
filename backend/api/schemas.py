"""
API Request and Response Pydantic Schemas for AEROVISTA FastAPI backend.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class MissionUploadResponse(BaseModel):
    mission_id: str
    video_path: str
    gps_path: Optional[str] = None
    camera_path: Optional[str] = None
    message: str

class ProcessMissionRequest(BaseModel):
    target_fps: float = Field(default=5.0, description="Keyframe extraction frame rate")
    voxel_size: float = Field(default=0.15, description="Point cloud voxel grid size in meters")
    use_hybrid_depth: bool = Field(default=True, description="Enable hybrid SGBM + AI depth blending")

class MissionStatusResponse(BaseModel):
    mission_id: str
    status: str # PENDING, PROCESSING, COMPLETED, FAILED
    current_step: str # Preprocessing, VIO, Scale Registration, Depth Estimation, 3D Fusion, Semantics, Complete
    progress_percentage: float
    error_message: Optional[str] = None

class ScaleRegistrationResponse(BaseModel):
    scale_factor: float
    scale_confidence: float
    is_scaled: bool
    mode: str
    mean_residual_meters: Optional[float] = None
    message: str

class MeasureRequest(BaseModel):
    measurement_type: str # DISTANCE_3D, AREA_2D, VOLUME_3D
    point_a: Optional[List[float]] = None
    point_b: Optional[List[float]] = None
    polygon_points: Optional[List[List[float]]] = None

class LineOfSightRequest(BaseModel):
    observer: List[float]
    target: List[float]
