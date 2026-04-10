"""
ShelfWise YOLOv10x Fine-Tuning Script
=======================================
Designed to run on Google Colab or Kaggle with CUDA GPU.

Two-phase training strategy:
  Phase 1: Frozen backbone (5 epochs) — learn the new detection head
  Phase 2: Full fine-tuning (80 epochs) — refine entire network

Setup (run in Colab first cell):
  !git clone https://github.com/tanish9630/shelfwise.git
  %cd shelfwise/yolov10
  !pip install -r requirements.txt
  !pip install -e .
  !pip install huggingface-hub safetensors roboflow

  # Download your Roboflow dataset
  from roboflow import Roboflow
  rf = Roboflow(api_key="YOUR_API_KEY")
  project = rf.workspace("YOUR_WORKSPACE").project("YOUR_PROJECT")
  version = project.version(1)
  dataset = version.download("yolov8")

Usage:
  python scripts/train_shelfwise.py
  python scripts/train_shelfwise.py --size x --batch 16 --epochs2 100
"""

from ultralytics import YOLOv10
import argparse
import torch
import os


def check_environment():
    """Print environment info for debugging."""
    print("=" * 50)
    print("🖥️  Environment Check")
    print("=" * 50)
    print(f"PyTorch version:  {torch.__version__}")
    print(f"CUDA available:   {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA device:      {torch.cuda.get_device_name(0)}")
        print(f"CUDA memory:      {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")
    print(f"MPS available:    {torch.backends.mps.is_available()}")
    print("=" * 50)


def get_device():
    """Auto-detect best available device."""
    if torch.cuda.is_available():
        return '0'  # CUDA device 0
    elif torch.backends.mps.is_available():
        return 'mps'
    else:
        return 'cpu'


