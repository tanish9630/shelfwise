import json
import argparse
from pathlib import Path
from ultralytics import YOLOv10
import datetime

# Target Classes configuration (Assuming Option A)
class_names = ["product", "empty_space", "low_stock", "price_tag", "misplaced_product"]

def analyze_shelf(image_path, model_path="runs/shelfwise/phase2_full/weights/best.pt", conf_thresh=0.25):
    image_path = Path(image_path)
    model = YOLOv10(model_path)
    
    results = model.predict(source=str(image_path), conf=conf_thresh, save=True)
    
    structured_output = {
        "image": image_path.name,
        "timestamp": datetime.datetime.now().isoformat(),
        "detections": [],
        "shelf_health": {
            "total_slots": 0,
            "filled": 0,
            "empty": 0,
            "low_stock": 0,
            "fill_rate": 0.0
        }
    }
    
    for r in results:
        boxes = r.boxes
        for box in boxes:
            cls_id = int(box.cls[0].item())
            cls_name = class_names[cls_id] if cls_id < len(class_names) else f"unknown_{cls_id}"
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()
            
            structured_output["detections"].append({
                "class": cls_name,
                "confidence": round(conf, 4),
                "bbox": [round(c, 2) for c in xyxy]
            })
            
            # Analytics
            if cls_name in ["product", "empty_space", "low_stock"]:
                structured_output["shelf_health"]["total_slots"] += 1
                if cls_name == "product":
                    structured_output["shelf_health"]["filled"] += 1
                elif cls_name == "empty_space":
                    structured_output["shelf_health"]["empty"] += 1
                elif cls_name == "low_stock":
                    structured_output["shelf_health"]["low_stock"] += 1
                    structured_output["shelf_health"]["filled"] += 1
                    
    total = structured_output["shelf_health"]["total_slots"]
    if total > 0:
        structured_output["shelf_health"]["fill_rate"] = round(structured_output["shelf_health"]["filled"] / total, 2)
        
    out_json = image_path.with_suffix('.json')
    with open(out_json, "w") as f:
        json.dump(structured_output, f, indent=4)
        
    print(f"\nProcessed {image_path.name}")
    print(f"Fill rate: {structured_output['shelf_health']['fill_rate']*100:.1f}%")
    print(f"Results saved to JSON at {out_json}")
    
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("source", help="Path to image or directory")
    parser.add_argument("--weights", default="runs/shelfwise/phase2_full/weights/best.pt")
    parser.add_argument("--conf", type=float, default=0.25)
    args = parser.parse_args()
    
    analyze_shelf(args.source, args.weights, args.conf)
