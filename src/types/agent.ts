export interface TacticalAgentInfo {
  id: string;
  name: string;
  codename: string;
  role: string;
  specialization: string;
  status: 'IDLE' | 'ANALYZING' | 'DELIBERATING' | 'DISPATCHING' | 'ALERT';
  confidence: number;
  neuralLoad: number;
  latencyMs: number;
  color: string;
  avatarIcon: string;
  lastAction: string;
  actionCount: number;
}

export interface AgentDeliberationMessage {
  id: string;
  agentId: string;
  agentName: string;
  role: string;
  color: string;
  timestamp: string;
  thoughtTrace: string;
  evidencePoints: string[];
  recommendedAction: string;
  confidence: number;
  dissentingNote?: string;
}

export interface MultiAgentPlan {
  incidentId: string;
  scenarioTitle: string;
  consensusScore: number;
  threatLevel: 'NOMINAL' | 'ELEVATED' | 'CRITICAL' | 'DEFCON-1';
  targetTrackId: string;
  sector: string;
  summary: string;
  deliberationLog: AgentDeliberationMessage[];
  countermeasures: {
    id: string;
    label: string;
    status: 'READY' | 'EXECUTED' | 'STANDBY';
    assignedTo: string;
    priority: 'HIGH' | 'CRITICAL' | 'URGENT';
    actionPayload: string;
  }[];
}

export interface ParallelSubTask {
  id: string;
  agentId: string;
  agentName: string;
  role: string;
  color: string;
  taskTitle: string;
  details: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progressPercent: number;
  durationMs: number;
  outputSummary: string;
  artifactsProduced: string[];
}

export interface ParallelOrchestrationJob {
  id: string;
  title: string;
  category: 'PERIMETER_SWEEP' | 'TARGET_REID' | 'EMERGENCY_LOCKDOWN' | 'CALIBRATION' | 'CUSTOM_PIPELINE';
  status: 'PENDING' | 'DISPATCHING' | 'PROCESSING_PARALLEL' | 'COMPLETED';
  totalSerialEstMs: number;
  actualParallelMs: number;
  speedupFactor: number;
  throughputPerSec: number;
  subTasks: ParallelSubTask[];
  consensusOutput: string;
  timestamp: string;
}
