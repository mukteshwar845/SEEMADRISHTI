import sqlite3
import json
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "seemadrishti.sqlite"))
cfg_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "config", "camera_sources.json"))

with open(cfg_path, "r", encoding="utf-8") as f:
    cfg = json.load(f)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Ensure table exists
cur.execute("""
CREATE TABLE IF NOT EXISTS cameras (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Online',
    source_url TEXT,
    source_type TEXT DEFAULT 'mp4',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")

for cam_id, info in cfg.items():
    source_url = info["source_uri"]
    name = info["name"]
    location = f"{name} - Security Perimeter"
    source_type = info.get("source_type", "mp4")

    # Check if exists
    cur.execute("SELECT id FROM cameras WHERE id = ?", (cam_id,))
    if cur.fetchone():
        cur.execute("""
            UPDATE cameras
            SET name = ?, location = ?, source_url = ?, source_type = ?, status = 'Online', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (name, location, source_url, source_type, cam_id))
    else:
        cur.execute("""
            INSERT INTO cameras (id, name, location, source_url, source_type, status)
            VALUES (?, ?, ?, ?, ?, 'Online')
        """, (cam_id, name, location, source_url, source_type))

conn.commit()

cur.execute("SELECT id, name, location, source_url, source_type FROM cameras ORDER BY id ASC")
rows = cur.fetchall()
print(f"Total cameras in SQLite database: {len(rows)}")
for r in rows:
    print(f"  {r[0]}: '{r[1]}' -> '{r[3]}' ({r[4]})")

conn.close()
