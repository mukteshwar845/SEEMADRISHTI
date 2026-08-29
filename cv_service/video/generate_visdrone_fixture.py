"""
SEEMADRISHTI AI - VisDrone Video Fixture Generator (Phase 15)
Team: IQ100
SIH Problem Statement: SIH26187

Generates CAM-01.mp4 from the real VisDrone UAV dataset sequence uav0000339_00001_v.
Encodes using standard H.264 (AVC1 / yuv420p) with faststart for seamless HTML5
browser streaming and OpenCV ingestion, preserving the real UAV resolution without stretching or cropping.
"""

import os
import sys
import subprocess
from typing import Tuple, List
import cv2

DEFAULT_DATASET_SEQ = r"C:\Users\tribh\Downloads\VisDrone2019-MOT-val\VisDrone2019-MOT-val\sequences\uav0000339_00001_v"
DEFAULT_FIXTURE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "visdrone"))
DEFAULT_OUTPUT_MP4 = os.path.join(DEFAULT_FIXTURE_DIR, "CAM-01.mp4")


def inspect_sequence(seq_dir: str) -> Tuple[List[str], int, int, int]:
    """
    Inspects sequence directory and returns sorted JPG paths, width, height, and frame count.
    """
    if not os.path.exists(seq_dir):
        raise FileNotFoundError(f"VisDrone sequence directory not found at: '{seq_dir}'")

    raw_files = [f for f in os.listdir(seq_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    if not raw_files:
        raise ValueError(f"No image frames found in: '{seq_dir}'")

    sorted_files = sorted(raw_files, key=lambda name: int(os.path.splitext(name)[0]) if os.path.splitext(name)[0].isdigit() else name)
    full_paths = [os.path.join(seq_dir, f) for f in sorted_files]

    sample_img = cv2.imread(full_paths[0])
    if sample_img is None:
        raise ValueError(f"Failed to read first frame from: '{full_paths[0]}'")

    h, w = sample_img.shape[:2]
    aligned_h = (h // 2) * 2
    aligned_w = (w // 2) * 2

    return full_paths, aligned_w, aligned_h, len(full_paths)


def generate_mp4_fixture(
    seq_dir: str = DEFAULT_DATASET_SEQ,
    output_path: str = DEFAULT_OUTPUT_MP4,
    fps: float = 25.0,
    overwrite: bool = True,
) -> str:
    """
    Reads JPG sequence in sorted order and compiles H.264 CAM-01.mp4 fixture.
    """
    if os.path.exists(output_path) and not overwrite:
        print(f"[VisDrone Fixture] Output file '{output_path}' already exists. Skipping generation.")
        return output_path

    frame_paths, width, height, total_count = inspect_sequence(seq_dir)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print(f"[VisDrone Fixture] Source Sequence: '{seq_dir}'")
    print(f"[VisDrone Fixture] Total Frames:    {total_count}")
    print(f"[VisDrone Fixture] Real Resolution: {width}x{height}")
    print(f"[VisDrone Fixture] Target FPS:      {fps}")
    print(f"[VisDrone Fixture] Output Path:     '{output_path}'")

    # Try FFmpeg for browser-compatible H.264 (libx264)
    ffmpeg_exe = None
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass

    if ffmpeg_exe and os.path.exists(ffmpeg_exe):
        input_pattern = os.path.join(seq_dir, "%07d.jpg")
        cmd = [
            ffmpeg_exe,
            "-y",
            "-framerate", str(fps),
            "-i", input_pattern,
            "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_path,
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            file_size_mb = round(os.path.getsize(output_path) / (1024 * 1024), 2)
            print(f"[VisDrone Fixture] SUCCESS (H.264): Written {total_count} frames to '{output_path}' ({file_size_mb} MB)")
            return output_path

    # Fallback to OpenCV VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*"avc1")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    if not writer.isOpened():
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    if not writer.isOpened():
        raise RuntimeError(f"Failed to initialize VideoWriter for '{output_path}'")

    written = 0
    for idx, fpath in enumerate(frame_paths):
        img = cv2.imread(fpath)
        if img is None:
            continue
        if img.shape[1] != width or img.shape[0] != height:
            img = cv2.resize(img, (width, height), interpolation=cv2.INTER_AREA)
        writer.write(img)
        written += 1

    writer.release()

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError(f"Generated fixture file '{output_path}' is missing or empty")

    file_size_mb = round(os.path.getsize(output_path) / (1024 * 1024), 2)
    print(f"[VisDrone Fixture] SUCCESS: Written {written}/{total_count} frames to '{output_path}' ({file_size_mb} MB)")
    return output_path


if __name__ == "__main__":
    seq_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DATASET_SEQ
    out_file = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT_MP4
    generate_mp4_fixture(seq_dir=seq_path, output_path=out_file)
