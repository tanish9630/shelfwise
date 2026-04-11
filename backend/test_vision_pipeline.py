import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000"
# Choosing the image from the dataset we found
IMAGE_PATH = r"C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\backend\yolov8_dataset_export (1)\test\images\Dubai 4K] Waitrose Supermarket Virtual Tour - Part 1 - Copy_frame_02947.jpg"

# Fallback to the screenshot if dataset path is complex
if not os.path.exists(IMAGE_PATH):
    # Try finding any jpg in that directory if the specific one was truncated
    test_dir = r"C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\backend\yolov8_dataset_export (1)\test\images"
    if os.path.exists(test_dir):
        files = [f for f in os.listdir(test_dir) if f.endswith('.jpg')]
        if files:
            IMAGE_PATH = os.path.join(test_dir, files[0])

def test_vision():
    if not os.path.exists(IMAGE_PATH):
        print(f"Error: Could not find image at {IMAGE_PATH}")
        return

    print(f"Testing Vision Pipeline with: {os.path.basename(IMAGE_PATH)}")
    
    with open(IMAGE_PATH, 'rb') as f:
        file_bytes = f.read()
        files = {'file': (os.path.basename(IMAGE_PATH), file_bytes, 'image/jpeg')}
        
        # 1. Test YOLO Detection (Fine-tuned)
        print("\n--- [1] YOLO (Fine-tuned) Detection ---")
        try:
            r1 = requests.post(f"{BASE_URL}/detect", files=files)
            if r1.status_code == 200:
                data = r1.json()
                print(f"Detected {data['count']} objects.")
                # Show top 5
                for d in data['detections'][:5]:
                    print(f" - {d['class']} ({d['confidence']:.2f}) at {d['bbox']}")
            else:
                print(f"YOLO failed: {r1.text}")
        except Exception as e:
            print(f"Error connecting to YOLO: {e}")

        # Reset file pointer for next request
        files = {'file': (os.path.basename(IMAGE_PATH), file_bytes, 'image/jpeg')}

        # 2. Test GroundingDINO Planogram OCR
        print("\n--- [2] GroundingDINO Planogram OCR ---")
        try:
            r2 = requests.post(f"{BASE_URL}/planogram", files=files)
            if r2.status_code == 200:
                data = r2.json()
                print(f"Detected {data['count']} semantic elements.")
                # Show top 5
                for d in data['detections'][:5]:
                    print(f" - {d['class']} ({d['confidence']:.2f})")
            else:
                print(f"GroundingDINO failed: {r2.text}")
        except Exception as e:
            print(f"Error connecting to GroundingDINO: {e}")

if __name__ == "__main__":
    test_vision()
