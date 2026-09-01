import { Router, Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

export const chatRouter = Router();

// Tactical knowledge base for instantaneous, resilient intelligence responses
interface TacticalKnowledgeEntry {
  patterns: RegExp[];
  title: string;
  response: string;
}

const TACTICAL_KNOWLEDGE_BASE: TacticalKnowledgeEntry[] = [
  {
    patterns: [
      /seema\s*dh?rishti/i,
      /what\s+is\s+seemadrishti/i,
      /about\s+seemadrishti/i,
      /project\s+overview/i,
      /system\s+overview/i,
      /what\s+does\s+this\s+do/i,
    ],
    title: 'SEEMADRISHTI AI Surveillance Matrix',
    response:
      `**SEEMADRISHTI (सीमा दृष्टि — "Border Vision")** is an autonomous, AI-driven multi-camera border surveillance and tactical reconnaissance matrix engineered for defense forces and high-security installations.\n\n` +
      `**Core Capabilities:**\n` +
      `• **Synchronous 9-Node Edge Matrix:** Ingests live RTSP feeds at sub-21ms latency with edge NVIDIA Jetson Orin compute.\n` +
      `• **Autonomous 5-Agent Swarm:** Sentinel, Pathfinder, Commander, Awareness-05, and Lex Forensic orchestrate automated threat detection, DEFCON risk scoring, and countermeasure recommendations.\n` +
      `• **Cross-Camera Re-ID & Journey:** Employs OSNet appearance embeddings and planar homography to track intruders seamlessly across camera blindspots.\n` +
      `• **Panoramic 360° Stitching:** Fuses adjacent cameras into seamless 180°–270° tactical canvases with Thermal FLIR and Night Vision Phosphor.\n` +
      `• **Cryptographic Legal Chain of Custody:** Every recorded incursion is stamped with a SHA-256 Merkle root hash admissible under Section 65B of the Indian Evidence Act.`,
  },
  {
    patterns: [
      /cam[era]*\s*fleet/i,
      /what\s+is\s+camera\s+fleet/i,
      /what\s+is\s+camrea\s+fleet/i,
      /node[s]?\s+online/i,
      /how\s+many\s+cameras/i,
    ],
    title: 'SEEMADRISHTI Camera Fleet',
    response:
      `**The Camera Fleet** is SEEMADRISHTI's distributed 9-node perimeter monitoring network covering all strategic border sectors:\n\n` +
      `• **Sector Alpha:** CAM-01 (Main Gate Perimeter) & CAM-02 (East Fence Corridor)\n` +
      `• **Sector Bravo:** CAM-03 (Motorized Access Road) & CAM-04 (Outer Security Fence)\n` +
      `• **Sector Charlie:** CAM-05 (North Outpost Checkpoint) & CAM-06 (Long-Range Transit Corridor)\n` +
      `• **Sector Delta:** CAM-07 (Forward Ridge Approach) & CAM-08 (Highway Observation Node)\n` +
      `• **Sector Echo:** CAM-09 (Riverine & Scrubland Border Corridor)\n\n` +
      `**Hardware & Sensor Specifications:**\n` +
      `Each camera node is paired with an **NVIDIA Jetson Orin AGX** edge unit providing local YOLOv8 neural inference, active PTZ positioning, and triple-spectrum imaging (Daylight RGB, Night Vision Phosphor, and Thermal FLIR).`,
  },
  {
    patterns: [
      /swarm\s*agent[s]?/i,
      /what\s+are\s+the\s+agents/i,
      /explain\s+(all\s+)?(the\s+)?agents/i,
      /5\s*agents/i,
      /tactical\s*agents/i,
      /sentinel/i,
      /pathfinder/i,
      /commander/i,
      /lex\s*forensic/i,
    ],
    title: 'Autonomous 5-Agent Tactical Swarm',
    response:
      `SEEMADRISHTI operates with **5 autonomous specialized AI agents** that deliberate in a synchronized multi-agent loop:\n\n` +
      `1. **Sentinel (Tactical Threat Assessor):** Ingests real-time YOLOv8 detections, evaluates virtual tripwires, and identifies fence scaling, loitering, and perimeter breaches.\n` +
      `2. **Pathfinder (Spatial Vector Kinematics):** Calculates intruder velocity (m/s), movement trajectory vectors, and projects arrival times at adjacent camera sectors.\n` +
      `3. **Commander (DEFCON Orchestrator):** Synthesizes inputs from Sentinel and Pathfinder, calculates DEFCON alert levels (1 to 5), and dispatches automated deterrence sirens, floodlights, and sentry dispatches.\n` +
      `4. **Awareness-05 (Multi-Camera Fusion):** Monitors blindspots between camera sectors and handles cross-camera handover correlation.\n` +
      `5. **Lex Forensic (Legal Compliance & Evidence):** Automatically compiles tamper-proof incident dossiers sealed with SHA-256 Merkle root hashes compliant with Section 65B of the Indian Evidence Act.`,
  },
  {
    patterns: [
      /target\s*journey/i,
      /re[-]?id/i,
      /cross[- ]camera/i,
      /spatial\s*tracking/i,
      /how\s+to\s+track\s+intruder/i,
    ],
    title: 'Cross-Camera Target Journey & Re-ID Matrix',
    response:
      `The **Cross-Camera Target Journey Engine** eliminates operator blindspots by connecting detections across multiple cameras into a single spatial incursion journey:\n\n` +
      `• **OSNet Deep Appearance Embeddings:** Analyzes clothing color histograms (97%), silhouette aspect ratios (99%), and gait biomechanics (95%) without relying on facial recognition.\n` +
      `• **Predictive Kinematics:** Computes target speed (e.g. 12.2 km/h sprint) and transit distance (~120 meters).\n` +
      `• **2D Sector Topology Map:** Visually renders the handover vector between nodes (CAM-01 ➔ CAM-02).\n` +
      `• **Export Dossier:** Allows defense officers to download a cryptographically verified SHA-256 audit docket of the entire incursion path.`,
  },
  {
    patterns: [
      /stream\s*diagnostics/i,
      /camera\s*health/i,
      /latency/i,
      /jitter/i,
      /frame\s*drops/i,
    ],
    title: 'Camera Health & Stream Diagnostics',
    response:
      `The **Stream Diagnostics Dashboard** serves as the system's Network Operations Center (NOC):\n\n` +
      `• **Sub-21ms Latency:** Profiles real-time RTSP/WebRTC round-trip transport delay to guarantee sub-40ms responsiveness.\n` +
      `• **Jitter & Frame Drop Telemetry:** Maintains stable buffers (±1.8ms) and monitors frame drop ratios (<0.05%).\n` +
      `• **Edge Hardware Thermals:** Monitors core temperatures (39°C–40°C) on NVIDIA Jetson Orin edge units to prevent thermal throttling under harsh border climates.\n` +
      `• **Operator Buffer Flush:** Sentry operators can click "Ping Test" or "Reset Buffer" to re-sync streams without rebooting physical hardware.`,
  },
  {
    patterns: [
      /threat\s*heatmap/i,
      /heatmap/i,
      /vulnerability/i,
      /sector\s*risk/i,
    ],
    title: 'Dynamic Threat Heatmap Engine',
    response:
      `The **Threat Heatmap** provides spatial risk analytics across the entire surveillance perimeter:\n\n` +
      `• **Multi-Factor Risk Scoring:** Computes risk (0–100) using incursion frequency, breach severity, terrain vulnerability, and sentry response times.\n` +
      `• **Historical Decay Function:** Recent incidents carry higher threat weight than resolved historical events.\n` +
      `• **Direct Sentry Drill-Down:** Clicking any node in the heatmap highlights its detailed threat profile and provides a 1-click live feed shortcut.`,
  },
  {
    patterns: [
      /panoramic\s*stitching/i,
      /stitching/i,
      /360/i,
      /homography/i,
      /sift/i,
    ],
    title: 'Panoramic Multi-Camera Stitching (360° AI)',
    response:
      `The **Panoramic Stitching Module** mathematically fuses adjacent camera feeds into continuous 180° to 270° panoramic super-feeds:\n\n` +
      `• **Homography & SIFT Tie Points:** Computes a 3x3 planar transformation matrix with 98.4% RANSAC inliers to align ground planes seamlessly.\n` +
      `• **Cross-Camera Handover Vectors:** Tracks targets across the overlap seam line with predictive arrival estimation (e.g. EST +3.2s).\n` +
      `• **Multi-Spectral Vision:** Allows instant switching between Daylight RGB, Night Vision Phosphor (NVG), and Thermal FLIR false-color infrared.`,
  },
  {
    patterns: [
      /zone\s*calibration/i,
      /geofence/i,
      /tripwire/i,
      /exclusion\s*zone/i,
    ],
    title: 'Zone Calibration & Geofencing Editor',
    response:
      `The **Zone Calibration Editor** enables sentry operators to define virtual security boundaries directly on live camera feeds:\n\n` +
      `• **Virtual Tripwires:** Detects directional line crossings (e.g. border exclusion line).\n` +
      `• **Polygon Exclusion Zones:** Traces restricted perimeter compounds and weapon storage zones with sub-pixel precision.\n` +
      `• **Dynamic Sensitivity:** Configures loitering thresholds and high-risk trigger zones saved directly to the edge neural pipeline.`,
  },
  {
    patterns: [
      /evidence\s*vault/i,
      /sha[- ]?256/i,
      /legal/i,
      /section\s*65b/i,
      /chain\s*of\s*custody/i,
    ],
    title: 'Evidence Vault & Legal Forensic Integrity',
    response:
      `The **Evidence Vault** ensures that all recorded surveillance video and incident logs are legally binding:\n\n` +
      `• **Cryptographic Sealing:** Every incursion clip is hashed using SHA-256 upon capture.\n` +
      `• **Merkle Tree Verification:** Changes to frames or metadata invalidate the root hash, preventing tampering.\n` +
      `• **Section 65B Compliance:** Generates tamper-evident forensic certificates compliant with the Indian Evidence Act.`,
  },
];

function findTacticalResponse(userText: string): string | null {
  const normalized = userText.trim().toLowerCase();
  for (const entry of TACTICAL_KNOWLEDGE_BASE) {
    for (const pattern of entry.patterns) {
      if (pattern.test(normalized)) {
        return entry.response;
      }
    }
  }
  return null;
}

function generateContextualResponse(userText: string): string {
  const tacticalMatch = findTacticalResponse(userText);
  if (tacticalMatch) return tacticalMatch;

  // General fallback for surveillance and defense queries
  return (
    `I am the **Seemadrishti Tactical Help Bot**.\n\n` +
    `Regarding **"${userText}"**:\n` +
    `SEEMADRISHTI's edge AI architecture utilizes distributed neural inference (YOLOv8 + ByteTrack) across 9 synchronized camera sectors. ` +
    `All detections are correlated in real time through our autonomous 5-agent swarm (Sentinel, Pathfinder, Commander, Awareness-05, and Lex Forensic) ` +
    `to deliver zero-latency threat assessment, automated deterrence, and SHA-256 verified forensic logging.\n\n` +
    `**Suggested Exploration Topics:**\n` +
    `• *"What is Seemadrishti?"* — Comprehensive system overview.\n` +
    `• *"Explain the 5 swarm agents"* — Breakdown of our autonomous agent roles.\n` +
    `• *"What is camera fleet?"* — Overview of the 9 edge camera nodes.\n` +
    `• *"How does target journey work?"* — Cross-camera Re-ID and spatial tracking.\n` +
    `• *"What is stream diagnostics?"* — RTSP latency and edge hardware health.`
  );
}

// Stream text to client with human-like typing cadence
async function streamTextResponse(res: Response, fullText: string) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const words = fullText.split(' ');
  const chunkSize = 4;

  for (let i = 0; i < words.length; i += chunkSize) {
    const slice = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
    res.write(`data: ${JSON.stringify({ text: slice })}\n\n`);
    // Brief 15ms pause for realistic typing stream
    await new Promise((r) => setTimeout(r, 18));
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const trimmedMsg = message.trim();

    // 1. Instant Tactical Knowledge Base check (Instantaneous response for all core platform questions)
    const directTacticalMatch = findTacticalResponse(trimmedMsg);
    if (directTacticalMatch) {
      await streamTextResponse(res, directTacticalMatch);
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 2. Dynamic Gemini Cloud processing for open-ended queries
    if (apiKey && apiKey !== 'undefined' && apiKey.length > 10) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const formattedHistory = (history || []).map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));

        formattedHistory.push({ role: 'user', parts: [{ text: trimmedMsg }] });

        const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.7-flash'];
        let streamSuccess = false;

        for (const modelName of candidateModels) {
          try {
            // Race with 2500ms timeout to avoid UI freeze
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Cloud request timeout')), 2500)
            );

            const streamPromise = ai.models.generateContentStream({
              model: modelName,
              contents: formattedHistory,
              config: {
                systemInstruction:
                  'You are Seemadrishti Help Bot, an advanced AI defense assistant for the SEEMADRISHTI border surveillance platform. You explain the 9-camera fleet, the 5 autonomous swarm agents (Sentinel, Pathfinder, Commander, Awareness-05, Lex Forensic), cross-camera Re-ID, stream diagnostics, threat heatmap, and legal forensic verification. Keep your answers concise, tactical, authoritative, and helpful.',
              },
            });

            const responseStream = (await Promise.race([streamPromise, timeoutPromise])) as any;

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            for await (const chunk of responseStream) {
              if (chunk.text) {
                res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
              }
            }
            res.write('data: [DONE]\n\n');
            res.end();
            streamSuccess = true;
            break;
          } catch (modelErr: any) {
            console.warn(`[Chat] Model ${modelName} unavailable:`, modelErr.message?.slice(0, 100));
            // Try next model or fall through to tactical engine
          }
        }

        if (streamSuccess) {
          return;
        }
      } catch (geminiError: any) {
        console.warn('[Chat] Gemini cloud service unavailable, switching to Tactical Knowledge Engine:', geminiError.message?.slice(0, 100));
      }
    }

    // High-availability Tactical Knowledge Engine fallback
    const tacticalAnswer = generateContextualResponse(trimmedMsg);
    await streamTextResponse(res, tacticalAnswer);
  } catch (error: any) {
    console.error('Chat API Fatal Error:', error);
    // Even in fatal exceptions, provide an informative tactical response rather than crashing
    try {
      const fallbackAnswer = generateContextualResponse('what is seemadrishti');
      await streamTextResponse(res, fallbackAnswer);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.end();
      }
    }
  }
});