def train_model(
    model_size='x',
    epochs_phase1=5,
    epochs_phase2=80,
    batch_size=16,
    device=None,
    data_yaml=None,
    resume=False,
):
    """
    Two-phase fine-tuning of YOLOv10 on ShelfWise dataset.

    Args:
        model_size: YOLOv10 variant (n/s/m/b/l/x). Default 'x' for best accuracy.
        epochs_phase1: Frozen backbone epochs (default 5)
        epochs_phase2: Full fine-tuning epochs (default 80)
        batch_size: Batch size (16 for Colab T4, 8 for smaller GPUs)
        device: Training device. Auto-detected if None.
        data_yaml: Path to dataset YAML. Auto-resolved if None.
        resume: Resume from last checkpoint
    """
    check_environment()

    if device is None:
        device = get_device()
    print(f"\n🎯 Using device: {device}")

    # Resolve data YAML path
    if data_yaml is None:
        # Check common locations
        candidates = [
            'ultralytics/cfg/datasets/shelfwise.yaml',  # In yolov10 root
            '../ultralytics/cfg/datasets/shelfwise.yaml',  # From scripts/
            # Roboflow download location (adjust after download)
            'shelfwise-1/data.yaml',
            'datasets/shelfwise/data.yaml',
        ]
        for c in candidates:
            if os.path.exists(c):
                data_yaml = c
                break
        if data_yaml is None:
            print("❌ Could not find dataset YAML. Specify with --data")
            print("   If using Roboflow, download the dataset first.")
            return
    
    print(f"📂 Dataset config: {data_yaml}")

    # Download pretrained weights
    model_name = f'yolov10{model_size}.pt'
    print(f"📦 Loading pretrained model: {model_name}")
    
    # Try loading from pretrained hub first, fall back to local
    try:
        model = YOLOv10.from_pretrained(f'jameslahm/yolov10{model_size}')
        print("   Loaded from HuggingFace Hub")
    except Exception:
        model = YOLOv10(model_name)
        print("   Loaded from local weights")

    # ──────────────────────────────────────────
    # PHASE 1: Frozen Backbone (Head-only training)
    # ──────────────────────────────────────────
    print("\n" + "=" * 50)
    print("🧊 PHASE 1: Frozen Backbone Training")
    print(f"   Epochs: {epochs_phase1} | Batch: {batch_size} | LR: 0.001")
    print("=" * 50)

    model.train(
        data=data_yaml,
        epochs=epochs_phase1,
        batch=batch_size,
        imgsz=640,
        device=device,
        freeze=10,                # Freeze backbone (first 10 layers)
        lr0=0.001,
        optimizer='AdamW',
        project='runs/shelfwise',
        name='phase1_frozen',
        exist_ok=True,
        patience=10,
        plots=True,
        save=True,
        val=True,
    )

    # ──────────────────────────────────────────
    # PHASE 2: Full Fine-tuning
    # ──────────────────────────────────────────
    print("\n" + "=" * 50)
    print("🔥 PHASE 2: Full Fine-tuning")
    print(f"   Epochs: {epochs_phase2} | Batch: {batch_size} | LR: 0.0005")
    print("=" * 50)

    best_phase1 = 'runs/shelfwise/phase1_frozen/weights/best.pt'
    if not os.path.exists(best_phase1):
        best_phase1 = 'runs/shelfwise/phase1_frozen/weights/last.pt'
    
    model = YOLOv10(best_phase1)

    model.train(
        data=data_yaml,
        epochs=epochs_phase2,
        batch=batch_size,
        imgsz=640,
        device=device,
        freeze=None,              # Unfreeze everything
        lr0=0.0005,               # Lower LR to preserve pretrained features
        lrf=0.01,                 # Final LR = lr0 * lrf = 5e-6
        optimizer='AdamW',
        weight_decay=0.0005,
        project='runs/shelfwise',
        name='phase2_full',
        exist_ok=True,
        patience=20,
        cos_lr=True,              # Cosine annealing scheduler
        # Augmentation tuned for retail shelves
        hsv_h=0.015,              # Slight hue shift
        hsv_s=0.5,                # Store lighting variation
        hsv_v=0.3,                # Brightness variation
        degrees=5.0,              # Slight rotation (camera angles)
        translate=0.1,
        scale=0.3,
        fliplr=0.5,               # Products can face either way
        flipud=0.0,               # Shelves are always upright!
        mosaic=0.8,               # Dense products benefit from mosaic
        mixup=0.1,
        plots=True,
        save=True,
        val=True,
    )

    print("\n" + "=" * 50)
    print("✅ TRAINING COMPLETE!")
    print("=" * 50)
    print(f"Best model: runs/shelfwise/phase2_full/weights/best.pt")
    print(f"Last model: runs/shelfwise/phase2_full/weights/last.pt")
    print()
    print("Next steps:")
    print("  1. Run evaluation:  python scripts/evaluate_model.py")
    print("  2. Run inference:   python scripts/inference_shelf.py <image>")
    print("  3. Download best.pt from Colab for local deployment")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="ShelfWise YOLOv10 Training — Two-phase fine-tuning",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--size", choices=['n', 's', 'm', 'b', 'l', 'x'], default='x',
                        help="YOLOv10 model size (default: x)")
    parser.add_argument("--device", default=None,
                        help="Device (auto-detected if omitted). Options: 0, cuda, mps, cpu")
    parser.add_argument("--batch", type=int, default=16,
                        help="Batch size (default: 16 for Colab T4)")
    parser.add_argument("--epochs1", type=int, default=5,
                        help="Phase 1 frozen epochs (default: 5)")
    parser.add_argument("--epochs2", type=int, default=80,
                        help="Phase 2 full fine-tuning epochs (default: 80)")
    parser.add_argument("--data", default=None,
                        help="Path to dataset YAML (auto-resolved if omitted)")
    parser.add_argument("--resume", action='store_true',
                        help="Resume training from last checkpoint")

    args = parser.parse_args()

    train_model(
        model_size=args.size,
        epochs_phase1=args.epochs1,
        epochs_phase2=args.epochs2,
        batch_size=args.batch,
        device=args.device,
        data_yaml=args.data,
        resume=args.resume,
    )
