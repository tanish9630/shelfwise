"""
ShelfWise Model Evaluation
===========================
Runs validation metrics on the fine-tuned YOLOv10 model.
Works on Colab (CUDA), Mac (MPS), or CPU.

Usage:
  python evaluate_model.py
  python evaluate_model.py --weights runs/shelfwise/phase2_full/weights/best.pt
  python evaluate_model.py --weights best.pt --data path/to/data.yaml
"""

from ultralytics import YOLOv10
import argparse
import torch
import os


def get_device():
    """Auto-detect best available device."""
    if torch.cuda.is_available():
        return '0'
    elif torch.backends.mps.is_available():
        return 'mps'
    return 'cpu'


def find_data_yaml():
    """Auto-resolve data YAML location."""
    candidates = [
        'ultralytics/cfg/datasets/shelfwise.yaml',
        '../ultralytics/cfg/datasets/shelfwise.yaml',
        'shelfwise-1/data.yaml',
        'datasets/shelfwise/data.yaml',
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


def evaluate_model(weights_path, data_yaml=None, device=None):
    if device is None:
        device = get_device()
    if data_yaml is None:
        data_yaml = find_data_yaml()
        if data_yaml is None:
            print("❌ Could not find dataset YAML. Specify with --data")
            return

    print(f"📦 Loading model from: {weights_path}")
    print(f"📂 Dataset config: {data_yaml}")
    print(f"🖥️  Device: {device}")
    
    model = YOLOv10(weights_path)

    metrics = model.val(
        data=data_yaml,
        batch=16,
        imgsz=640,
        device=device,
        plots=True,
        save_json=True,
    )

    print("\n" + "=" * 50)
    print("📊 EVALUATION RESULTS")
    print("=" * 50)
    print(f"  mAP@50:      {metrics.box.map50:.4f}")
    print(f"  mAP@50-95:   {metrics.box.map:.4f}")
    print(f"  Precision:   {metrics.box.mp:.4f}")
    print(f"  Recall:      {metrics.box.mr:.4f}")
    print("=" * 50)

    # Per-class metrics
    if hasattr(metrics.box, 'maps') and metrics.box.maps is not None:
        print("\nPer-class mAP@50:")
        class_names = model.names if hasattr(model, 'names') else {}
        for i, map50 in enumerate(metrics.box.maps):
            name = class_names.get(i, f"class_{i}")
            print(f"  {name:20s} → {map50:.4f}")

    return metrics


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="ShelfWise Model Evaluation")
    parser.add_argument("--weights", default="runs/shelfwise/phase2_full/weights/best.pt",
                        help="Path to model weights")
    parser.add_argument("--data", default=None, help="Path to dataset YAML")
    parser.add_argument("--device", default=None, help="Device (auto-detected)")
    args = parser.parse_args()

    evaluate_model(args.weights, args.data, args.device)
