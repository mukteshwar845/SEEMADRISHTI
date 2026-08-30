import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/errorHandler';

export const searchRouter = Router();

// In-memory lightweight search history
interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  result_count: number;
}

let searchHistory: SearchHistoryItem[] = [
  { id: 'sh-1', query: 'Show critical incidents in the last 10 minutes', timestamp: new Date(Date.now() - 300000).toISOString(), result_count: 3 },
  { id: 'sh-2', query: 'Show person #27 journey', timestamp: new Date(Date.now() - 600000).toISOString(), result_count: 1 },
  { id: 'sh-3', query: 'Which cameras had restricted breaches?', timestamp: new Date(Date.now() - 900000).toISOString(), result_count: 9 },
  { id: 'sh-4', query: 'Show tripwire crossings', timestamp: new Date(Date.now() - 1200000).toISOString(), result_count: 5 },
];

const KNOWN_CAMERAS = ['cam-01', 'cam-02', 'cam-03', 'cam-04', 'cam-05', 'cam-06', 'cam-07', 'cam-08', 'cam-09'];

// Deterministic Natural Language Parser for Surveillance
function parseQuery(query: string) {
  const raw = query.trim();
  const q = raw.toLowerCase();

  const filters: any = {
    query: raw,
    entity: 'all',
    event_type: null,
    camera_ids: [] as string[],
    track_id: null as number | null,
    incident_id: null as string | null,
    risk_level: null as string | null,
    time_range: null as { value: number; unit: string } | null,
    status: null as string | null,
    class_name: null as string | null,
    direction: null as string | null,
    behavior_pattern: null as string | null,
    chips: [] as string[],
  };

  // 1. Camera extraction
  const camRegex = /\b(cam[-\s]?0?([1-9]|1[0-9]|20))\b/gi;
  let camMatch;
  const foundCams = new Set<string>();
  while ((camMatch = camRegex.exec(q)) !== null) {
    const num = parseInt(camMatch[2], 10);
    const cid = `cam-${String(num).padStart(2, '0')}`;
    foundCams.add(cid);
  }
  if (foundCams.size > 0) {
    filters.camera_ids = Array.from(foundCams).sort();
    filters.camera_ids.forEach((c: string) => filters.chips.push(c.toUpperCase()));
  }

  // 2. Track / Target extraction
  const trackMatch = /\b(?:person|track|target|id|trk|object)[-\s#]*([0-9]{1,6})\b/i.exec(q);
  if (trackMatch) {
    const tid = parseInt(trackMatch[1], 10);
    if (!isNaN(tid)) {
      filters.track_id = tid;
      filters.chips.push(`TARGET #${tid}`);
    }
  }

  // 3. Incident ID extraction
  const incMatch = /\b(inc[-\s]?[0-9]{3,8})\b/i.exec(q);
  if (incMatch) {
    let inc = incMatch[1].replace(/\s/g, '').toUpperCase();
    if (!inc.startsWith('INC-')) {
      const numPart = inc.replace(/[^0-9]/g, '');
      inc = `INC-${String(parseInt(numPart, 10)).padStart(6, '0')}`;
    }
    filters.incident_id = inc;
    filters.entity = 'incident';
    filters.chips.push(inc);
  }

  // 4. Journey intent
  if (['journey', 'where did', 'appear in', 'path', 'route', 'travel', 'movement path'].some((w) => q.includes(w))) {
    filters.entity = 'journey';
    filters.chips.push('JOURNEY');
  } else if (['highest risk', 'threat hotspot', 'hotspot', 'most breaches', 'highest threat'].some((w) => q.includes(w))) {
    filters.entity = 'hotspot';
    filters.chips.push('THREAT HOTSPOT');
  } else if (['corridor', 'corridors', 'high-risk corridor', 'high risk corridor'].some((w) => q.includes(w))) {
    filters.entity = 'corridor';
    filters.chips.push('THREAT CORRIDORS');
  }

  // 5. Entity intent (if not journey/hotspot/corridor)
  if (filters.entity === 'all') {
    if (['which camera', 'which cameras', 'cameras with', 'camera breakdown'].some((w) => q.includes(w))) {
      filters.entity = 'camera';
      filters.chips.push('CAMERA BREAKDOWN');
    } else if (['incident', 'incidents', 'dossier', 'breach incident'].some((w) => q.includes(w))) {
      filters.entity = 'incident';
      filters.chips.push('INCIDENTS');
    } else if (['event', 'events', 'crossing', 'breach', 'intrusion', 'loitering', 're-entry'].some((w) => q.includes(w))) {
      filters.entity = 'event';
      filters.chips.push('EVENTS');
    }
  }

  // 6. Risk level extraction
  if (q.includes('critical')) {
    filters.risk_level = 'CRITICAL';
    filters.chips.push('CRITICAL');
  } else if (q.includes('high')) {
    filters.risk_level = 'HIGH';
    filters.chips.push('HIGH RISK');
  } else if (q.includes('medium')) {
    filters.risk_level = 'MEDIUM';
    filters.chips.push('MEDIUM RISK');
  } else if (q.includes('low')) {
    filters.risk_level = 'LOW';
    filters.chips.push('LOW RISK');
  }

  // 7. Event type extraction
  if (['tripwire', 'line crossing', 'crossed', 'virtual tripwire'].some((w) => q.includes(w))) {
    filters.event_type = 'TRIPWIRE_CROSSING';
    filters.chips.push('TRIPWIRE');
  } else if (['restricted', 'zone breach', 'polygon breach', 'restricted area', 'perimeter entry', 'unauthorized zone'].some((w) => q.includes(w))) {
    filters.event_type = 'RESTRICTED_ZONE_ENTRY';
    filters.chips.push('RESTRICTED ZONE');
  } else if (['loitering', 'loiter', 'dwell', 'prolonged dwell'].some((w) => q.includes(w))) {
    filters.event_type = 'LOITERING';
    filters.chips.push('LOITERING');
  } else if (['re-entry', 'reentry', 'repeated entry'].some((w) => q.includes(w))) {
    filters.event_type = 'RE_ENTRY';
    filters.chips.push('RE-ENTRY');
  } else if (['handover', 'cross camera', 'cross-camera'].some((w) => q.includes(w))) {
    filters.event_type = 'CROSS_CAMERA_HANDOVER';
    filters.chips.push('HANDOVER');
  }

  // 8. Time range extraction
  const minMatch = /\b(?:last|past)\s*(\d+)\s*(?:min|minute|minutes)\b/i.exec(q);
  const hrMatch = /\b(?:last|past)\s*(\d+)\s*(?:hr|hour|hours)\b/i.exec(q);
  const dayMatch = /\b(?:last|past)\s*(\d+)\s*(?:day|days)\b/i.exec(q);

  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    filters.time_range = { value: mins, unit: 'minutes' };
    filters.chips.push(`LAST ${mins} MIN`);
  } else if (hrMatch) {
    const hrs = parseInt(hrMatch[1], 10);
    filters.time_range = { value: hrs, unit: 'hours' };
    filters.chips.push(hrs === 1 ? 'LAST 1 HR' : `LAST ${hrs} HRS`);
  } else if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    filters.time_range = { value: days, unit: 'days' };
    filters.chips.push(`LAST ${days} DAYS`);
  } else if (q.includes('last hour') || q.includes('past hour')) {
    filters.time_range = { value: 1, unit: 'hours' };
    filters.chips.push('LAST 1 HR');
  } else if (q.includes('today')) {
    filters.time_range = { value: 24, unit: 'hours' };
    filters.chips.push('TODAY');
  }

  // 9. Status
  if (['unresolved', 'open', 'active', 'pending', 'unacknowledged'].some((w) => q.includes(w))) {
    filters.status = 'unresolved';
    filters.chips.push('UNRESOLVED');
  } else if (['resolved', 'closed', 'acknowledged'].some((w) => q.includes(w))) {
    filters.status = 'resolved';
    filters.chips.push('RESOLVED');
  }

  // 10. Class name
  if (['person', 'people', 'pedestrian', 'human', 'individual'].some((w) => q.includes(w))) {
    filters.class_name = 'person';
    filters.chips.push('PERSON');
  } else if (['vehicle', 'vehicles', 'car', 'cars', 'truck', 'trucks'].some((w) => q.includes(w))) {
    filters.class_name = q.includes('truck') ? 'truck' : q.includes('car') ? 'car' : 'vehicle';
    filters.chips.push(filters.class_name.toUpperCase());
  }

  // 11. Direction
  if (['inbound', 'entering', 'entry'].some((w) => q.includes(w))) {
    filters.direction = 'IN';
    filters.chips.push('INBOUND');
  } else if (['outbound', 'exiting', 'exit'].some((w) => q.includes(w))) {
    filters.direction = 'OUT';
    filters.chips.push('OUTBOUND');
  } else if (q.includes('from east') || q.includes('east')) {
    filters.direction = 'EAST';
    filters.chips.push('FROM EAST');
  } else if (q.includes('from west') || q.includes('west')) {
    filters.direction = 'WEST';
    filters.chips.push('FROM WEST');
  }

  // 12. Behavior patterns
  if (['reconnaissance', 'recon', 'scouting'].some((w) => q.includes(w))) {
    filters.behavior_pattern = 'POSSIBLE_RECONNAISSANCE';
    filters.chips.push('RECONNAISSANCE');
  } else if (['suspicious movement', 'suspicious movements', 'suspicious person', 'suspicious'].some((w) => q.includes(w))) {
    filters.behavior_pattern = 'SUSPICIOUS';
    filters.chips.push('SUSPICIOUS');
  } else if (['repeated re-entry', 'repeated reentry'].some((w) => q.includes(w))) {
    filters.behavior_pattern = 'REPEATED_REENTRY';
    filters.chips.push('REPEATED RE-ENTRY');
  } else if (['persistent loitering', 'prolonged loitering'].some((w) => q.includes(w))) {
    filters.behavior_pattern = 'PERSISTENT_LOITERING';
    filters.chips.push('PERSISTENT LOITERING');
  }

  // Deduplicate chips
  filters.chips = Array.from(new Set(filters.chips));

  return filters;
}

