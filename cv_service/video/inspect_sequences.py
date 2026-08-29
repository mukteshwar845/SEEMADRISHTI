import os
import cv2

seq_dir = r"C:\Users\tribh\Downloads\VisDrone2019-MOT-val\VisDrone2019-MOT-val\sequences"
ann_dir = r"C:\Users\tribh\Downloads\VisDrone2019-MOT-val\VisDrone2019-MOT-val\annotations"

if not os.path.exists(seq_dir):
    print("Dataset directory not found:", seq_dir)
    exit(1)

sequences = sorted(os.listdir(seq_dir))
print(f"Total sequences found: {len(sequences)}")

for i, seq in enumerate(sequences):
    p = os.path.join(seq_dir, seq)
    if not os.path.isdir(p):
        continue
    frames = sorted([f for f in os.listdir(p) if f.endswith(".jpg")])
    if not frames:
        continue
    first_f = os.path.join(p, frames[0])
    img = cv2.imread(first_f)
    h, w = (img.shape[0], img.shape[1]) if img is not None else (0, 0)
    ann_file = os.path.join(ann_dir, f"{seq}.txt")
    ann_lines = 0
    if os.path.exists(ann_file):
        with open(ann_file, "r") as af:
            ann_lines = len(af.readlines())
    print(f"{i+1:02d}. {seq}: {len(frames)} frames, {w}x{h}, {ann_lines} annotations")
