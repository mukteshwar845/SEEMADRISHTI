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
import { CameraDetailModal } from './components/CameraDetailModal';
import { SihDemoGuideModal } from './components/SihDemoGuideModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { IncidentInspectorView } from './components/IncidentInspectorView';
import { IntelligenceSearch } from './components/IntelligenceSearch';
import { TargetJourneyView } from './components/TargetJourneyView';
import { ThreatHeatmapView } from './components/ThreatHeatmapView';
import { HistoricalLogsView } from './components/HistoricalLogsView';
import { NotificationHistory } from './components/NotificationHistory';
import { CameraHealthDiagnosticsView } from './components/CameraHealthDiagnosticsView';
import { MissionControlView } from './components/MissionControlView';
import { CameraFleetView } from './components/CameraFleetView';
import { EvidenceQueueView } from './components/EvidenceQueueView';
import { SystemTimelineView } from './components/SystemTimelineView';
import { CameraCalibrationView } from './components/CameraCalibrationView';
import { ReportsModal } from './components/ReportsModal';
import { audioAlertEngine, triggerIntrusionAudioAlert } from './utils/audioAlert';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { webSocketService } from './services/websocketService';
import { voiceCommandService } from './services/voiceCommandService';
import { fetchAlerts, fetchCameras, fetchTelemetry } from './services/api';
import { Siren, ShieldAlert } from 'lucide-react';