// POST /api/intelligence/search - Execute natural-language intelligence search
searchRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const queryStr = req.body?.query || req.query?.q || '';
    if (!queryStr || typeof queryStr !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing query parameter',
      });
    }

    const filters = parseQuery(queryStr);

    // Track in search history
    searchHistory = [
      {
        id: `sh-${Date.now()}`,
        query: queryStr,
        timestamp: new Date().toISOString(),
        result_count: 0,
      },
      ...searchHistory.filter((h) => h.query.toLowerCase() !== queryStr.toLowerCase()).slice(0, 19),
    ];

    // Case 1: Target Journey Search
    if (filters.entity === 'journey' || (filters.track_id !== null && queryStr.toLowerCase().includes('journey'))) {
      const targetId = filters.track_id;
      if (targetId === null) {
        return res.json({
          success: true,
          query: queryStr,
          filters,
          chips: filters.chips,
          result_count: 0,
          results: [],
          journey: null,
          insufficient_data: true,
          message: 'INSUFFICIENT DATA: Target track ID required for journey reconstruction.',
        });
      }

      // Query real events and behavior chains for this target
      const chainRow = db.prepare(
        'SELECT * FROM behavior_chains WHERE track_id = ? ORDER BY updated_at DESC LIMIT 1'
      ).get(targetId) as any;

      const eventRows = db.prepare(
        'SELECT * FROM events WHERE object_id = ? OR object_id = ? OR metadata LIKE ? ORDER BY timestamp ASC LIMIT 50'
      ).all(String(targetId), `TRK-${targetId}`, `%"track_id":${targetId}%`) as any[];

      const incidentsRows = db.prepare(
        'SELECT * FROM incidents WHERE track_id = ? OR track_id = ? ORDER BY started_at ASC LIMIT 10'
      ).all(String(targetId), `TRK-${targetId}`) as any[];

      const camerasSeen = new Set<string>();
      const orderedSteps: any[] = [];

      if (chainRow) {
        let chainEvents = [];
        try {
          chainEvents = typeof chainRow.events === 'string' ? JSON.parse(chainRow.events) : (chainRow.events || []);
        } catch {
          chainEvents = [];
        }

        let chainCams = [chainRow.camera_id];
        try {
          chainCams = typeof chainRow.camera_ids === 'string' ? JSON.parse(chainRow.camera_ids) : [chainRow.camera_id];
        } catch {}

        chainCams.forEach((c: string) => camerasSeen.add(c.toLowerCase()));

        chainEvents.forEach((ev: any) => {
          const cam = (ev.camera_id || chainRow.camera_id).toLowerCase();
          camerasSeen.add(cam);
          orderedSteps.push({
            timestamp: ev.timestamp,
            camera_id: cam,
            event_type: ev.event_type,
            description: `${ev.event_type.replace(/_/g, ' ')} on ${cam.toUpperCase()}`,
            metadata: ev.metadata || {},
          });
        });
      }

      // Also incorporate database events
      eventRows.forEach((er: any) => {
        const cam = er.camera_id.toLowerCase();
        camerasSeen.add(cam);
        const epoch = new Date(er.timestamp).getTime() / 1000;
        orderedSteps.push({
          timestamp: epoch,
          camera_id: cam,
          event_type: er.event_type,
          description: `${er.event_type} (${er.severity}) on ${cam.toUpperCase()}`,
          metadata: er.metadata ? JSON.parse(er.metadata) : {},
        });
      });

      // If no recorded events at all
      if (orderedSteps.length === 0) {
        return res.json({
          success: true,
          query: queryStr,
          filters,
          chips: filters.chips,
          result_count: 0,
          results: [],
          journey: null,
          insufficient_data: true,
          message: `INSUFFICIENT DATA: Target #${targetId} not found in recent surveillance records.`,
        });
      }

      orderedSteps.sort((a, b) => a.timestamp - b.timestamp);

      const hasCrossCam = camerasSeen.size > 1;
      const hasHandover = orderedSteps.some((s) => s.event_type === 'CROSS_CAMERA_HANDOVER');
      const isComplete = hasCrossCam && hasHandover;

      const journeyResult = {
        type: 'journey',
        track_id: targetId,
        class_name: chainRow?.class_name || 'person',
        camera_path: Array.from(camerasSeen),
        steps: orderedSteps,
        step_count: orderedSteps.length,
        correlation_id: chainRow?.correlation_id || null,
        is_complete: isComplete,
        status_note: isComplete
          ? 'Complete cross-camera journey verified via corridor handover records.'
          : camerasSeen.size === 1
          ? 'Single-sector surveillance journey recorded.'
          : 'INSUFFICIENT DATA FOR COMPLETE JOURNEY: Corridors traversed without confirmed handover record.',
      };

      if (searchHistory[0]) searchHistory[0].result_count = 1;

      return res.json({
        success: true,
        query: queryStr,
        filters,
        chips: filters.chips,
        result_count: 1,
        results: [journeyResult],
        journey: journeyResult,
        insufficient_data: false,
        message: `Target #${targetId} journey assembled across ${camerasSeen.size} camera node(s).`,
      });
    }

    // Case 2: Camera Breakdown Search
    if (filters.entity === 'camera' || ['which camera', 'which cameras'].some((w) => queryStr.toLowerCase().includes(w))) {
      const cameraCounts: Record<string, number> = {};
      KNOWN_CAMERAS.forEach((cam) => {
        cameraCounts[cam] = 0;
      });

      let incidentQuery = 'SELECT camera_id, COUNT(*) as cnt FROM incidents WHERE 1=1';
      const incParams: any[] = [];
      if (filters.event_type) {
        incidentQuery += ' AND event_type LIKE ?';
        incParams.push(`%${filters.event_type}%`);
      }
      incidentQuery += ' GROUP BY camera_id';

      const incCounts = db.prepare(incidentQuery).all(...incParams) as any[];
      incCounts.forEach((r: any) => {
        const c = r.camera_id.toLowerCase();
        if (cameraCounts[c] !== undefined) {
          cameraCounts[c] += r.cnt;
        }
      });

      // Also count from events table
      let eventQuery = 'SELECT camera_id, COUNT(*) as cnt FROM events WHERE 1=1';
      const evParams: any[] = [];
      if (filters.event_type) {
        eventQuery += ' AND event_type LIKE ?';
        evParams.push(`%${filters.event_type}%`);
      }
      eventQuery += ' GROUP BY camera_id';

      const evCounts = db.prepare(eventQuery).all(...evParams) as any[];
      evCounts.forEach((r: any) => {
        const c = r.camera_id.toLowerCase();
        if (cameraCounts[c] !== undefined) {
          cameraCounts[c] = Math.max(cameraCounts[c], r.cnt);
        }
      });

      const cameraResults = KNOWN_CAMERAS.map((cam) => ({
        type: 'camera_stat',
        camera_id: cam,
        camera_name: cam.toUpperCase(),
        breach_count: cameraCounts[cam],
        event_type: filters.event_type || 'ALL_BREACHES',
        has_activity: cameraCounts[cam] > 0,
      })).sort((a, b) => b.breach_count - a.breach_count);

      if (searchHistory[0]) searchHistory[0].result_count = cameraResults.length;

      return res.json({
        success: true,
        query: queryStr,
        filters,
        chips: filters.chips,
        result_count: cameraResults.length,
        results: cameraResults,
        insufficient_data: false,
        message: `Camera breach breakdown computed across ${cameraResults.length} operational CCTV nodes.`,
      });
    }

    // Case 3: Structured Record Search (Incidents / Events / Behavior Chains)
    const results: any[] = [];

    // Query Incidents Table
    let sql = 'SELECT * FROM incidents WHERE 1=1';
    const params: any[] = [];

    if (filters.camera_ids.length > 0) {
      sql += ` AND camera_id IN (${filters.camera_ids.map(() => '?').join(',')})`;
      params.push(...filters.camera_ids);
    }

    if (filters.incident_id) {
      sql += ' AND id = ?';
      params.push(filters.incident_id);
    }

    if (filters.track_id !== null) {
      sql += ' AND (track_id = ? OR track_id = ?)';
      params.push(String(filters.track_id), `TRK-${filters.track_id}`);
    }

    if (filters.risk_level) {
      sql += ' AND risk_level = ?';
      params.push(filters.risk_level);
    }

    if (filters.event_type) {
      sql += ' AND event_type LIKE ?';
      params.push(`%${filters.event_type}%`);
    }

    if (filters.status === 'unresolved') {
      sql += ' AND acknowledged = 0';
    } else if (filters.status === 'resolved') {
      sql += ' AND acknowledged = 1';
    }

    if (filters.time_range) {
      let seconds = filters.time_range.value * 60;
      if (filters.time_range.unit === 'hours') seconds *= 60;
      if (filters.time_range.unit === 'days') seconds *= 86400;
      const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
      sql += ' AND started_at >= ?';
      params.push(cutoff);
    }

    sql += ' ORDER BY started_at DESC LIMIT 50';

    const incidentRows = db.prepare(sql).all(...params) as any[];
    incidentRows.forEach((r: any) => {
      results.push({
        type: 'incident',
        incident_id: r.id,
        camera_id: r.camera_id.toLowerCase(),
        track_id: r.track_id ? parseInt(String(r.track_id).replace(/\D/g, ''), 10) || 1 : 1,
        class_name: r.class_name || 'person',
        event_type: r.event_type,
        risk_level: r.risk_level,
        risk_score: r.risk_score,
        zone_name: r.zone_name || 'Restricted Zone',
        timestamp: r.started_at,
        timestamp_epoch: new Date(r.started_at).getTime() / 1000,
        acknowledged: Boolean(r.acknowledged),
        evidence_path: r.evidence_path,
        evidence_status: r.evidence_status || 'ready',
      });
    });

    // If no incidents found, also query events table for broad matches
    if (results.length === 0 && filters.event_type) {
      let evSql = 'SELECT * FROM events WHERE event_type LIKE ?';
      const evParams = [`%${filters.event_type}%`];
      if (filters.camera_ids.length > 0) {
        evSql += ` AND camera_id IN (${filters.camera_ids.map(() => '?').join(',')})`;
        evParams.push(...filters.camera_ids);
      }
      evSql += ' ORDER BY timestamp DESC LIMIT 30';

      const evRows = db.prepare(evSql).all(...evParams) as any[];
      evRows.forEach((er: any) => {
        results.push({
          type: 'event',
          event_id: er.id,
          camera_id: er.camera_id.toLowerCase(),
          track_id: er.object_id ? parseInt(String(er.object_id).replace(/\D/g, ''), 10) || 1 : 1,
          event_type: er.event_type,
          severity: er.severity,
          timestamp: er.timestamp,
          timestamp_epoch: new Date(er.timestamp).getTime() / 1000,
          metadata: er.metadata ? JSON.parse(er.metadata) : {},
        });
      });
    }

    if (searchHistory[0]) searchHistory[0].result_count = results.length;

    res.json({
      success: true,
      query: queryStr,
      filters,
      chips: filters.chips,
      result_count: results.length,
      results,
      insufficient_data: results.length === 0,
      message: results.length > 0
        ? `${results.length} matching surveillance records found`
        : 'NO MATCHING SURVEILLANCE EVENTS',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/intelligence/search - Query via query string
searchRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  req.body = { query: req.query.q || req.query.query || '' };
  (searchRouter as any).handle(req, res, next);
});

// GET /api/intelligence/search/history - Recent search queries
searchRouter.get('/history', (req: Request, res: Response) => {
  res.json({
    success: true,
    history: searchHistory,
    count: searchHistory.length,
  });
});

// DELETE /api/intelligence/search/history - Clear search history
searchRouter.delete('/history', (req: Request, res: Response) => {
  searchHistory = [];
  res.json({
    success: true,
    message: 'Search history cleared',
  });
});
