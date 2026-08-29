import os
import cv2
from collections import Counter

seq_dir = r"C:\Users\tribh\Downloads\VisDrone2019-MOT-val\VisDrone2019-MOT-val\sequences"
ann_dir = r"C:\Users\tribh\Downloads\VisDrone2019-MOT-val\VisDrone2019-MOT-val\annotations"

# VisDrone class mapping:
# 0: ignored, 1: pedestrian, 2: people, 3: bicycle, 4: car, 5: van, 6: truck, 7: tricycle, 8: awning-tricycle, 9: bus, 10: motor, 11: others
CLASS_MAP = {
    0: "ignored", 1: "pedestrian", 2: "people", 3: "bicycle", 4: "car",
    5: "van", 6: "truck", 7: "tricycle", 8: "awning-tricycle", 9: "bus",
    10: "motor", 11: "others"
}

sequences = sorted(os.listdir(seq_dir))

for seq in sequences:
    p = os.path.join(seq_dir, seq)
    if not os.path.isdir(p):
        continue
    frames = sorted([f for f in os.listdir(p) if f.endswith(".jpg")])
    first_f = cv2.imread(os.path.join(p, frames[0]))
    last_f = cv2.imread(os.path.join(p, frames[-1]))
    h, w = first_f.shape[:2]
    
    ann_file = os.path.join(ann_dir, f"{seq}.txt")
    classes = Counter()
    track_ids = set()
    if os.path.exists(ann_file):
        with open(ann_file, "r") as af:
            for line in af:
                parts = line.strip().split(",")
                if len(parts) >= 8:
                    tid = parts[1]
                    cls_id = int(parts[7])
                    track_ids.add(tid)
                    classes[CLASS_MAP.get(cls_id, f"class_{cls_id}")] += 1
    
    print("=" * 60)
    print(f"Sequence: {seq}")
    print(f"Frames: {len(frames)} | Resolution: {w}x{h} | Unique GT Tracks: {len(track_ids)}")
    print(f"Top Annotations: {dict(classes.most_common(5))}")
