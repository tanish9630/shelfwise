from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import numpy as np
import cv2
import io
from PIL import Image
import os

app = FastAPI(title="Shelfwise AI Backend")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Using our brand new fine-tuned model
MODEL_PATH = r"C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\runs\detect\train9\weights\best.pt"
model = None

@app.on_event("startup")
async def load_model():
    global model
    print(f"Loading custom fine-tuned YOLO model: {MODEL_PATH}...")
    model = YOLO(MODEL_PATH)
    
    # Map the English names back so the API returns human-readable json
    model.model.names = {
        0: "Product",
        1: "Stockout",
        2: "Label_Price",
        3: "Label_Promo",
        4: "Obstruction",
        5: "Shelf_Rail"
    }
    
    print("Model loaded successfully.")

@app.get("/")
async def root():
    return {"message": "Shelfwise AI Backend is running", "model": MODEL_PATH}

@app.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        img_array = np.array(image)
        
        # Run inference
        results = model.predict(source=img_array, imgsz=640, conf=0.25)
        
        # Parse results
        detections = []
        for box in results[0].boxes:
            detections.append({
                "class": results[0].names[int(box.cls)],
                "confidence": float(box.conf),
                "bbox": [float(x) for x in box.xyxy[0]]
            })
            
        return {
            "count": len(detections),
            "detections": detections
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