function SeemadrishtiMainApp() {
  const { theme, isDaylight } = useTheme();
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isAudioPingActive, setIsAudioPingActive] = useState(false);
  const [audioVolume, setAudioVolume] = useState(85);
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  // App Data States
  const [cameras, setCameras] = useState<CameraFeed[]>(() => {
    const fixtures = [
      '/fixtures/moving_objects.mp4',
      '/fixtures/intrusion_test.mp4',
      '/fixtures/loitering_test.mp4',
      '/fixtures/sample_test.mp4',
    ];
    return initialCameras.map((cam, i) => ({
      ...cam,
      rtspUrl: fixtures[i % fixtures.length],
    }));
  });
  const [matrixCameras, setMatrixCameras] = useState<MatrixCameraFeed[]>(() => {
    const fixtures = [
      '/fixtures/moving_objects.mp4',
      '/fixtures/intrusion_test.mp4',
      '/fixtures/loitering_test.mp4',
      '/fixtures/sample_test.mp4',
    ];
    return initialMatrixCameras.map((cam, i) => ({
      ...cam,
      src: fixtures[i % fixtures.length],
    }));
  });
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam-1');
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [isGlobalFlashActive, setIsGlobalFlashActive] = useState(false);
  const [selectedAlertForModal, setSelectedAlertForModal] = useState<AlertItem | null>(null);
  const [selectedCameraForModal, setSelectedCameraForModal] = useState<CameraFeed | null>(null);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(85);
  const [highlightedCameras, setHighlightedCameras] = useState<string[]>([]);
  const [selectedJourneyTrackId, setSelectedJourneyTrackId] = useState<number | null>(null);
  const [heatmapHighlightCameras, setHeatmapHighlightCameras] = useState<string[]>([]);

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

    // Fetch initial alerts from database REST API
    fetchAlerts()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          const mappedAlerts: AlertItem[] = res.data.map((a: any) => {
            const meta = typeof a.metadata === 'object' && a.metadata !== null ? a.metadata : {};
            const d = new Date(a.created_at || Date.now());
            const sev: AlertItem['severity'] =
              a.severity === 'CRITICAL' || a.severity === 'HIGH' || a.severity === 'High'
                ? 'High'
                : a.severity === 'MEDIUM' || a.severity === 'Medium'
                ? 'Medium'
                : 'Low';
            return {
              id: a.id,
              title: a.title || 'Security Anomaly',
              camera: a.camera_id?.toUpperCase() || 'CAM-01',
              severity: sev,
              time: isNaN(d.getTime()) ? '00:00:00' : d.toLocaleTimeString(),
              type: a.type || 'PERIMETER_ALERT',
              timestamp: isNaN(d.getTime()) ? Date.now() : d.getTime(),
              status: a.status || 'active',
              description: a.description || '',
              location: a.location || 'Border Sector Alpha',
              riskScore: a.risk_score ?? meta.risk_score,
              riskLevel: a.risk_level ?? meta.risk_level,
              reasons: meta.reasons,
              trackId: a.track_id ?? meta.track_id,
              className: meta.class_name,
              hasEvidence: Boolean(meta.evidence_path || a.has_evidence),
              incidentId: meta.incident_id || a.incident_id,
              cameraSequence: meta.camera_sequence,
              anomalyType: meta.anomaly_type,
              dwellSeconds: meta.dwell_seconds,
              zoneName: a.zone_name || meta.zone_name,
            };
          });
          setAlerts(mappedAlerts);
        }
      })
      .catch(() => {});

    // Fetch initial Edge Hardware & Database Telemetry
    fetchTelemetry()
      .then((res) => {
        if (res.success && res.data) {
          const hw = res.data.hardware;
          setTelemetry((prev) => ({
            ...prev,
            cpuUsage: hw.loadAverage?.[0] ? Math.round(hw.loadAverage[0] * 10) : prev.cpuUsage,
            cpuLoad: `${hw.cpuCores}-Core (${hw.cpuModel})`,
            memoryUsedGb: hw.memoryUsedGb,
            memoryTotalGb: hw.memoryTotalGb,
            database: res.data.database,
          } as any));
        }
      })
      .catch(() => {});

    // Priority 2: Hydrate matrix cameras from live SQLite backend REST API
    fetchCameras()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setMatrixCameras((prev) =>
            prev.map((c) => {
              const camCode = `cam-0${c.id}`;
              const liveCam = res.data?.find(
                (dbCam) =>
                  dbCam.id.toLowerCase() === camCode ||
                  dbCam.id.toLowerCase() === `cam-${c.id}` ||
                  dbCam.name.toLowerCase() === c.name.toLowerCase()
              );
              if (liveCam) {
                return {
                  ...c,
                  name: liveCam.name || c.name,
                  location: liveCam.location || c.location,
                  status: liveCam.status || c.status,
                  src: liveCam.source_url ? `/api/cameras/${liveCam.id}/video` : c.src,
                };
              }
              return c;
            })
          );
        }
      })
      .catch((err) => {
        console.warn('[CAMERAS] Live fetch failed, using fallback mockData:', err);
      });

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

  // Refresh handler with real telemetry fetch
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTelemetry()
      .then((res) => {
        if (res.success && res.data) {
          const hw = res.data.hardware;
          setTelemetry((prev) => ({
            ...prev,
            cpuUsage: hw.loadAverage?.[0] ? Math.round(hw.loadAverage[0] * 10) : prev.cpuUsage,
            cpuLoad: `${hw.cpuCores}-Core (${hw.cpuModel})`,
            memoryUsedGb: hw.memoryUsedGb,
            memoryTotalGb: hw.memoryTotalGb,
            database: res.data.database,
          } as any));
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsRefreshing(false);
      });
  };

  // Voice-to-Text Command Dispatcher Integration
  useEffect(() => {
    const unsub = voiceCommandService.onCommand((match) => {
      const act = match.action;
      if (act.type === 'NAVIGATE') {
        setCurrentView(act.view);
      } else if (act.type === 'SET_MATRIX_LAYOUT') {
        setCurrentView('dashboard');
      } else if (act.type === 'SIMULATE_INTRUSION') {
        handleSimulateIntrusion();
      } else if (act.type === 'MUTE_AUDIO') {
        setIsAudioMuted(act.muted);
        audioAlertEngine.setMuted(act.muted);
      } else if (act.type === 'OPEN_DEMO_GUIDE') {
        setIsDemoGuideOpen(true);
      } else if (act.type === 'OPEN_REPORTS') {
        setIsReportsModalOpen(true);
      } else if (act.type === 'REFRESH') {
        handleRefresh();
      }
    });
    return unsub;
  }, []);

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

    const testConfidence = 0.95;
    const isHighSeverity = true;

    const newAlert: AlertItem = {
      id: `alt-${Date.now()}`,
      title: 'CRITICAL PERIMETER BREACH',
      camera: camTag,
      severity: 'High',
      time: timeStr,
      type: 'Perimeter Breach',
      timestamp: Date.now(),
      status: 'active',
      description: `Tactical barrier crossing detected on ${camName}. AI anomaly detection flagged trajectory crossing border perimeter.`,
      location: camName,
      confidence: testConfidence,
      assignedUnit: 'Border Patrol Squad Alpha',
      audioTriggered: testConfidence >= confidenceThreshold,
      thresholdAtTime: confidenceThreshold,
    };

    // Trigger global screen flash strobe if High severity
    if (isHighSeverity || newAlert.severity === 'High') {
      triggerGlobalFlash();
    }

    if (testConfidence >= confidenceThreshold) {
      triggerIntrusionAudioAlert(newAlert);
      setAlerts((prev) => [newAlert, ...prev]);
      setSelectedAlertForModal(newAlert);
    } else {
      console.log(`[AI FILTER] Alert suppressed. Confidence (${testConfidence}%) below threshold (${confidenceThreshold}%).`);
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
          onOpenDemoMode={() => setIsDemoGuideOpen(true)}
        />

        {/* Dynamic Main Body by Current View */}
        <main className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-5">
          {currentView === 'dashboard' && (
            <>
              {/* Surveillance Intelligence AI Search (Phase 20) */}
              <IntelligenceSearch
                onOpenIncident={(incId) => {
                  setCurrentView('inspector');
                }}
                onSelectCamera={(cid) => {
                  setSelectedCameraId(cid);
                }}
                onHighlightCameras={(cids) => {
                  setHighlightedCameras(cids);
                }}
                onOpenBehaviorChain={() => {
                  setCurrentView('inspector');
                }}
                onNavigateToTimeline={() => {
                  setCurrentView('system-timeline');
                }}
                onOpenTargetJourney={(tid) => {
                  if (tid) setSelectedJourneyTrackId(tid);
                  setCurrentView('target-journey');
                }}
                onOpenThreatMap={(cid) => {
                  if (cid) setSelectedCameraId(cid);
                  setCurrentView('threat-map');
                }}
              />

              {/* 3. Top Metrics Row */}
              <KpiCards
                totalCameras={(telemetry as any)?.database?.totalCameras ?? matrixCameras.length}
                activeCameras={matrixCameras.filter((c) => c.status === 'Online').length}
                alertsToday={alerts.length}
                totalDetections={(telemetry as any)?.database?.totalEvents ? (telemetry as any).database.totalEvents.toLocaleString() : '4,892'}
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
                    highlightedCameraIds={highlightedCameras}
                    onSelectCameraForDetails={(cam) => {
                      setSelectedCameraId(String(cam.id));
                      const match = cameras.find((c) => c.id === String(cam.id)) || {
                        id: String(cam.id),
                        name: cam.name,
                        location: (cam as any).location || 'Border Sector',
                        status: cam.status as any,
                        imageUrl: cam.src,
                      };
                      setSelectedCameraForModal(match as any);
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

          {currentView === 'mission-control' && (
            <MissionControlView
              onNavigate={(view) => setCurrentView(view)}
              onOpenReports={() => setIsReportsModalOpen(true)}
              onOpenDemo={() => setIsDemoGuideOpen(true)}
            />
          )}

          {currentView === 'camera-fleet' && (
            <CameraFleetView
              onSelectCamera={(cid) => {
                setSelectedCameraId(cid);
                setCurrentView('dashboard');
              }}
            />
          )}

          {currentView === 'evidence-queue' && <EvidenceQueueView />}

          {currentView === 'system-timeline' && <SystemTimelineView />}

          {currentView === 'diagnostics' && <CameraHealthDiagnosticsView />}

          {currentView === 'cameras' && (
            <TacticalMatrixView
              cameras={matrixCameras}
              alerts={alerts}
              onUpdateCameraName={handleUpdateCameraName}
              onTriggerAlert={handleSimulateIntrusion}
              onSelectCameraForDetails={(cam) => {
                setSelectedCameraId(String(cam.id));
                const match = cameras.find((c) => c.id === String(cam.id)) || {
                  id: String(cam.id),
                  name: cam.name,
                  location: (cam as any).location || 'Border Sector',
                  status: cam.status as any,
                  imageUrl: cam.src,
                };
                setSelectedCameraForModal(match as any);
              }}
              confidenceThreshold={confidenceThreshold}
              onConfidenceThresholdChange={setConfidenceThreshold}
            />
          )}

          {currentView === 'inspector' && (
            <IncidentInspectorView
              onOpenThreatMap={(camCode) => {
                setSelectedCameraId(camCode.toLowerCase());
                setCurrentView('threat-map');
              }}
              onOpenTargetJourney={(tid) => {
                if (tid) setSelectedJourneyTrackId(tid);
                setCurrentView('target-journey');
              }}
            />
          )}

          {currentView === 'target-journey' && (
            <TargetJourneyView
              initialTrackId={selectedJourneyTrackId}
              onSelectCamera={(cid) => {
                setSelectedCameraId(cid);
                setCurrentView('dashboard');
              }}
              onOpenIncident={(incId) => {
                setCurrentView('inspector');
              }}
              onOpenThreatMap={(cid) => {
                if (cid) setSelectedCameraId(cid);
                setCurrentView('threat-map');
              }}
            />
          )}

          {currentView === 'threat-map' && (
            <ThreatHeatmapView
              initialCameraId={selectedCameraId}
              targetHighlightCameras={heatmapHighlightCameras}
              onSelectCamera={(cid) => {
                setSelectedCameraId(cid);
                setCurrentView('dashboard');
              }}
              onOpenIncident={(incId) => {
                setCurrentView('inspector');
              }}
              onOpenTargetJourney={(tid) => {
                if (tid) setSelectedJourneyTrackId(tid);
                setCurrentView('target-journey');
              }}
              onNavigateToAnalytics={() => {
                setCurrentView('analytics');
              }}
            />
          )}

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

          {currentView === 'calibration' && <CameraCalibrationView />}

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

      {/* Deep Inspection Camera Node Modal */}
      {selectedCameraForModal && (
        <CameraDetailModal
          camera={selectedCameraForModal}
          onClose={() => setSelectedCameraForModal(null)}
        />
      )}

      {/* Reports Export Modal */}
      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
      />

      {/* SIH Judge Presentation Guide Modal */}
      <SihDemoGuideModal
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onNavigateToView={(v) => setCurrentView(v)}
      />
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

