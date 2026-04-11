from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import numpy as np
import cv2
import io
from PIL import Image
import os
import torch
import urllib.request
from transformers import BertModel
from autodistill_grounding_dino import GroundingDINO
from autodistill.detection import CaptionOntology
import tempfile
from demand_forecasting import DemandForecaster, generate_synthetic_data, calculate_replenishment
from alert_system import AlertManager, AlertType, AlertSeverity, Alert, analyze_detections_for_alerts
from planogram_compliance import PlanogramComplianceEngine, generate_sample_planogram
from typing import Optional
from pydantic import BaseModel
import json as json_module

app = FastAPI(title="Shelfwise AI Backend")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Grounding DINO global patching and setup
config_dir = os.path.expanduser("~/.cache/autodistill/groundingdino")
config_path = os.path.join(config_dir, "GroundingDINO_SwinT_OGC.py")
os.makedirs(config_dir, exist_ok=True)

if not os.path.exists(config_path):
    print("Downloading missing GroundingDINO config...")
    url = "https://raw.githubusercontent.com/IDEA-Research/GroundingDINO/main/groundingdino/config/GroundingDINO_SwinT_OGC.py"
    urllib.request.urlretrieve(url, config_path)

def patch_bert():
    # Force patch because existing method might have incompatible signature
    def get_head_mask(self, head_mask, num_hidden_layers, is_attention_chunked=False):
        return [None] * num_hidden_layers
    BertModel.get_head_mask = get_head_mask

    def get_extended_attention_mask(self, attention_mask, input_shape, device=None, dtype=None):
        if device is None: device = torch.device("cpu")
        if attention_mask.dim() == 3:
            extended_attention_mask = attention_mask[:, None, :, :]
        elif attention_mask.dim() == 2:
            extended_attention_mask = attention_mask[:, None, None, :]
        else:
            extended_attention_mask = attention_mask
        return extended_attention_mask
    BertModel.get_extended_attention_mask = get_extended_attention_mask

patch_bert()

# Models & Services
MODEL_PATH = r"C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\runs\detect\train_ultimate\weights\best.pt"
yolo_model = None
gdino_model = None
gdino_ontology = None
forecaster = DemandForecaster()
historical_data = None
alert_manager = AlertManager()
compliance_engine = PlanogramComplianceEngine(iou_threshold=0.15)

@app.on_event("startup")
async def load_model():
    global yolo_model, gdino_model, gdino_ontology, historical_data
    
    # 1. Load YOLO
    print(f"Loading custom fine-tuned YOLO model: {MODEL_PATH}...")
    try:
        yolo_model = YOLO(MODEL_PATH)
        yolo_model.model.names = {0: "Product", 1: "Stockout", 2: "Label_Price", 3: "Label_Promo", 4: "Obstruction", 5: "Shelf_Rail"}
        print("YOLO Model loaded successfully.")
    except Exception as e:
        print(f"Error loading YOLO model: {e}")

    # 2. Load GroundingDINO
    print("Loading GroundingDINO model...")
    try:
        gdino_ontology = CaptionOntology({
            "Product": "Individual SKU Unit: bottles, boxes, cans",
            "Stockout": "Empty Shelf Gap: visible shelf liners or back-panels where product is missing",
            "Label_Price": "Standard Shelf Edge Label: white or standard price sticker",
            "Label_Promo": "Promotional/Discount Tag: bright-colored tags (Yellow, Red, or Fluorescent)",
            "Obstruction": "Visual Interference: shopping cart, customer hand, or person blocking shelf",
            "Shelf_Rail": "Planogram Anchor: horizontal metal rail or edge of shelf"
        })
        gdino_model = GroundingDINO(ontology=gdino_ontology, box_threshold=0.19, text_threshold=0.30)
        print("GroundingDINO loaded successfully.")
    except Exception as e:
        print(f"Error loading GroundingDINO model: {e}")

    # 3. Initialize Forecaster
    print("Initializing Demand Forecaster with synthetic M5 data...")
    try:
        historical_data = generate_synthetic_data(num_skus=10)
        forecaster.train(historical_data)
        print("Forecasting models trained successfully.")
    except Exception as e:
        print(f"Error initializing forecaster: {e}")

    print("Alert system initialized. WebSocket endpoint ready at /ws/alerts")

