import React, { useState } from 'react';
import { Upload, Sparkles, X, Play, Sliders, Shield, Zap, Film, FileText, Settings2, FileCode, Camera, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiService } from '../services/api';
import type { ProcessMissionParams, CameraCalibrationSummary } from '../types/api';

interface MissionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo: (params: ProcessMissionParams) => void;
  isProcessing: boolean;
}

export const MissionUploadModal: React.FC<MissionUploadModalProps> = ({
  isOpen,
  onClose,
  onStartDemo,
  isProcessing
}) => {
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'CUSTOM' | 'YAML'>('PRESETS');
  const [selectedPreset, setSelectedPreset] = useState<string>('urban_recon');

  // Custom pipeline options
  const [targetFps, setTargetFps] = useState<number>(5.0);
  const [voxelSize, setVoxelSize] = useState<number>(0.15);
  const [useHybridDepth, setUseHybridDepth] = useState<boolean>(true);
  const [filterDynamic, setFilterDynamic] = useState<boolean>(true);

  // File states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gpsFile, setGpsFile] = useState<File | null>(null);

  // Camera Calibration YAML states
  const [calibrationYamlFile, setCalibrationYamlFile] = useState<File | null>(null);
  const [calibrationSummary, setCalibrationSummary] = useState<CameraCalibrationSummary | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [isParsingYaml, setIsParsingYaml] = useState<boolean>(false);

  // General YAML config editor state
  const [yamlConfig, setYamlConfig] = useState<string>(`mission:
  name: "Single-Pass UAV Aerial Survey"
  preset: "${selectedPreset}"
  target_fps: ${targetFps}
  max_keyframes: 200

processing:
  voxel_size_meters: ${voxelSize}
  use_hybrid_depth: ${useHybridDepth}
  filter_dynamic_objects: ${filterDynamic}
  
scale_registration:
  mode: "GPS_LOCKED"
  gps_telemetry_file: "data/input/gps.csv"`);

  if (!isOpen) return null;

  const handleCalibrationUpload = async (file: File | null) => {
    if (!file) return;
    setCalibrationYamlFile(file);
    setCalibrationError(null);
    setCalibrationSummary(null);
    setIsParsingYaml(true);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'yaml' && ext !== 'yml') {
      setCalibrationError('Invalid file extension. Please upload a .yaml or .yml camera calibration file.');
      setIsParsingYaml(false);
      return;
    }

    try {
      const res = await apiService.parseCameraYaml(file);
      if (res.valid && res.summary) {
        setCalibrationSummary(res.summary);
      } else {
        setCalibrationError(res.error || 'Failed to parse camera calibration YAML.');
      }
    } catch (e: any) {
      console.error(e);
      setCalibrationError(e.response?.data?.error || e.message || 'Validation error: Malformed YAML file or missing calibration values.');
    } finally {
      setIsParsingYaml(false);
    }
  };

  const handleLaunch = () => {
    onStartDemo({
      target_fps: targetFps,
      voxel_size: voxelSize,
      use_hybrid_depth: useHybridDepth,
      filter_dynamic_objects: filterDynamic
    });
    onClose();
  };

  const presets = [
    {
      id: 'urban_recon',
      title: 'Urban Building & Infrastructure Recon',
      desc: 'Single-pass overhead flight with scale-locked 3D geometry & structural detail.',
      icon: '🏢',
      recommendedFps: 5.0,
      recommendedVoxel: 0.15
    },
    {
      id: 'disaster_eval',
      title: 'Post-Disaster Structural Damage Scan',
      desc: 'Rapid emergency flight with structural integrity assessment & road obstruction detection.',
      icon: '🚨',
      recommendedFps: 8.0,
      recommendedVoxel: 0.10
    },
    {
      id: 'high_speed_survey',
      title: 'High-Speed Terrain & Corridor Survey',
      desc: 'Fast keyframe sampling optimized for CPU performance & large geographic footprints.',
      icon: '⚡',
      recommendedFps: 3.0,
      recommendedVoxel: 0.25
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-emerald-400 shadow-lg shadow-cyan-500/20 text-white">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black font-outfit text-white tracking-wide">
                UAV SINGLE-PASS MISSION SETUP
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Configure flight dataset, camera calibration YAML & AI reconstruction pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-white/10 bg-slate-950/70 px-6 pt-3 gap-6">
          <button
            onClick={() => setActiveTab('PRESETS')}
            className={`pb-3 text-xs font-bold font-outfit flex items-center gap-2 border-b-2 transition ${
              activeTab === 'PRESETS'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Preset UAV Missions</span>
          </button>
          <button
            onClick={() => setActiveTab('CUSTOM')}
            className={`pb-3 text-xs font-bold font-outfit flex items-center gap-2 border-b-2 transition ${
              activeTab === 'CUSTOM'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Custom Dataset Upload</span>
          </button>
          <button
            onClick={() => setActiveTab('YAML')}
            className={`pb-3 text-xs font-bold font-outfit flex items-center gap-2 border-b-2 transition ${
              activeTab === 'YAML'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>YAML Configuration</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'PRESETS' && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-300 tracking-wider font-outfit">
                SELECT DEMO FLIGHT DATASET PRESET
              </label>
              <div className="grid grid-cols-1 gap-3.5">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setTargetFps(preset.recommendedFps);
                      setVoxelSize(preset.recommendedVoxel);
                    }}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-start space-x-4 ${
                      selectedPreset === preset.id
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                        : 'glass-card hover:border-white/20'
                    }`}
                  >
                    <div className="text-2xl p-2.5 rounded-xl bg-slate-900 border border-white/10">
                      {preset.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-white font-outfit">
                          {preset.title}
                        </div>
                        {selectedPreset === preset.id && (
                          <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                            SELECTED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {preset.desc}
                      </p>
                      <div className="flex gap-3 mt-2 text-[11px] font-mono text-slate-400">
                        <span>FPS: {preset.recommendedFps}</span>
                        <span>•</span>
                        <span>Voxel: {preset.recommendedVoxel}m</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'CUSTOM' && (
            <div className="space-y-5">
              {/* Camera Calibration Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 font-outfit">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>Camera Calibration</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Accepted: .yaml, .yml</span>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-dashed border-cyan-500/40 text-center hover:border-cyan-400 transition cursor-pointer relative group">
                  <Camera className="w-8 h-8 text-cyan-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-bold text-white font-outfit">Upload Camera Calibration YAML</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">OpenCV / ROS format (.yaml, .yml)</div>
                  <input
                    type="file"
                    accept=".yaml,.yml"
                    onChange={(e) => handleCalibrationUpload(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {calibrationYamlFile && (
                    <div className="mt-2 text-[10px] font-mono text-cyan-300 bg-cyan-950/60 p-1.5 rounded border border-cyan-500/30 truncate">
                      {calibrationYamlFile.name}
                    </div>
                  )}
                </div>

                {/* Validation Error Alert */}
                {calibrationError && (
                  <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold font-outfit text-rose-400">Validation Error</div>
                      <div className="text-[11px] font-sans opacity-90">{calibrationError}</div>
                    </div>
                  </div>
                )}

                {/* Calibration Summary Card */}
                {calibrationSummary && (
                  <div className="glass-card p-4 rounded-2xl border border-emerald-500/40 space-y-2.5 font-mono text-xs animate-in fade-in">
                    <div className="flex items-center justify-between font-outfit font-bold border-b border-white/10 pb-2">
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Authoritative Camera Calibration
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        VALIDATED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><span className="text-slate-400">Camera:</span> <span className="text-white font-bold">{calibrationSummary.camera_name}</span></div>
                      <div><span className="text-slate-400">Resolution:</span> <span className="text-white font-bold">{calibrationSummary.image_width} × {calibrationSummary.image_height}</span></div>
                      <div className="col-span-2"><span className="text-slate-400">Distortion Model:</span> <span className="text-cyan-300 font-bold">{calibrationSummary.distortion_model}</span></div>
                    </div>

                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <div><span className="text-slate-400">fx:</span> <span className="text-cyan-300">{calibrationSummary.fx.toFixed(6)}</span></div>
                      <div><span className="text-slate-400">fy:</span> <span className="text-cyan-300">{calibrationSummary.fy.toFixed(6)}</span></div>
                      <div><span className="text-slate-400">cx:</span> <span className="text-cyan-300">{calibrationSummary.cx.toFixed(6)}</span></div>
                      <div><span className="text-slate-400">cy:</span> <span className="text-cyan-300">{calibrationSummary.cy.toFixed(6)}</span></div>
                    </div>

                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/5 space-y-1 text-[11px]">
                      <div className="text-[10px] text-slate-400 font-semibold font-outfit">Distortion Coefficients:</div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-300">
                        <div>k1: {calibrationSummary.distortion.k1.toFixed(6)}</div>
                        <div>k2: {calibrationSummary.distortion.k2.toFixed(6)}</div>
                        <div>p1: {calibrationSummary.distortion.p1.toFixed(6)}</div>
                        <div>p2: {calibrationSummary.distortion.p2.toFixed(6)}</div>
                        <div>k3: {calibrationSummary.distortion.k3.toFixed(6)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Video & GPS Input Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                {/* Drone Video Upload Box */}
                <div className="glass-card p-4 rounded-2xl border border-dashed border-cyan-500/30 text-center hover:border-cyan-400 transition cursor-pointer relative group">
                  <Film className="w-7 h-7 text-cyan-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-bold text-white font-outfit">UAV Video Input (.mp4, .mov)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Single overhead flight 1080p/4K</div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {videoFile && (
                    <div className="mt-2 text-[10px] font-mono text-cyan-300 bg-cyan-950/60 p-1 rounded border border-cyan-500/30 truncate">
                      {videoFile.name}
                    </div>
                  )}
                </div>

                {/* GPS Telemetry Upload Box */}
                <div className="glass-card p-4 rounded-2xl border border-dashed border-indigo-500/30 text-center hover:border-indigo-400 transition cursor-pointer relative group">
                  <FileText className="w-7 h-7 text-indigo-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-bold text-white font-outfit">GPS Telemetry CSV (.csv)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">lat, lon, alt, roll, pitch, yaw</div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setGpsFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {gpsFile && (
                    <div className="mt-2 text-[10px] font-mono text-indigo-300 bg-indigo-950/60 p-1 rounded border border-indigo-500/30 truncate">
                      {gpsFile.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'YAML' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span className="font-bold font-outfit">PIPELINE CONFIGURATION YAML</span>
                <span className="font-mono text-[10px] text-cyan-400">config.yaml</span>
              </div>
              <textarea
                value={yamlConfig}
                onChange={(e) => setYamlConfig(e.target.value)}
                rows={9}
                className="w-full bg-slate-950 p-3.5 rounded-xl border border-cyan-500/30 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 leading-relaxed"
              />
            </div>
          )}

          {/* Advanced Reconstruction Pipeline Controls */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-black text-white font-outfit">
              <Settings2 className="w-4 h-4 text-cyan-400" />
              <span>RECONSTRUCTION PIPELINE PARAMETERS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Target Keyframe FPS Slider */}
              <div className="glass-card p-3.5 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold font-outfit">Keyframe Sampling FPS</span>
                  <span className="font-mono text-cyan-400 font-bold">{targetFps} FPS</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.5"
                  value={targetFps}
                  onChange={(e) => setTargetFps(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Voxel Grid Downsampling Slider */}
              <div className="glass-card p-3.5 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold font-outfit">Voxel Downsampling Size</span>
                  <span className="font-mono text-cyan-400 font-bold">{voxelSize} m</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.35"
                  step="0.05"
                  value={voxelSize}
                  onChange={(e) => setVoxelSize(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* AI Depth & Dynamic Filter Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 rounded-xl glass-card hover:bg-slate-800/80 cursor-pointer border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-200 font-semibold font-outfit">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Hybrid Depth AI (MiDaS + SGBM)</span>
                </div>
                <input
                  type="checkbox"
                  checked={useHybridDepth}
                  onChange={(e) => setUseHybridDepth(e.target.checked)}
                  className="accent-emerald-500 rounded w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl glass-card hover:bg-slate-800/80 cursor-pointer border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-200 font-semibold font-outfit">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Filter Dynamic Vehicles/Pedestrians</span>
                </div>
                <input
                  type="checkbox"
                  checked={filterDynamic}
                  onChange={(e) => setFilterDynamic(e.target.checked)}
                  className="accent-indigo-500 rounded w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/60 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4.5 py-2.5 rounded-xl glass-pill text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={isProcessing || isParsingYaml}
            className="relative group overflow-hidden bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-500 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xl shadow-cyan-500/20 disabled:opacity-50 transition flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isProcessing ? 'Processing Mission...' : 'Execute 3D Reconstruction'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
