import { useState } from 'react';
import { Header } from './components/Header';
import { TelemetryBar } from './components/TelemetryBar';
import { SidebarNav, type SidebarTab } from './components/SidebarNav';
import { LayerControls } from './components/LayerControls';
import { MeasurementPanel } from './components/MeasurementPanel';
import { LineOfSightPanel } from './components/LineOfSightPanel';
import { SemanticInspector } from './components/SemanticInspector';
import { DisasterPanel } from './components/DisasterPanel';
import { PipelineMonitorPanel } from './components/PipelineMonitorPanel';
import { MissionUploadModal } from './components/MissionUploadModal';
import { DigitalTwinViewer } from './viewer/DigitalTwinViewer';
import { apiService } from './services/api';
import type {
  PointCloudData, TrajectoryPoint, ScaleRegistration,
  ConfidenceStats, LineOfSightResult, MeasurementResult, DisasterAnalytics,
  ProcessMissionParams, SemanticAsset
} from './types/api';

export function App() {
  const [missionId, setMissionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('Idle');
  const [progress, setProgress] = useState(0);

  // UI Modals & Sidebar Tabs (Default LAYERS active)
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab | null>('LAYERS');

  // Data states
  const [pointCloud, setPointCloud] = useState<PointCloudData | null>(null);
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [scaleMeta, setScaleMeta] = useState<ScaleRegistration | null>(null);
  const [confidenceStats, setConfidenceStats] = useState<ConfidenceStats | null>(null);
  const [disasterData, setDisasterData] = useState<DisasterAnalytics | null>(null);

  // Layer & Shading States
  const [showPointCloud, setShowPointCloud] = useState(true);
  const [showMesh, setShowMesh] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showDisasterLayer, setShowDisasterLayer] = useState(false);
  const [colorMode, setColorMode] = useState<'RGB' | 'HEIGHT' | 'CONFIDENCE' | 'SEMANTIC'>('RGB');
  const [pointSize, setPointSize] = useState(0.25);
  const [showFog, setShowFog] = useState(true);

  // Analytics Tool Results & Points
  const [losResult, setLosResult] = useState<LineOfSightResult | null>(null);
  const [measurementResult, setMeasurementResult] = useState<MeasurementResult | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<[number, number, number][]>([]);
  const [isPickingPoint, setIsPickingPoint] = useState(false);

  // Viewport Camera Controls
  const [cameraPreset, setCameraPreset] = useState<'TOP' | 'ISO' | 'FRONT' | 'RESET' | null>(null);
  const [focusTarget, setFocusTarget] = useState<[number, number, number] | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(false);

  // Inspected Object Modal State
  const [inspectedObject, setInspectedObject] = useState<SemanticAsset | null>(null);

  // Start UAV Mission with custom parameters
  const handleStartMission = async (params: ProcessMissionParams) => {
    try {
      setIsProcessing(true);
      setCurrentStep('Initializing Mission');
      setProgress(5);
      setActiveTab('PIPELINE');

      const demoRes = await apiService.createDemoMission();
      const id = demoRes.mission_id;
      setMissionId(id);

      await apiService.processMission(id, params);
      pollMissionStatus(id);
    } catch (e) {
      console.error('Failed to start mission:', e);
      setIsProcessing(false);
    }
  };

  const pollMissionStatus = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const statusRes = await apiService.getMissionStatus(id);
        setCurrentStep(statusRes.current_step);
        setProgress(statusRes.progress_percentage);

        if (statusRes.status === 'COMPLETED') {
          clearInterval(interval);
          setIsProcessing(false);
          fetchMissionResults(id);
        } else if (statusRes.status === 'FAILED') {
          clearInterval(interval);
          setIsProcessing(false);
          alert(`Mission Processing Failed: ${statusRes.error_message}`);
        }
      } catch (e) {
        console.error('Error polling status:', e);
      }
    }, 1200);
  };

  const fetchMissionResults = async (id: string) => {
    try {
      const [pcData, trajData, confData, disData] = await Promise.all([
        apiService.getPointCloud(id),
        apiService.getTrajectory(id),
        apiService.getConfidenceTelemetry(id),
        apiService.getDisasterAnalytics(id)
      ]);

      setPointCloud(pcData);
      setTrajectory(trajData);
      setScaleMeta(confData.scale_meta);
      setConfidenceStats(confData.confidence_stats);
      setDisasterData(disData);

      setInspectedObject({
        id: 'BUILDING_STRUCTURE_#14',
        class_name: 'BUILDING',
        height_meters: 14.8,
        footprint_sq_meters: 1240,
        confidence_pct: 94,
        geometry_status: 'OBSERVED / SCALE-LOCKED',
        position: [0, 8, 0]
      });
    } catch (e) {
      console.error('Failed to fetch mission results:', e);
    }
  };

  const handleExport = (format: 'ply' | 'obj') => {
    if (!missionId) {
      alert('Please run a mission first before exporting assets.');
      return;
    }
    window.open(`http://localhost:8000/api/mission/${missionId}/export/${format}`, '_blank');
  };

  const handlePointPicked = (pt: [number, number, number]) => {
    setSelectedPoints((prev) => {
      if (prev.length >= 2) return [pt];
      return [...prev, pt];
    });
  };

  const handleFocusLocation = (pos: [number, number, number]) => {
    setFocusTarget(pos);
    setTimeout(() => setFocusTarget(null), 1000);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 font-sans text-slate-100 overflow-hidden relative">
      {/* Top Header */}
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        onExport={handleExport}
        isProcessing={isProcessing}
        currentStep={currentStep}
        hasData={!!pointCloud}
      />

      {/* Main 3D Viewport Workspace */}
      <div className="relative flex-1 w-full h-full bg-slate-950">
        <DigitalTwinViewer
          pointCloud={pointCloud}
          trajectory={trajectory}
          showPointCloud={showPointCloud}
          showMesh={showMesh}
          showWireframe={showWireframe}
          showTrajectory={showTrajectory}
          showDisasterLayer={showDisasterLayer}
          colorMode={colorMode}
          pointSize={pointSize}
          showFog={showFog}
          losResult={losResult}
          measurementResult={measurementResult}
          selectedPoints={selectedPoints}
          onPointClick={handlePointPicked}
          isPickingPoint={isPickingPoint}
          cameraPreset={cameraPreset}
          focusTarget={focusTarget}
          isAutoRotating={isAutoRotating}
          disasterData={disasterData}
        />

        {/* CENTERED Floating Category Dock & Panel Container */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center space-y-3 pointer-events-none max-w-full px-4">
          {/* Centered Top Category Navigation Bar */}
          <SidebarNav
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            isProcessing={isProcessing}
            disasterCount={disasterData?.damaged_structures_count || 2}
          />

          {/* Centered Active Panel Drawer */}
          {activeTab && (
            <div className="pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200">
              {activeTab === 'LAYERS' && (
                <LayerControls
                  showPointCloud={showPointCloud}
                  setShowPointCloud={setShowPointCloud}
                  showMesh={showMesh}
                  setShowMesh={setShowMesh}
                  showWireframe={showWireframe}
                  setShowWireframe={setShowWireframe}
                  showTrajectory={showTrajectory}
                  setShowTrajectory={setShowTrajectory}
                  showDisasterLayer={showDisasterLayer}
                  setShowDisasterLayer={setShowDisasterLayer}
                  colorMode={colorMode}
                  setColorMode={setColorMode}
                  pointSize={pointSize}
                  setPointSize={setPointSize}
                  showFog={showFog}
                  setShowFog={setShowFog}
                />
              )}

              {activeTab === 'MEASURE' && (
                <MeasurementPanel
                  missionId={missionId}
                  onResultUpdated={(res) => setMeasurementResult(res)}
                  selectedPoints={selectedPoints}
                  onClearPoints={() => setSelectedPoints([])}
                  isPickingPoint={isPickingPoint}
                  setIsPickingPoint={setIsPickingPoint}
                />
              )}

              {activeTab === 'LOS' && (
                <LineOfSightPanel
                  missionId={missionId}
                  onLosResult={(res) => setLosResult(res)}
                  selectedPoints={selectedPoints}
                  isPickingPoint={isPickingPoint}
                  setIsPickingPoint={setIsPickingPoint}
                />
              )}

              {activeTab === 'ASSETS' && (
                <SemanticInspector
                  inspectedObject={inspectedObject}
                  onClose={() => setInspectedObject(null)}
                  onFocusObject={handleFocusLocation}
                />
              )}

              {activeTab === 'DISASTER' && (
                <DisasterPanel
                  disasterData={disasterData}
                  onFocusLocation={handleFocusLocation}
                />
              )}

              {activeTab === 'PIPELINE' && (
                <PipelineMonitorPanel
                  currentStep={currentStep}
                  progress={progress}
                  isProcessing={isProcessing}
                />
              )}
            </div>
          )}
        </div>

        {/* Mission Setup / Dataset Upload Modal */}
        <MissionUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onStartDemo={handleStartMission}
          isProcessing={isProcessing}
        />
      </div>

      {/* CENTERED Bottom Telemetry Bar */}
      <TelemetryBar
        scaleMeta={scaleMeta}
        confidenceStats={confidenceStats}
        numPoints={pointCloud?.num_points || 0}
        numKeyframes={trajectory.length}
        onCameraPreset={(mode) => {
          setCameraPreset(mode);
          setTimeout(() => setCameraPreset(null), 300);
        }}
        isAutoRotating={isAutoRotating}
        onToggleAutoRotate={() => setIsAutoRotating(!isAutoRotating)}
      />
    </div>
  );
}

export default App;
