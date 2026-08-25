import React, { useState, useEffect } from 'react';
import { ViewMode, AlertItem, CameraFeed, MatrixCameraFeed } from './types';
import {
  initialAlerts,
  initialCameras,
  initialMatrixCameras,
  initialTelemetry,
  initialDetections,
} from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { TacticalMatrixView } from './components/TacticalMatrixView';
import { AlertsLog } from './components/AlertsLog';
import { SystemGauges } from './components/SystemGauges';
import { MultiCamStitchingView } from './components/MultiCamStitchingView';
import { QuadLiveStreamView } from './components/QuadLiveStreamView';
import { DetectionsView } from './components/DetectionsView';
import { AlertsManagementView } from './components/AlertsManagementView';
import { SettingsView } from './components/SettingsView';
import { UserManagementView } from './components/UserManagementView';
import { AlertDetailModal } from './components/AlertDetailModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { IncidentInspectorView } from './components/IncidentInspectorView';
import { HistoricalLogsView } from './components/HistoricalLogsView';
import { audioAlertEngine, triggerIntrusionAudioAlert } from './utils/audioAlert';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isAudioPingActive, setIsAudioPingActive] = useState(false);
  const [audioVolume, setAudioVolume] = useState(85);

  // 9-Camera Matrix Reactive State
  const [matrixCameras, setMatrixCameras] = useState<MatrixCameraFeed[]>(initialMatrixCameras);
  const [cameras, setCameras] = useState<CameraFeed[]>(initialCameras);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam-1');
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [selectedAlertForModal, setSelectedAlertForModal] = useState<AlertItem | null>(null);
  const [telemetry, setTelemetry] = useState(initialTelemetry);

  // Dynamic Camera Name Renaming Handler
  const handleUpdateCameraName = (id: number, newName: string) => {
    setMatrixCameras((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );
  };

  // Dynamic Camera Video Source Handler (Uploads or Custom URLs)
  const handleUpdateCameraSource = (id: number, newSrc: string, customName?: string) => {
    setMatrixCameras((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              src: newSrc,
              location: customName ? `${c.location} (${customName})` : c.location,
            }
          : c
      )
    );
  };

  const handleBatchUpdateSources = (
    updates: { id: number; src: string; customName?: string }[]
  ) => {
    setMatrixCameras((prev) =>
      prev.map((c) => {
        const match = updates.find((u) => u.id === c.id);
        return match
          ? {
              ...c,
              src: match.src,
              location: match.customName ? `${c.location} (${match.customName})` : c.location,
            }
          : c;
      })
    );
  };
  
  // Anomaly Sensitivity & Trajectory Settings
  const [anomalySensitivity, setAnomalySensitivity] = useState<number>(78);
  const [trajectoryDataset, setTrajectoryDataset] = useState<string>(
    'TU Clausthal Pedestrian Trajectory Dataset (ETH/UCY Stream)'
  );
  const [showTrajectoryVectors, setShowTrajectoryVectors] = useState<boolean>(true);

  // Subscribe to Audio Alert Engine
  useEffect(() => {
    const unsubscribe = audioAlertEngine.subscribe((isPlaying) => {
      setIsAudioPingActive(isPlaying);
    });
    return unsubscribe;
  }, []);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpuUsage: 45,
        networkMbps: 250,
      }));
      setIsRefreshing(false);
    }, 500);
  };

  // Simulate Anomaly Intrusion
  const handleSimulateIntrusion = (cam?: MatrixCameraFeed) => {
    const d = new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const timeStr = `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(
      2,
      '0'
    )}:${String(d.getSeconds()).padStart(2, '0')} ${ampm}`;

    const camTag = cam ? cam.tag : 'CAM-01';
    const camName = cam ? cam.name : 'Sector A - Perimeter Fence Line';

    const newAlert: AlertItem = {
      id: `alt-${Date.now()}`,
      title: 'Perimeter Intrusion Alert',
      camera: camTag,
      severity: 'High',
      time: timeStr,
      type: 'Perimeter Breach',
      timestamp: Date.now(),
      status: 'active',
      description: `Tactical barrier crossing detected on ${camName}. Immediate response dispatched.`,
      location: camName,
      confidence: 98.4,
      assignedUnit: 'Border Patrol Squad Alpha',
    };

    triggerIntrusionAudioAlert(newAlert);
    setAlerts((prev) => [newAlert, ...prev]);
    setSelectedAlertForModal(newAlert);
  };

  // Alert Actions
  const handleInitiateResponse = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'response_initiated' } : a))
    );
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'resolved' } : a))
    );
    if (selectedAlertForModal?.id === alertId) {
      setSelectedAlertForModal(null);
    }
  };

  return (
    <div
      id="trinetra-app-root"
      className="min-h-screen bg-slate-950 text-slate-200 flex flex-row overflow-x-hidden font-mono antialiased selection:bg-cyan-500 selection:text-black"
    >
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        unreadAlertsCount={alerts.filter((a) => a.status === 'active').length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        {/* Tactical Defense Telemetry Ribbon */}
        <div className="h-6 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between text-[9px] text-cyan-400 font-mono select-none overflow-hidden">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              [SEC_NET: MIL-SPEC ENCRYPTED 256-BIT]
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400 hidden sm:inline">
              [SYSTEM LATENCY: 14ms // 60 FPS INFERENCE]
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-rose-400 font-bold">
              [ALERTS TODAY: {alerts.length}]
            </span>
            <span className="text-cyan-400 font-bold hidden sm:inline px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40">
              [DEFCON 4 // ACTIVE DEFENSE]
            </span>
          </div>
        </div>

        {/* 2. Top Header */}
        <Header
          onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          activeAlertCount={alerts.length}
        />

        {/* Dynamic Main Body by Current View */}
        <main className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-5">
          {currentView === 'dashboard' && (
            <>
              {/* 3. Top Metrics Row: [TOTAL CAMERAS: 9] [ACTIVE FEEDS: 9] [ALERTS TODAY: 19] [TOTAL DETECTIONS: 4,892] */}
              <KpiCards
                totalCameras={matrixCameras.length}
                activeCameras={matrixCameras.filter((c) => c.status === 'Online').length}
                alertsToday={19}
                totalDetections={'4,892'}
                onCardClick={(type) => {
                  if (type === 'cameras' || type === 'active') setCurrentView('cameras');
                  if (type === 'alerts') setCurrentView('alerts');
                  if (type === 'detections') setCurrentView('detections');
                }}
              />

              {/* 4 & 5. Center Section: 9-Camera Tactical Matrix (Left) & Real-time Alert Feed (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
                {/* 9-Camera Surveillance Matrix (9 cols on lg) */}
                <div className="lg:col-span-9 flex flex-col">
                  <TacticalMatrixView
                    cameras={matrixCameras}
                    onUpdateCameraName={handleUpdateCameraName}
                    onTriggerAlert={handleSimulateIntrusion}
                    onSelectCameraForDetails={(cam) => {
                      setSelectedCameraId(String(cam.id));
                    }}
                  />
                </div>

                {/* Right Panel: Filterable Real-time Alert Feed (3 cols on lg) */}
                <div className="lg:col-span-3 flex flex-col">
                  <AlertsLog
                    alerts={alerts}
                    onSelectAlert={(a) => setSelectedAlertForModal(a)}
                    onViewAllAlerts={() => setCurrentView('alerts')}
                  />
                </div>
              </div>

              {/* 6. Bottom Row: Circular Hardware Telemetry Gauges */}
              <SystemGauges telemetry={telemetry} />
            </>
          )}

          {currentView === 'cameras' && (
            <TacticalMatrixView
              cameras={matrixCameras}
              onUpdateCameraName={handleUpdateCameraName}
              onTriggerAlert={handleSimulateIntrusion}
              onSelectCameraForDetails={(cam) => {
                setSelectedCameraId(String(cam.id));
                setCurrentView('dashboard');
              }}
            />
          )}

          {currentView === 'inspector' && <IncidentInspectorView />}

          {currentView === 'historical-logs' && (
            <HistoricalLogsView
              cameras={cameras}
              alerts={alerts}
              onSelectCamera={(cam) => {
                setSelectedCameraId(cam.id);
                setCurrentView('dashboard');
              }}
              onSelectAlert={(a) => setSelectedAlertForModal(a)}
            />
          )}

          {currentView === 'analytics' && <AnalyticsDashboard cameras={cameras} />}

          {currentView === 'stitching' && <MultiCamStitchingView />}

          {currentView === 'detections' && <DetectionsView />}

          {currentView === 'alerts' && (
            <AlertsManagementView
              alerts={alerts}
              onSelectAlert={(a) => setSelectedAlertForModal(a)}
              onInitiateResponse={handleInitiateResponse}
              onResolveAlert={handleResolveAlert}
            />
          )}

          {currentView === 'livestream' && (
            <QuadLiveStreamView
              cameras={cameras}
              selectedCameraId={selectedCameraId}
              onSelectCamera={(cid) => setSelectedCameraId(cid)}
              onTriggerIntrusion={() => handleSimulateIntrusion()}
              onOpenStitchingView={() => setCurrentView('stitching')}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              anomalySensitivity={anomalySensitivity}
              onAnomalySensitivityChange={setAnomalySensitivity}
              trajectoryDataset={trajectoryDataset}
              onTrajectoryDatasetChange={setTrajectoryDataset}
              showTrajectoryVectors={showTrajectoryVectors}
              onToggleTrajectoryVectors={setShowTrajectoryVectors}
            />
          )}

          {currentView === 'users' && <UserManagementView />}
        </main>
      </div>

      {/* Real-time Alert / Incident Response Modal */}
      {selectedAlertForModal && (
        <AlertDetailModal
          alert={selectedAlertForModal}
          onClose={() => setSelectedAlertForModal(null)}
          onInitiateResponse={handleInitiateResponse}
          onResolveAlert={handleResolveAlert}
        />
      )}
    </div>
  );
}
