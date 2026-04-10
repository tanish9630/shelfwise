"""
ShelfWise — Google Colab Training Notebook Setup
==================================================
Copy-paste these cells into a Google Colab notebook.

This script prints out the Colab cells you need, making it easy 
to set up a complete training environment.
"""

COLAB_CELLS = """
# ╔══════════════════════════════════════════════════════════════╗
# ║  ShelfWise — YOLOv10x Fine-Tuning on Google Colab          ║
# ╚══════════════════════════════════════════════════════════════╝

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 1: Check GPU
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
!nvidia-smi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 2: Clone repo and install
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
!git clone https://github.com/tanish9630/shelfwise.git
%cd shelfwise/yolov10
!pip install -r requirements.txt
!pip install -e .
!pip install huggingface-hub safetensors roboflow

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 3: Download dataset from Roboflow
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
from roboflow import Roboflow

# ⚠️ REPLACE these with your actual Roboflow project details:
rf = Roboflow(api_key="YOUR_ROBOFLOW_API_KEY")
project = rf.workspace("YOUR_WORKSPACE").project("YOUR_PROJECT_NAME")
version = project.version(1)  # Change version number as needed
dataset = version.download("yolov8")

# Print the data.yaml path (you'll need this)
import os
data_yaml = os.path.join(dataset.location, "data.yaml")
print(f"Dataset downloaded to: {dataset.location}")
print(f"data.yaml path: {data_yaml}")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 4: Preview dataset
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
!cat {data_yaml}
!echo "---"
!echo "Train images:" && ls {dataset.location}/train/images/ | head -10
!echo "Val images:" && ls {dataset.location}/valid/images/ | head -10

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 5: Download YOLOv10x pretrained weights
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
!wget https://github.com/THU-MIG/yolov10/releases/download/v1.1/yolov10x.pt

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 6: Train — Phase 1 (Frozen backbone)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
from ultralytics import YOLOv10

model = YOLOv10('yolov10x.pt')

model.train(
    data=data_yaml,            # ← from Cell 3
    epochs=5,
    batch=16,                  # T4=16, A100=32
    imgsz=640,
    device='0',
    freeze=10,
    lr0=0.001,
    optimizer='AdamW',
    project='runs/shelfwise',
    name='phase1_frozen',
    exist_ok=True,
    patience=10,
    plots=True,
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 7: Train — Phase 2 (Full fine-tuning)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model = YOLOv10('runs/shelfwise/phase1_frozen/weights/best.pt')

model.train(
    data=data_yaml,
    epochs=80,
    batch=16,
    imgsz=640,
    device='0',
    freeze=None,
    lr0=0.0005,
    lrf=0.01,
    optimizer='AdamW',
    weight_decay=0.0005,
    project='runs/shelfwise',
    name='phase2_full',
    exist_ok=True,
    patience=20,
    cos_lr=True,
    hsv_h=0.015,
    hsv_s=0.5,
    hsv_v=0.3,
    degrees=5.0,
    translate=0.1,
    scale=0.3,
    fliplr=0.5,
    flipud=0.0,
    mosaic=0.8,
    mixup=0.1,
    plots=True,
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 8: Evaluate
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
model = YOLOv10('runs/shelfwise/phase2_full/weights/best.pt')

metrics = model.val(
    data=data_yaml,
    batch=16,
    imgsz=640,
    device='0',
    plots=True,
    save_json=True,
)

print(f"mAP@50:    {metrics.box.map50:.4f}")
print(f"mAP@50-95: {metrics.box.map:.4f}")
print(f"Precision: {metrics.box.mp:.4f}")
print(f"Recall:    {metrics.box.mr:.4f}")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 9: Test inference on a sample image
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import glob
from IPython.display import Image, display

# Pick a random validation image
val_images = glob.glob(f"{dataset.location}/valid/images/*.jpg")
if val_images:
    results = model.predict(source=val_images[0], conf=0.25, save=True)
    # Show the result
    display(Image(filename=results[0].save_dir + "/" + results[0].path.split("/")[-1]))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CELL 10: Download the trained model
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
from google.colab import files
files.download('runs/shelfwise/phase2_full/weights/best.pt')
"""

if __name__ == '__main__':
    print(COLAB_CELLS)
