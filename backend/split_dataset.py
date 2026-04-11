"""
Dataset splitter: Splits images+labels into 80% train / 10% val / 10% test
Output structure:
    yolov8_dataset_export (1)/
        train/images/  train/labels/
        val/images/    val/labels/
        test/images/   test/labels/
"""

import os
import shutil
import random
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
DATASET_DIR = Path(r"C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\backend\yolov8_dataset_export (1)")
IMAGES_DIR  = DATASET_DIR / "images"
LABELS_DIR  = DATASET_DIR / "labels"
TRAIN_RATIO = 0.80
VAL_RATIO   = 0.10
TEST_RATIO  = 0.10
SEED        = 42
# ─────────────────────────────────────────────────────────────────────────────

random.seed(SEED)

# Collect all image files
image_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
all_images = sorted([f for f in IMAGES_DIR.iterdir() if f.suffix.lower() in image_exts])

# Only keep images that have a matching label file
paired = []
skipped = 0
for img in all_images:
    label = LABELS_DIR / (img.stem + ".txt")
    if label.exists():
        paired.append(img)
    else:
        skipped += 1

print(f"Total images with labels: {len(paired)}  (skipped {skipped} without labels)")

# Shuffle and split
random.shuffle(paired)
n = len(paired)
n_train = int(n * TRAIN_RATIO)
n_val   = int(n * VAL_RATIO)

splits = {
    "train": paired[:n_train],
    "val":   paired[n_train : n_train + n_val],
    "test":  paired[n_train + n_val :],
}

print(f"Split sizes → train: {len(splits['train'])}  val: {len(splits['val'])}  test: {len(splits['test'])}")

# Create folders and copy files
for split_name, images in splits.items():
    img_out = DATASET_DIR / split_name / "images"
    lbl_out = DATASET_DIR / split_name / "labels"
    img_out.mkdir(parents=True, exist_ok=True)
    lbl_out.mkdir(parents=True, exist_ok=True)

    for img_path in images:
        shutil.copy2(img_path, img_out / img_path.name)
        lbl_path = LABELS_DIR / (img_path.stem + ".txt")
        shutil.copy2(lbl_path, lbl_out / lbl_path.name)

    print(f"  ✓  {split_name}: {len(images)} images copied")

# Write updated data.yaml
yaml_content = f"""path: "{DATASET_DIR.as_posix()}"
train: train/images
val: val/images
test: test/images
names:
  0: class_0
  1: class_1
  2: class_2
  3: class_3
  4: class_4
  5: class_5
"""

yaml_path = DATASET_DIR / "data.yaml"
yaml_path.write_text(yaml_content, encoding="utf-8")
print(f"\n✓  data.yaml updated at {yaml_path}")
print("\nDone! You can now run:  .venv\\Scripts\\python train_fast.py")
