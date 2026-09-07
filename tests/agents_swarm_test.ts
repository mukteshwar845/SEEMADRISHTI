/**
 * SEEMADRISHTI AI — 5 AI Tactical Agents & Autonomous Swarm Verification Suite
 *
 * Verifies end-to-end functionality of all 5 tactical AI agents:
 * 1. Sentinel Vision (AGENT-01: Perception & Threat Triage)
 * 2. Pathfinder Re-ID (AGENT-02: Spatial Trajectory & Homography)
 * 3. Tactical Commander (AGENT-03: Rules of Engagement & Dispatch)
 * 4. Lex Forensic (AGENT-04: Cryptographic Chain-of-Custody & SHA-256)
 * 5. Situational Awareness (AGENT-05: Environmental & Strategic Context Fusion)
 *
 * Validates:
 * - 5-Agent Telemetry & Neural Load Status
 * - 5-Agent Deliberation & Consensus Formation
 * - 5-Way Parallel Swarm Workload Decomposition & Speedup
 * - Multi-Perspective Interactive Tactical Copilot Reasoning
 * - State-Machine Countermeasure Execution
 * - Autonomous Threat Simulation Lifecycle
 */

import http from 'http';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/app';

dotenv.config();

const PORT = 8016;
const JWT_SECRET = process.env.JWT_SECRET || 'seemadrishti_jwt_super_secret_production_key_9981';
const TEST_TOKEN = jwt.sign(
  {
    userId: 'usr-commander-01',
    callsign: 'VIKRAM-01',
    role: 'Commander',
    clearanceLevel: 'DEFCON-1',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

let server: http.Server;
let passed = 0;
let failed = 0;

function pass(testName: string, detail?: string) {
  passed++;
  console.log(`  [PASS] ${testName}${detail ? ` -> ${detail}` : ''}`);
}

function fail(testName: string, reason: string) {
  failed++;
  console.error(`  [FAIL] ${testName} -> ${reason}`);
}

function request(options: {
  method: string;
  path: string;
  body?: any;
  token?: string;
}): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: options.path,
        method: options.method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode || 0, data, headers: res.headers });
          } catch {
            resolve({ status: res.statusCode || 0, data: raw, headers: res.headers });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log(' SEEMADRISHTI AI — 5 AI Tactical Agents & Swarm Test Suite');
  console.log('===============================================================\n');

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[TEST-SERVER] Listening on http://127.0.0.1:${PORT}\n`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // Suite 1: 5 Tactical Agents Status & Telemetry
    // -------------------------------------------------------------------------
    console.log('[Suite 1: 5-Agent Status & Telemetry]');
    {
      const res = await request({
        method: 'GET',
        path: '/api/v1/agents/status',
        token: TEST_TOKEN,
      });

      if (res.status === 200 && res.data.success) {
        pass('GET /api/v1/agents/status responds with success', `Active: ${res.data.orchestrator.activeAgentsCount} agents`);
      } else {
        fail('GET /api/v1/agents/status', `Status: ${res.status}`);
      }

      const agents = res.data.agents;
      const expectedAgentIds = ['sentinel', 'pathfinder', 'commander', 'forensic', 'awareness'];

      if (Array.isArray(agents) && agents.length === 5) {
        pass('All 5 distinct tactical AI agents returned in fleet roster', `Count: ${agents.length}`);
      } else {
        fail('5 Tactical Agents count check', `Expected 5, got ${agents?.length}`);
      }

      const actualIds = agents.map((a: any) => a.id);
      const allPresent = expectedAgentIds.every((id) => actualIds.includes(id));
      if (allPresent) {
        pass('All 5 core agent identities verified (Sentinel, Pathfinder, Commander, Lex Forensic, Awareness)', actualIds.join(', '));
      } else {
        fail('Agent identities check', `Missing required agent IDs. Got: ${actualIds.join(', ')}`);
      }

      // Check telemetry metrics
      const validTelemetry = agents.every(
        (a: any) =>
          typeof a.confidence === 'number' &&
          a.confidence > 90 &&
          typeof a.neuralLoad === 'number' &&
          a.neuralLoad >= 0 &&
          typeof a.latencyMs === 'number' &&
          a.latencyMs > 0 &&
          typeof a.specialization === 'string' &&
          a.specialization.length > 10
      );

      if (validTelemetry) {
        pass('All 5 agents report truthful neural load, latency, and specialization metadata');
      } else {
        fail('Agent telemetry check', 'Invalid or missing telemetry attributes in agent roster');
      }
    }

    // -------------------------------------------------------------------------
    // Suite 2: 5-Agent Swarm Deliberation & Consensus Formation
    // -------------------------------------------------------------------------
    console.log('\n[Suite 2: 5-Agent Deliberation & Consensus Formation]');
    {
      const scenarios = ['perimeter_scaling', 'thermal_night', 'vehicle_checkpoint'];

      for (const sc of scenarios) {
        const res = await request({
          method: 'POST',
          path: '/api/v1/agents/deliberate',
          token: TEST_TOKEN,
          body: { scenario: sc },
        });

        if (res.status === 200 && res.data.success && res.data.plan) {
          const plan = res.data.plan;
          const log = plan.deliberationLog;
          const agentIdsInLog = log.map((msg: any) => msg.agentId);

          const hasAll5InDeliberation = ['sentinel', 'pathfinder', 'commander', 'forensic', 'awareness'].every(
            (id) => agentIdsInLog.includes(id)
          );

          if (hasAll5InDeliberation) {
            pass(
              `Deliberation on "${sc}" formed 5-agent consensus`,
              `Score: ${plan.consensusScore}%, Log Entries: ${log.length}, Agents: [${agentIdsInLog.join(', ')}]`
            );
          } else {
            fail(`5-agent deliberation on "${sc}"`, `Expected 5 agents in log, got: [${agentIdsInLog.join(', ')}]`);
          }

          if (plan.countermeasures && plan.countermeasures.length >= 2) {
            pass(`Scenario "${sc}" produced consensus countermeasures`, `Count: ${plan.countermeasures.length}`);
          } else {
            fail(`Countermeasures on "${sc}"`, 'Missing or insufficient countermeasures');
          }
        } else {
          fail(`POST /api/v1/agents/deliberate for "${sc}"`, `Status: ${res.status}`);
        }
      }
    }

    // -------------------------------------------------------------------------
    // Suite 3: Countermeasure Execution State-Machine
    // -------------------------------------------------------------------------
    console.log('\n[Suite 3: Countermeasure Execution State-Machine]');
    {
      // Ensure scenario is perimeter_scaling before executing cm-01
      await request({
        method: 'POST',
        path: '/api/v1/agents/deliberate',
        token: TEST_TOKEN,
        body: { scenario: 'perimeter_scaling' },
      });

      const res = await request({
        method: 'POST',
        path: '/api/v1/agents/execute',
        token: TEST_TOKEN,
        body: { actionId: 'cm-01' },
      });

      if (res.status === 200 && res.data.success && res.data.status === 'EXECUTED') {
        const updatedCm = res.data.plan.countermeasures.find((cm: any) => cm.id === 'cm-01');
        if (updatedCm && updatedCm.status === 'EXECUTED') {
          pass('Countermeasure cm-01 stateful execution verified', 'Status: EXECUTED');
        } else {
          fail('Countermeasure state verification', `Expected cm-01 EXECUTED, got ${updatedCm?.status}`);
        }
      } else {
        fail('POST /api/v1/agents/execute', `Status: ${res.status}`);
      }
    }

    // -------------------------------------------------------------------------
    // Suite 4: 5-Way Parallel Swarm Workload Decomposition
    // -------------------------------------------------------------------------
    console.log('\n[Suite 4: 5-Way Parallel Swarm Workload Decomposition]');
    {
      // Test preset job
      const resPreset = await request({
        method: 'POST',
        path: '/api/v1/agents/jobs/dispatch',
        token: TEST_TOKEN,
        body: { jobKey: 'perimeter_sweep_9cam' },
      });

      if (resPreset.status === 200 && resPreset.data.success && resPreset.data.job) {
        const job = resPreset.data.job;
        const subTasks = job.subTasks;
        const taskAgentIds = subTasks.map((st: any) => st.agentId);

        const hasAll5Tasks = ['sentinel', 'pathfinder', 'commander', 'forensic', 'awareness'].every((id) =>
          taskAgentIds.includes(id)
        );

        if (hasAll5Tasks && subTasks.length === 5) {
          pass(
            'Preset job "perimeter_sweep_9cam" decomposed across all 5 agents',
            `Parallel: ${job.actualParallelMs}ms vs Serial: ${job.totalSerialEstMs}ms (${job.speedupFactor}x speedup)`
          );
        } else {
          fail('5-Way preset job decomposition', `Expected 5 sub-tasks across 5 agents, got: [${taskAgentIds.join(', ')}]`);
        }
      } else {
        fail('POST /api/v1/agents/jobs/dispatch preset', `Status: ${resPreset.status}`);
      }

      // Test dynamic custom job
      const resCustom = await request({
        method: 'POST',
        path: '/api/v1/agents/jobs/dispatch',
        token: TEST_TOKEN,
        body: { query: 'Analyze riverine marshland sector for nighttime stealth crossing' },
      });

      if (resCustom.status === 200 && resCustom.data.success && resCustom.data.job) {
        const job = resCustom.data.job;
        const subTasks = job.subTasks;
        const taskAgentIds = subTasks.map((st: any) => st.agentId);

        const hasAll5Tasks = ['sentinel', 'pathfinder', 'commander', 'forensic', 'awareness'].every((id) =>
          taskAgentIds.includes(id)
        );

        if (hasAll5Tasks && subTasks.length === 5) {
          pass(
            'Dynamic custom instruction decomposed across all 5 agents',
            `Speedup: ${job.speedupFactor}x, SubTasks: ${subTasks.length}`
          );
        } else {
          fail('Dynamic 5-agent job decomposition', `Expected 5 sub-tasks, got: [${taskAgentIds.join(', ')}]`);
        }
      } else {
        fail('POST /api/v1/agents/jobs/dispatch custom', `Status: ${resCustom.status}`);
      }
    }

    // -------------------------------------------------------------------------
    // Suite 5: Multi-Agent Interactive Tactical Copilot Reasoning
    // -------------------------------------------------------------------------
    console.log('\n[Suite 5: Multi-Agent Interactive Tactical Copilot]');
    {
      const queries = [
        'What is the threat assessment on the fence breach?',
        'Analyze dense fog riverine marshland condition',
        'Check vehicle speed violation at Sector Charlie',
        'General swarm telemetry report',
      ];

      for (const q of queries) {
        const res = await request({
          method: 'POST',
          path: '/api/v1/agents/copilot',
          token: TEST_TOKEN,
          body: { query: q },
        });

        if (res.status === 200 && res.data.success && res.data.deliberations) {
          const deliberations = res.data.deliberations;
          const respondingAgents = deliberations.map((d: any) => d.agent);

          const hasAwareness = respondingAgents.includes('AWARENESS-AI');
          const hasAllAgents = ['SENTINEL-AI', 'PATHFINDER-AI', 'COMMANDER-AI', 'LEX-AUDIT-AI', 'AWARENESS-AI'].every(
            (a) => respondingAgents.includes(a)
          );

          if (hasAllAgents && deliberations.length === 5) {
            pass(
              `Copilot query "${q.slice(0, 32)}..." synthesized 5-agent consensus (${res.data.consensusScore}%)`,
              `Perspectives: [${respondingAgents.join(', ')}]`
            );
          } else {
            fail(`5-agent copilot reasoning for "${q}"`, `Expected 5 agents including AWARENESS-AI, got: [${respondingAgents.join(', ')}]`);
          }
        } else {
          fail(`POST /api/v1/agents/copilot for "${q}"`, `Status: ${res.status}`);
        }
      }
    }

    // -------------------------------------------------------------------------
    // Suite 6: Autonomous Simulation Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n[Suite 6: Autonomous Simulation Lifecycle]');
    {
      const resStart = await request({
        method: 'POST',
        path: '/api/v1/agents/simulation/start',
        token: TEST_TOKEN,
      });

      if (resStart.status === 200 && resStart.data.success && resStart.data.running) {
        pass('Autonomous threat simulation started successfully', `Scenario: ${resStart.data.scenarioName}`);
      } else {
        fail('POST /api/v1/agents/simulation/start', `Status: ${resStart.status}`);
      }

      const resStatus = await request({
        method: 'GET',
        path: '/api/v1/agents/simulation/status',
        token: TEST_TOKEN,
      });

      if (resStatus.status === 200 && resStatus.data.success && resStatus.data.running) {
        pass('Simulation status confirms active execution', `Scenario: ${resStatus.data.scenarioName}, Steps: ${resStatus.data.totalSteps}`);
      } else {
        fail('GET /api/v1/agents/simulation/status', `Status: ${resStatus.status}`);
      }

      const resStop = await request({
        method: 'POST',
        path: '/api/v1/agents/simulation/stop',
        token: TEST_TOKEN,
      });

      if (resStop.status === 200 && resStop.data.success && !resStop.data.running) {
        pass('Autonomous threat simulation stopped cleanly', 'State: IDLE (running: false)');
      } else {
        fail('POST /api/v1/agents/simulation/stop', `Status: ${resStop.status}`);
      }
    }

    console.log('\n===============================================================');
    console.log(` RESULTS: ${passed}/${passed + failed} PASSED (${failed} FAILED)`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
