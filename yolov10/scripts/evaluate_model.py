from ultralytics import YOLOv10
import argparse

def evaluate_model(weights_path, device='mps'):
    print(f"Loading model from {weights_path}")
    model = YOLOv10(weights_path)
    
    # Run validation
    metrics = model.val(
        data='../ultralytics/cfg/datasets/shelfwise.yaml',
        batch=8,
        imgsz=640,
        device=device,
        plots=True,
        save_json=True,
    )
    
    print("\n--- Evaluation Results ---")
    print(f"mAP@50:    {metrics.box.map50:.4f}")
    print(f"mAP@50-95: {metrics.box.map:.4f}")
    print(f"Precision: {metrics.box.mp:.4f}")
    print(f"Recall:    {metrics.box.mr:.4f}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", default="runs/shelfwise/phase2_full/weights/best.pt", help="Path to best model weights")
    parser.add_argument("--device", default="mps", help="Device to use for eval")
    args = parser.parse_args()
    
    evaluate_model(args.weights, args.device)
