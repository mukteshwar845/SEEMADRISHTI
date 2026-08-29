"""
SEEMADRISHTI AI - Multi-Camera VisDrone Fixture Generator (Phase 15B)
Team: IQ100
SIH Problem Statement: SIH26187

Generates CAM-01.mp4 through CAM-09.mp4 from real VisDrone UAV dataset sequences.
Encodes using standard H.264 (AVC1 / yuv420p) with faststart for seamless HTML5
browser streaming and OpenCV ingestion, preserving the real UAV resolution without stretching or cropping.
"""

import os
import sys
import subprocess
from typing import Dict, Any, List, Optional
import cv2

DATASET_ROOT = r"C:\Users\tribh\Downloads\VisDrone2019-MOT-val\VisDrone2019-MOT-val\sequences"
FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "visdrone"))

# Definition of camera mappings to real VisDrone sequences
CAMERA_MAPPINGS: Dict[str, Dict[str, Any]] = {
    "CAM-01": {
        "name": "Sector Alpha Main Gate",
        "seq": "uav0000339_00001_v",
        "frame_range": None, # All 275 frames
        "fps": 25.0,
        "description": "Pedestrian & vehicle main perimeter gate",
    },
    "CAM-02": {
        "name": "Sector Alpha East Perimeter",
        "seq": "uav0000086_00000_v",
        "frame_range": (1, 232), # 232 frames
        "fps": 25.0,
        "description": "High-density pedestrian patrol corridor",
    },
    "CAM-03": {
        "name": "Sector Bravo Access Road",
        "seq": "uav0000182_00000_v",
        "frame_range": None, # All 363 frames
        "fps": 25.0,
        "description": "Rapid motorized & vehicle approach road",
    },
    "CAM-04": {
        "name": "Sector Bravo Outer Fence",
        "seq": "uav0000117_02622_v",
        "frame_range": None, # All 349 frames
        "fps": 25.0,
        "description": "High-resolution wide perimeter fence",
    },
    "CAM-05": {
        "name": "Sector Charlie Checkpoint",
        "seq": "uav0000137_00458_v",
        "frame_range": None, # All 233 frames
        "fps": 25.0,
        "description": "Multi-modal transit & cyclist checkpoint",
    },
    "CAM-06": {
        "name": "Sector Charlie Transit Zone",
        "seq": "uav0000268_05773_v",
        "frame_range": (1, 480), # 480 frames
        "fps": 25.0,
        "description": "4K long-range vehicle transit corridor",
    },
    "CAM-07": {
        "name": "Sector Delta Approach",
        "seq": "uav0000268_05773_v",
        "frame_range": (481, 978), # 498 frames
        "fps": 25.0,
        "description": "4K forward observation sector",
    },
    "CAM-08": {
        "name": "Sector Delta Observation",
        "seq": "uav0000305_00000_v",
        "frame_range": None, # All 184 frames
        "fps": 25.0,
        "description": "Multi-lane transport & bus convoy observation",
    },
    "CAM-09": {
        "name": "Sector Echo Border Corridor",
        "seq": "uav0000086_00000_v",
        "frame_range": (233, 464), # 232 frames
        "fps": 25.0,
        "description": "Dispersed patrol tracking corridor",
    },
}


def get_ffmpeg_path() -> Optional[str]:
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and os.path.exists(exe):
            return exe
    except Exception:
        pass
    return None


