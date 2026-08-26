import React, { useState, useEffect, useCallback } from 'react';
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
import { NotificationHistory } from './components/NotificationHistory';
import { CameraHealthDiagnosticsView } from './components/CameraHealthDiagnosticsView';
import { audioAlertEngine, triggerIntrusionAudioAlert } from './utils/audioAlert';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { webSocketService } from './services/websocketService';
import { Siren, ShieldAlert } from 'lucide-react';

function SeemadrishtiMainApp() {
  const { theme, isDaylight } = useTheme();
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isAudioPingActive, setIsAudioPingActive] = useState(false);
  const [audioVolume, setAudioVolume] = useState(85);

  // Global Strobe/Flash Alert Animation State for High Severity Breaches
  const [isGlobalFlashActive, setIsGlobalFlashActive] = useState(false);

  // 9-Camera Matrix Reactive State
  const [matrixCameras, setMatrixCameras] = useState<MatrixCameraFeed[]>(initialMatrixCameras);
  const [cameras, setCameras] = useState<CameraFeed[]>(initialCameras);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam-1');
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [selectedAlertForModal, setSelectedAlertForModal] = useState<AlertItem | null>(null);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(85);

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

  // Trigger Flash Animation Helper
  const triggerGlobalFlash = useCallback(() => {
    setIsGlobalFlashActive(true);
    setTimeout(() => {
      setIsGlobalFlashActive(false);
    }, 4500);
  }, []);

  // WebSocket Live Stream Service Integration
  useEffect(() => {
    webSocketService.connect();

    // Ingest Live Stream Alerts from WebSocket Server
    const unsubAlerts = webSocketService.onAlert((incomingAlert) => {
      setAlerts((prev) => {
        // Prevent duplicate IDs
        if (prev.some((a) => a.id === incomingAlert.id)) return prev;
        return [incomingAlert, ...prev];
      });

      if (incomingAlert.severity === 'High') {
        triggerGlobalFlash();
        if (incomingAlert.audioTriggered) {
          triggerIntrusionAudioAlert(incomingAlert);
        }
      }
    });

    // Ingest Live Telemetry updates from WebSocket Server
    const unsubTelemetry = webSocketService.onTelemetry((incomingTelemetry) => {
      setTelemetry((prev) => ({
        ...prev,
        ...incomingTelemetry,
      }));
    });

    return () => {
      unsubAlerts();
      unsubTelemetry();
    };
  }, [triggerGlobalFlash]);

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

    const randomConfidence = Math.round((50 + Math.random() * 49.9) * 10) / 10;
    const isHighSeverity = randomConfidence >= 90;

    const newAlert: AlertItem = {
      id: `alt-${Date.now()}`,
      title: isHighSeverity ? 'CRITICAL PERIMETER BREACH' : 'Perimeter Intrusion Alert',
      camera: camTag,
      severity: isHighSeverity ? 'High' : randomConfidence >= 75 ? 'Medium' : 'Low',
      time: timeStr,
      type: 'Perimeter Breach',
      timestamp: Date.now(),
      status: 'active',
      description: `Tactical barrier crossing detected on ${camName}. AI anomaly detection flagged trajectory crossing border perimeter.`,
      location: camName,
      confidence: randomConfidence,
      assignedUnit: 'Border Patrol Squad Alpha',
      audioTriggered: randomConfidence >= confidenceThreshold,
      thresholdAtTime: confidenceThreshold,
    };

    // Trigger global screen flash strobe if High severity
    if (isHighSeverity || newAlert.severity === 'High') {
      triggerGlobalFlash();
    }

    if (randomConfidence >= confidenceThreshold) {
      triggerIntrusionAudioAlert(newAlert);
      setAlerts((prev) => [newAlert, ...prev]);
      setSelectedAlertForModal(newAlert);
    } else {
      console.log(`[AI FILTER] Alert suppressed. Confidence (${randomConfidence}%) below threshold (${confidenceThreshold}%).`);
      setAlerts((prev) => [newAlert, ...prev]);
    }
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
      id="seemadrishti-app-root"
      className={`min-h-screen flex flex-row overflow-x-hidden font-mono antialiased relative transition-colors duration-300 ${
        isDaylight
          ? 'bg-[#f1f5f9] text-slate-900 selection:bg-cyan-600 selection:text-white'
          : 'bg-[#02040a] text-slate-200 selection:bg-cyan-500 selection:text-black'
      } ${isGlobalFlashActive ? 'animate-screen-flash-pulse' : ''}`}
    >
      {/* Global Perimeter Alarm Visual Warning Overlay Banner */}
      {isGlobalFlashActive && (
        <div
          id="global-perimeter-alarm-banner"
          className="fixed top-0 left-0 right-0 z-50 bg-rose-600/90 text-white border-b-2 border-rose-400 py-1.5 px-4 flex items-center justify-between shadow-[0_0_30px_rgba(255,0,85,0.9)] animate-bounce font-mono text-xs font-black tracking-widest"
        >
          <div className="flex items-center gap-2">
            <Siren size={18} className="animate-spin text-white" />
            <span className="uppercase">
              CRITICAL DEFCON-1 PERIMETER INTRUSION DETECTED — TACTICAL ALARM ENGAGED
            </span>
          </div>
          <button
            onClick={() => setIsGlobalFlashActive(false)}
            className="px-2 py-0.5 rounded bg-black/40 hover:bg-black/70 text-white text-[10px] uppercase cursor-pointer"
          >
            DISMISS ALARM STROBE
          </button>
        </div>
      )}

      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        unreadAlertsCount={alerts.filter((a) => a.status === 'active').length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 relative ${
          isDaylight ? 'bg-[#f8fafc]' : 'bg-[#02040a]'
        }`}
      >
        {/* Tactical Defense Telemetry Ribbon */}
        <div
          className={`h-6 px-4 flex items-center justify-between text-[9px] font-mono select-none overflow-hidden border-b ${
            isDaylight
              ? 'bg-slate-200 border-slate-300 text-slate-700'
              : 'bg-[#010307] border-cyan-500/20 text-cyan-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1 font-bold ${
                isDaylight ? 'text-emerald-700' : 'text-emerald-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              [SEC_NET: MIL-SPEC ENCRYPTED 256-BIT]
            </span>
            <span className="text-slate-400">|</span>
            <span className="hidden sm:inline">
              [SYSTEM LATENCY: 14ms // 60 FPS INFERENCE]
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-rose-600 dark:text-rose-400 font-bold">
              [ALERTS TODAY: {alerts.length}]
            </span>
            <span
              className={`font-bold hidden sm:inline px-2 py-0.5 rounded border ${
                isDaylight
                  ? 'bg-cyan-100 text-cyan-900 border-cyan-300'
                  : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
              }`}
            >
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
              {/* 3. Top Metrics Row */}
              <KpiCards
                totalCameras={matrixCameras.length}
                activeCameras={matrixCameras.filter((c) => c.status === 'Online').length}
                alertsToday={alerts.length}
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
                    alerts={alerts}
                    onUpdateCameraName={handleUpdateCameraName}
                    onTriggerAlert={handleSimulateIntrusion}
                    onSelectCameraForDetails={(cam) => {
                      setSelectedCameraId(String(cam.id));
                    }}
                    confidenceThreshold={confidenceThreshold}
                    onConfidenceThresholdChange={setConfidenceThreshold}
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

          {currentView === 'diagnostics' && <CameraHealthDiagnosticsView />}

          {currentView === 'cameras' && (
            <TacticalMatrixView
              cameras={matrixCameras}
              alerts={alerts}
              onUpdateCameraName={handleUpdateCameraName}
              onTriggerAlert={handleSimulateIntrusion}
              onSelectCameraForDetails={(cam) => {
                setSelectedCameraId(String(cam.id));
                setCurrentView('dashboard');
              }}
              confidenceThreshold={confidenceThreshold}
              onConfidenceThresholdChange={setConfidenceThreshold}
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
          {currentView === 'notification-history' && (
            <NotificationHistory alerts={alerts} />
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

export default function App() {
  return (
    <ThemeProvider>
      <SeemadrishtiMainApp />
    </ThemeProvider>
  );
}

