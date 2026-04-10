from ultralytics import YOLOv10
import argparse

def train_model(model_size='l', epochs_phase1=5, epochs_phase2=80, batch_size=8, device='mps'):
    # Select base model
    model_name = f'yolov10{model_size}.pt'
    print(f"Initializing training with base model: {model_name}")
    
    model = YOLOv10(model_name)
    
    data_yaml = '../ultralytics/cfg/datasets/shelfwise.yaml'
    
    # Phase 1: Train with frozen backbone (learning the detection head)
    print("--- Phase 1: Frozen Backbone Training ---")
    model.train(
        data=data_yaml,
        epochs=epochs_phase1,
        batch=batch_size,
        imgsz=640,
        device=device,
        freeze=10, 
        lr0=0.001,
        optimizer='AdamW',
        project='runs/shelfwise',
        name='phase1_frozen',
        patience=10,
        plots=True,
    )
    
    # Phase 2: Full fine-tuning
    print("--- Phase 2: Full Fine-tuning ---")
    best_frozen_model = 'runs/shelfwise/phase1_frozen/weights/best.pt'
    model = YOLOv10(best_frozen_model)
    
    model.train(
        data=data_yaml,
        epochs=epochs_phase2,
        batch=batch_size,
        imgsz=640,
        device=device,
        freeze=None,
        lr0=0.0005,
        lrf=0.01,
        optimizer='AdamW',
        weight_decay=0.0005,
        project='runs/shelfwise',
        name='phase2_full',
        patience=20,
        cos_lr=True,
        hsv_h=0.015,
        hsv_s=0.5,
        hsv_v=0.3,
        degrees=5.0,
        translate=0.1,
        scale=0.3,
        fliplr=0.5,
        mosaic=0.8,
        mixup=0.1,
        plots=True,
    )
    print("Training complete! Best model saved at runs/shelfwise/phase2_full/weights/best.pt")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", choices=['n', 's', 'm', 'b', 'l', 'x'], default='l', help="YOLOv10 model size")
    parser.add_argument("--device", default='mps', help="Device to train on (mps for Apple Silicon, cuda for Nvidia)")
    args = parser.parse_args()
    
    train_model(model_size=args.size, device=args.device)
