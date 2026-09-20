import axios from 'axios';
import type {
  MissionStatus, ScaleRegistration, TrajectoryPoint, PointCloudData,
  ConfidenceStats, MeasurementResult, LineOfSightResult, DisasterAnalytics,
  ProcessMissionParams, MeshMetadata, CameraCalibrationSummary
} from '../types/api';

const API_BASE = 'http://localhost:8000';

export const apiService = {
  createDemoMission: async () => {
    const res = await axios.post<{ mission_id: string; status: string; message: string }>(`${API_BASE}/api/mission/demo`);
    return res.data;
  },

  processMission: async (missionId: string, params: ProcessMissionParams = {}) => {
    const res = await axios.post(`${API_BASE}/api/mission/${missionId}/process`, {
      target_fps: params.target_fps ?? 5.0,
      voxel_size: params.voxel_size ?? 0.15,
      use_hybrid_depth: params.use_hybrid_depth ?? true,
      filter_dynamic_objects: params.filter_dynamic_objects ?? true
    });
    return res.data;
  },

  getMissionStatus: async (missionId: string): Promise<MissionStatus> => {
    const res = await axios.get<MissionStatus>(`${API_BASE}/api/mission/${missionId}/status`);
    return res.data;
  },

  getScaleRegistration: async (missionId: string): Promise<ScaleRegistration> => {
    const res = await axios.get<ScaleRegistration>(`${API_BASE}/api/mission/${missionId}/scale-registration`);
    return res.data;
  },

  getTrajectory: async (missionId: string): Promise<TrajectoryPoint[]> => {
    const res = await axios.get<{ trajectory: TrajectoryPoint[] }>(`${API_BASE}/api/mission/${missionId}/trajectory`);
    return res.data.trajectory;
  },

  getPointCloud: async (missionId: string): Promise<PointCloudData> => {
    const res = await axios.get<PointCloudData>(`${API_BASE}/api/mission/${missionId}/pointcloud`);
    return res.data;
  },

  getMeshInfo: async (missionId: string): Promise<MeshMetadata> => {
    const res = await axios.get<MeshMetadata>(`${API_BASE}/api/mission/${missionId}/mesh`);
    return res.data;
  },

  getConfidenceTelemetry: async (missionId: string): Promise<{ confidence_stats: ConfidenceStats; scale_meta: ScaleRegistration }> => {
    const res = await axios.get<{ confidence_stats: ConfidenceStats; scale_meta: ScaleRegistration }>(`${API_BASE}/api/mission/${missionId}/confidence`);
    return res.data;
  },

  measureGeometry: async (missionId: string, payload: any): Promise<MeasurementResult> => {
    const res = await axios.post<MeasurementResult>(`${API_BASE}/api/mission/${missionId}/measure`, payload);
    return res.data;
  },

  analyzeLineOfSight: async (missionId: string, observer: number[], target: number[]): Promise<LineOfSightResult> => {
    const res = await axios.post<LineOfSightResult>(`${API_BASE}/api/mission/${missionId}/los`, { observer, target });
    return res.data;
  },

  getDisasterAnalytics: async (missionId: string): Promise<DisasterAnalytics> => {
    const res = await axios.get<DisasterAnalytics>(`${API_BASE}/api/mission/${missionId}/disaster`);
    return res.data;
  },

  parseCameraYaml: async (file: File): Promise<{ valid: boolean; summary?: CameraCalibrationSummary; error?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_BASE}/api/calibration/parse-yaml`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};

