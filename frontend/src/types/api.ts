export interface CameraCalibrationSummary {
  camera_name: string;
  image_width: number;
  image_height: number;
  distortion_model: string;
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  distortion: {
    k1: number;
    k2: number;
    p1: number;
    p2: number;
    k3: number;
  };
  converted_json_structure: {
    fx: number;
    fy: number;
    cx: number;
    cy: number;
    width: number;
    height: number;
    estimated: boolean;
  };
}

export interface ScaleRegistration {
  scale_factor: number;
  scale_confidence: number;
  is_scaled: boolean;
  mode: string;
  mean_residual_meters?: number;
  message?: string;
}

export interface TrajectoryPoint {
  keyframe_index: number;
  frame_id: number;
  timestamp: number;
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
  confidence: number;
  scale_confidence: number;
}

export interface PointCloudData {
  num_points: number;
  points: [number, number, number][];
  colors: [number, number, number][];
  confidences: number[];
}

export interface MeshMetadata {
  num_vertices: number;
  num_triangles: number;
  is_watertight: boolean;
  surface_area_sq_meters: number;
  mesh_volume_cubic_meters: number | null;
  quality_score: number;
}

export interface ConfidenceStats {
  mean_confidence: number;
  high_confidence_pct: number;
  medium_confidence_pct: number;
  low_confidence_pct: number;
  reconstruction_confidence: number;
}

export interface MissionStatus {
  mission_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  current_step: string;
  progress_percentage: number;
  error_message?: string;
}

export interface ProcessMissionParams {
  target_fps?: number;
  voxel_size?: number;
  use_hybrid_depth?: boolean;
  filter_dynamic_objects?: boolean;
}

export interface MeasurementResult {
  type: string;
  distance_meters?: number;
  horizontal_distance_meters?: number;
  height_delta_meters?: number;
  slope_degrees?: number;
  area_sq_meters?: number;
  perimeter_meters?: number;
  volume_cubic_meters?: number | null;
  volume_valid?: boolean;
  status?: string;
  message?: string;
  confidence: number;
}

export interface LineOfSightResult {
  status: 'CLEAR' | 'BLOCKED';
  observer: number[];
  target: number[];
  total_distance_meters: number;
  obstruction?: {
    point: number[];
    distance_from_observer_meters: number;
    clearance_violation_meters: number;
    object_name: string;
  };
}

export interface SemanticAsset {
  id: string;
  class_name: 'BUILDING' | 'ROAD' | 'VEGETATION' | 'TERRAIN' | 'DYNAMIC_VEHICLE';
  height_meters: number;
  footprint_sq_meters: number;
  confidence_pct: number;
  geometry_status: string;
  position: [number, number, number];
}

export interface DamagedStructure {
  id: string;
  severity: 'HIGH' | 'CRITICAL' | 'MODERATE';
  structural_integrity_pct: number;
  location: [number, number, number];
  description: string;
}

export interface BlockedRoad {
  id: string;
  road_name: string;
  obstruction_type: string;
  blockage_pct: number;
  location: [number, number, number];
}

export interface DisasterAnalytics {
  damaged_structures_count: number;
  blocked_roads_count: number;
  debris_obstacles_detected: number;
  accessible_route_clearance_pct: number;
  damaged_structures?: DamagedStructure[];
  blocked_roads?: BlockedRoad[];
}

