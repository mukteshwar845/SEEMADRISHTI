import { Router, Request, Response } from 'express';
import { agentOrchestrator } from '../services/agentOrchestrator';

export const agentsRouter = Router();

// GET /api/v1/agents/status -> Get all agents telemetry & states
agentsRouter.get('/status', (req: Request, res: Response) => {
  try {
    const agents = agentOrchestrator.getAgents();
    const currentPlan = agentOrchestrator.getCurrentPlan();
    res.json({
      success: true,
      agents,
      currentPlan,
      orchestrator: {
        codename: 'SEEMA-ORCHESTRATOR-v4',
        mode: 'AUTONOMOUS_DELIBERATION',
        activeAgentsCount: agents.length,
        consensusStatus: 'CONSENSUS_REACHED',
        globalNeuralLoad: Math.round(agents.reduce((acc, a) => acc + a.neuralLoad, 0) / agents.length),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/agents/deliberate -> Trigger multi-agent deliberation on a scenario
agentsRouter.post('/deliberate', (req: Request, res: Response) => {
  try {
    const { scenario } = req.body;
    const plan = agentOrchestrator.deliberateScenario(scenario || 'perimeter_scaling');
    res.json({
      success: true,
      plan,
      agents: agentOrchestrator.getAgents(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/agents/execute -> Execute a consensus countermeasure
agentsRouter.post('/execute', (req: Request, res: Response) => {
  try {
    const { actionId } = req.body;
    const plan = agentOrchestrator.executeCountermeasure(actionId);
    res.json({
      success: true,
      actionId,
      status: 'EXECUTED',
      plan,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/agents/jobs -> Get active and completed parallel jobs
agentsRouter.get('/jobs', (req: Request, res: Response) => {
  try {
    const jobs = agentOrchestrator.getActiveJobs();
    res.json({
      success: true,
      jobs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/agents/jobs/dispatch -> Dispatch parallel orchestration job across 4 agents
agentsRouter.post('/jobs/dispatch', (req: Request, res: Response) => {
  try {
    const { jobKey, query } = req.body;
    const target = jobKey || query || 'perimeter_sweep_9cam';
    const job = agentOrchestrator.orchestrateParallelJob(target);
    res.json({
      success: true,
      job,
      agents: agentOrchestrator.getAgents(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/agents/copilot -> Multi-agent interactive tactical reasoning chat
agentsRouter.post('/copilot', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    const response = await agentOrchestrator.processCopilotQuery(query);
    res.json({
      success: true,
      ...response,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