def generate_camera_fixture(
    cam_id: str,
    cfg: Dict[str, Any],
    dataset_root: str = DATASET_ROOT,
    fixtures_dir: str = FIXTURES_DIR,
    overwrite: bool = False,
) -> Dict[str, Any]:
    seq_name = cfg["seq"]
    seq_dir = os.path.join(dataset_root, seq_name)
    out_mp4 = os.path.join(fixtures_dir, f"{cam_id}.mp4")

    if not os.path.exists(seq_dir):
        raise FileNotFoundError(f"Sequence directory not found: '{seq_dir}'")

    raw_files = [f for f in os.listdir(seq_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    sorted_files = sorted(raw_files, key=lambda n: int(os.path.splitext(n)[0]) if os.path.splitext(n)[0].isdigit() else n)

    if cfg["frame_range"]:
        start_f, end_f = cfg["frame_range"]
        # Filter files whose index is within start_f..end_f
        filtered = []
        for f in sorted_files:
            idx_str = os.path.splitext(f)[0]
            if idx_str.isdigit():
                f_idx = int(idx_str)
                if start_f <= f_idx <= end_f:
                    filtered.append(f)
        sorted_files = filtered

    full_paths = [os.path.join(seq_dir, f) for f in sorted_files]
    if not full_paths:
        raise ValueError(f"No frames found for {cam_id} in {seq_dir} range {cfg['frame_range']}")

    sample_img = cv2.imread(full_paths[0])
    if sample_img is None:
        raise ValueError(f"Failed to read first frame from {full_paths[0]}")

    h, w = sample_img.shape[:2]
    aligned_h = (h // 2) * 2
    aligned_w = (w // 2) * 2
    total_frames = len(full_paths)
    fps = cfg.get("fps", 25.0)

    if os.path.exists(out_mp4) and not overwrite:
        # Verify existing file
        cap = cv2.VideoCapture(out_mp4)
        if cap.isOpened() and int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) == total_frames:
            actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()
            sz_mb = round(os.path.getsize(out_mp4) / (1024 * 1024), 2)
            print(f"[{cam_id}] Fixture already valid: {out_mp4} ({actual_w}x{actual_h}, {total_frames} frames, {sz_mb} MB)")
            return {
                "cam_id": cam_id,
                "name": cfg["name"],
                "seq": seq_name,
                "mp4_path": out_mp4,
                "width": actual_w,
                "height": actual_h,
                "resolution": f"{actual_w}x{actual_h}",
                "fps": fps,
                "frames": total_frames,
                "size_mb": sz_mb,
            }
        cap.release()

    os.makedirs(fixtures_dir, exist_ok=True)
    ffmpeg_exe = get_ffmpeg_path()

    print(f"[{cam_id}] Encoding {total_frames} frames ({aligned_w}x{aligned_h} @ {fps}fps) from {seq_name}...")

    # Write frames list or use ffmpeg with image list via stdin/temp file or direct OpenCV
    if ffmpeg_exe:
        # Create a temporary concat file
        concat_file = os.path.join(fixtures_dir, f"{cam_id}_frames.txt")
        with open(concat_file, "w", encoding="utf-8") as cf:
            for p in full_paths:
                # Escape backslashes for ffmpeg concat
                p_esc = p.replace("\\", "/")
                cf.write(f"file '{p_esc}'\n")
                cf.write(f"duration {1.0/fps:.5f}\n")
            # Repeat last file for ffmpeg concat quirk
            cf.write(f"file '{full_paths[-1].replace(chr(92), '/')}'\n")

        cmd = [
            ffmpeg_exe,
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file,
            "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "28",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-r", str(fps),
            out_mp4,
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if os.path.exists(concat_file):
            os.remove(concat_file)

        if res.returncode == 0 and os.path.exists(out_mp4) and os.path.getsize(out_mp4) > 0:
            sz_mb = round(os.path.getsize(out_mp4) / (1024 * 1024), 2)
            cap = cv2.VideoCapture(out_mp4)
            actual_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()
            print(f"[{cam_id}] SUCCESS (H.264): {actual_w}x{actual_h}, {actual_frames} frames, {sz_mb} MB")
            return {
                "cam_id": cam_id,
                "name": cfg["name"],
                "seq": seq_name,
                "mp4_path": out_mp4,
                "width": actual_w,
                "height": actual_h,
                "resolution": f"{actual_w}x{actual_h}",
                "fps": fps,
                "frames": actual_frames,
                "size_mb": sz_mb,
            }

    # Fallback to OpenCV VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*"avc1")
    writer = cv2.VideoWriter(out_mp4, fourcc, fps, (aligned_w, aligned_h))
    if not writer.isOpened():
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(out_mp4, fourcc, fps, (aligned_w, aligned_h))

    for p in full_paths:
        img = cv2.imread(p)
        if img is None:
            continue
        if img.shape[1] != aligned_w or img.shape[0] != aligned_h:
            img = cv2.resize(img, (aligned_w, aligned_h), interpolation=cv2.INTER_AREA)
        writer.write(img)
    writer.release()

    sz_mb = round(os.path.getsize(out_mp4) / (1024 * 1024), 2)
    print(f"[{cam_id}] SUCCESS (OpenCV): {aligned_w}x{aligned_h}, {total_frames} frames, {sz_mb} MB")
    return {
        "cam_id": cam_id,
        "name": cfg["name"],
        "seq": seq_name,
        "mp4_path": out_mp4,
        "width": aligned_w,
        "height": aligned_h,
        "resolution": f"{aligned_w}x{aligned_h}",
        "fps": fps,
        "frames": total_frames,
        "size_mb": sz_mb,
    }


def generate_all():
    print("=" * 70)
    print("SEEMADRISHTI AI — PHASE 15B FULL 9-CAMERA VISDRONE FIXTURE GENERATOR")
    print("=" * 70)
    results = []
    for cam_id in sorted(CAMERA_MAPPINGS.keys()):
        cfg = CAMERA_MAPPINGS[cam_id]
        res = generate_camera_fixture(cam_id, cfg, overwrite=False)
        results.append(res)

    print("\n" + "=" * 70)
    print("FIXTURE GENERATION SUMMARY TABLE:")
    print("=" * 70)
    print(f"{'CAM ID':<8} {'CAMERA NAME':<30} {'RESOLUTION':<12} {'FRAMES':<8} {'FPS':<6} {'SIZE (MB)':<10} {'SEQUENCE'}")
    print("-" * 100)
    for r in results:
        print(f"{r['cam_id']:<8} {r['name']:<30} {r['resolution']:<12} {r['frames']:<8} {r['fps']:<6} {r['size_mb']:<10} {r['seq']}")
    print("=" * 70)


if __name__ == "__main__":
    generate_all()
