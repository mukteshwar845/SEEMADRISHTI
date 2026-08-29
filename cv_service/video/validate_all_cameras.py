import os
import sys
import subprocess
import json

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FIXTURES_DIR = os.path.join(PROJECT_ROOT, "cv_service", "tests", "fixtures", "visdrone")

print("=" * 80)
print("SEEMADRISHTI AI — PHASE 15B REAL CV PIPELINE VALIDATION (ALL 9 CAMERAS)")
print("=" * 80)

results = []

for i in range(1, 10):
    cam_id = f"cam-{i:02d}"
    fixture_path = os.path.join(FIXTURES_DIR, f"CAM-{i:02d}.mp4")

    cmd = [
        sys.executable,
        os.path.join(PROJECT_ROOT, "cv_service", "main.py"),
        "--source", fixture_path,
        "--camera-id", cam_id,
        "--no-ws",
        "--max-frames", "40",
    ]

    print(f"\n[{cam_id.upper()}] Running CV pipeline on {fixture_path} (40 frames)...")
    res = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)

    if res.returncode != 0:
        print(f"[{cam_id.upper()}] FAILED with code {res.returncode}")
        print("STDERR:", res.stderr[:500])
        results.append({"cam_id": cam_id, "status": "FAIL", "output": res.stderr})
    else:
        # Parse metrics from stdout
        lines = res.stdout.strip().split("\n")
        summary_lines = [l for l in lines if any(k in l for k in ["Processed", "Tracked", "Latency", "Tracks", "fps", "FPS"])]
        print(f"[{cam_id.upper()}] SUCCESS (40 frames processed)")
        for sl in summary_lines[-6:]:
            print(f"  {sl}")
        results.append({"cam_id": cam_id, "status": "PASS", "summary": summary_lines})

print("\n" + "=" * 80)
print(f"PIPELINE SUMMARY: {sum(1 for r in results if r['status'] == 'PASS')}/9 CAMERAS PASSED")
print("=" * 80)