# ─── ROOT ───
@app.get("/")
async def root():
    return {
        "message": "Shelfwise AI Backend is running",
        "features": ["detection", "planogram_ocr", "forecasting", "real_time_alerts"],
        "websocket": "ws://localhost:8000/ws/alerts",
    }

# ─── YOLO DETECTION ───
@app.post("/detect")
async def detect_objects(file: UploadFile = File(...), location: str = "Aisle A"):
    if yolo_model is None:
        raise HTTPException(status_code=500, detail="YOLO Model not loaded.")
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        img_array = np.array(image)
        results = yolo_model.predict(source=img_array, imgsz=640, conf=0.25)
        
        detections = []
        for box in results[0].boxes:
            detections.append({
                "class": results[0].names[int(box.cls)],
                "confidence": float(box.conf),
                "bbox": [float(x) for x in box.xyxy[0]]
            })
        
        # Automatically analyze detections and fire alerts
        alerts_generated = analyze_detections_for_alerts(detections, location=location)
        for alert in alerts_generated:
            await alert_manager.create_alert(alert)
            
        return {
            "count": len(detections),
            "detections": detections,
            "alerts_fired": len(alerts_generated),
            "alert_summary": [a.to_dict() for a in alerts_generated[:5]],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── PLANOGRAM OCR ───
@app.post("/planogram")
async def extract_planogram(file: UploadFile = File(...)):
    if gdino_model is None:
        raise HTTPException(status_code=500, detail="GroundingDINO Model not loaded.")
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
            image.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            results = gdino_model.predict(temp_path)
            detections = []
            classes = gdino_ontology.classes()
            for i, box in enumerate(results.xyxy):
                class_id = results.class_id[i]
                class_name = classes[class_id] if class_id < len(classes) else str(class_id)
                detections.append({"class": class_name, "confidence": float(results.confidence[i]), "bbox": [float(x) for x in box]})
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        return {"count": len(detections), "detections": detections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── FORECASTING ───
@app.get("/forecast/{sku}")
async def get_forecast(sku: str, horizon: int = 30):
    if historical_data is None:
        raise HTTPException(status_code=500, detail="Historical data not loaded.")
    forecast = forecaster.forecast(historical_data, sku, horizon=horizon)
    if forecast is None:
        raise HTTPException(status_code=404, detail=f"SKU {sku} not found.")
    return {"sku": sku, "horizon": horizon, "forecast": forecast}

@app.get("/replenishment/{sku}")
async def get_replenishment(sku: str, current_stock: int = 50):
    if historical_data is None:
        raise HTTPException(status_code=500, detail="Historical data not loaded.")
    forecast = forecaster.forecast(historical_data, sku, horizon=30)
    if forecast is None:
        raise HTTPException(status_code=404, detail=f"SKU {sku} not found.")
    replenishment = calculate_replenishment(sku, forecast, current_stock)
    return replenishment

@app.get("/skus")
async def list_skus():
    if historical_data is None:
        return {"skus": []}
    return {"skus": historical_data['sku'].unique().tolist()}

# ─── REAL-TIME ALERTS: WebSocket ───
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket endpoint for real-time alert push notifications.
    
    Connect from any client (browser, mobile, dashboard) to receive
    live alerts as soon as a stockout or violation is detected.
    """
    await alert_manager.connect(websocket)
    try:
        while True:
            # Listen for client messages (e.g., acknowledgments)
            data = await websocket.receive_text()
            try:
                msg = __import__("json").loads(data)
                if msg.get("action") == "acknowledge" and msg.get("alert_id"):
                    success = alert_manager.acknowledge_alert(msg["alert_id"])
                    await websocket.send_json({
                        "event": "ack_response",
                        "alert_id": msg["alert_id"],
                        "success": success,
                    })
            except Exception:
                pass
    except WebSocketDisconnect:
        alert_manager.disconnect(websocket)

# ─── ALERTS: REST Endpoints ───
@app.get("/alerts/active")
async def get_active_alerts(severity: Optional[str] = None):
    """Get all unacknowledged alerts, sorted by revenue impact."""
    return {"alerts": alert_manager.get_active_alerts(severity)}

@app.get("/alerts/history")
async def get_alert_history(limit: int = 50):
    """Get recent alert history."""
    return {"alerts": alert_manager.get_alert_history(limit)}

@app.get("/alerts/stats")
async def get_alert_stats():
    """Get alert system statistics for dashboard."""
    return alert_manager.get_stats()

@app.post("/alerts/acknowledge/{alert_id}")
async def acknowledge_alert(alert_id: str):
    """Acknowledge an alert (mark as handled)."""
    success = alert_manager.acknowledge_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found or already acknowledged.")
    return {"message": f"Alert {alert_id} acknowledged.", "success": True}

@app.post("/alerts/test")
async def fire_test_alert():
    """Fire a test alert to verify the WebSocket pipeline."""
    alert = Alert(
        alert_type=AlertType.STOCKOUT,
        severity=AlertSeverity.CRITICAL,
        message="[TEST] Simulated stockout detected in Aisle 3, Shelf B.",
        location="Aisle 3, Shelf B",
        sku="SKU_TEST_001",
        confidence=0.95,
    )
    await alert_manager.create_alert(alert)
    return {"message": "Test alert fired.", "alert": alert.to_dict()}

# ─── PLANOGRAM COMPLIANCE ───
class ComplianceRequest(BaseModel):
    """Request body for compliance check with pre-computed detections."""
    reference: dict  # planogram reference JSON
    detections: list  # list of detection dicts from /detect

@app.post("/compliance/check")
async def check_compliance(request: ComplianceRequest):
    """
    Check planogram compliance given a reference layout and detections.
    Send pre-computed detections (from /detect) along with the planogram reference.
    """
    report = compliance_engine.check_compliance(request.reference, request.detections)
    return report

@app.post("/compliance/scan")
async def compliance_scan(file: UploadFile = File(...), planogram_json: str = ""):
    """
    All-in-one: Upload an image + planogram reference JSON string.
    Runs YOLO detection, then checks compliance against the reference.
    If no planogram_json is provided, uses a sample planogram.
    """
    if yolo_model is None:
        raise HTTPException(status_code=500, detail="YOLO Model not loaded.")
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        img_array = np.array(image)
        img_h, img_w = img_array.shape[:2]

        # Run YOLO
        results = yolo_model.predict(source=img_array, imgsz=640, conf=0.25)
        detections = []
        for box in results[0].boxes:
            detections.append({
                "class": results[0].names[int(box.cls)],
                "confidence": float(box.conf),
                "bbox": [float(x) for x in box.xyxy[0]]
            })

        # Parse or generate planogram reference
        if planogram_json and planogram_json.strip():
            reference = json_module.loads(planogram_json)
        else:
            reference = generate_sample_planogram(img_w, img_h)

        # Run compliance
        report = compliance_engine.check_compliance(reference, detections)

        # Fire alerts for issues
        for issue in report.get("issues", []):
            if issue["type"] == "MISSING_FACING":
                alert = Alert(
                    alert_type=AlertType.STOCKOUT,
                    severity=AlertSeverity.HIGH,
                    message=f"Compliance: {issue['detail']}",
                    location=f"{report['aisle']}, {report['section']}",
                )
                await alert_manager.create_alert(alert)
            elif issue["type"] == "MISPLACED_PRODUCT":
                alert = Alert(
                    alert_type=AlertType.PLANOGRAM_VIOLATION,
                    severity=AlertSeverity.MEDIUM,
                    message=f"Compliance: {issue['detail']}",
                    location=f"{report['aisle']}, {report['section']}",
                )
                await alert_manager.create_alert(alert)

        return {
            "detection_count": len(detections),
            "detections": detections,
            "compliance_report": report,
        }
    except json_module.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid planogram JSON.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/compliance/sample-planogram")
async def get_sample_planogram(width: int = 3840, height: int = 2160):
    """Get a sample planogram reference JSON for testing."""
    return generate_sample_planogram(width, height)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
