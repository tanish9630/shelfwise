import torch
from ultralytics import YOLO

def train_fast():
    # 1. Verify GPU availability
    device = 0 if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")

    # Use YOLO11 nano model
    model = YOLO('yolo11n.pt') 


    # 3. Start Optimized Training
    results = model.train(
        # Essential Paths
        data=r'C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\backend\yolov8_dataset_export (1)\data.yaml',
        epochs=50, 
        imgsz=640,
        
        # Hardware Acceleration
        device=device,      # Explicitly use GPU if available
        batch=-1,           # Auto-Batch: Finds the largest batch size for your VRAM
        workers=8,          # Number of CPU threads for data loading
        amp=True,           # Automatic Mixed Precision (faster math, less VRAM)
        
        # Bottleneck Reduction
        cache=True,         # Load images into RAM to avoid slow disk I/O
        
        # Intelligent Exit
        patience=10,        # Stop training if no improvement after 10 epochs
    )

if __name__ == '__main__':
    train_fast()
