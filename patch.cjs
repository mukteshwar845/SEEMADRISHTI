const fs = require('fs');
let code = fs.readFileSync('server/routes/intelligence.ts', 'utf8');
code = code.replace(
  'SELECT track_id, camera_id, class_name, risk_score, risk_level, behavior_pattern, updated_at',
  'SELECT track_id, camera_id, risk_score, risk_level, behavior_pattern, updated_at'
);
code = code.replace(
  'SELECT track_id, camera_id, class_name, risk_score, risk_level, started_at',
  'SELECT track_id, camera_id, risk_score, risk_level, started_at'
);
fs.writeFileSync('server/routes/intelligence.ts', code);
