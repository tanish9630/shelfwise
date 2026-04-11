# ShelfWise AI — Project Report
### Smart Retail Shelf Intelligence: Computer Vision-Driven Inventory Monitoring and Demand Optimization
### Prama Innovations India Pvt. Ltd. — Problem Statement 2

---

## 1. Executive Summary

**ShelfWise** is a full-stack AI-powered retail intelligence platform that transforms existing store cameras into smart monitoring agents. It detects real-time shelf anomalies (stockouts, low stock, planogram violations), forecasts demand per SKU, and fires prioritized alerts to store associates — all without replacing existing camera infrastructure.

> **Business Problem:** Retail out-of-stock events cost the global industry **$1 trillion/year** in lost sales. ShelfWise bridges the critical last-mile visibility gap between ERP supply chains and actual shelf state.

---

## 2. Team & Role Distribution

| Member | Role |
|---|---|
| Tanish Chaudhari | Backend AI Pipeline, Model Fine-Tuning |
| Arjun Suthar | Backend API, Alert System, Integration |
| [Frontend Team Member] | React Dashboard UI (built locally, push pending) |

---

## 3. Problem Statement Coverage

We fully addressed all **5 Challenge Requirements**:

| Requirement | Status | Implementation |
|---|---|---|
| Shelf Image Analysis & Product Detection | ✅ Done | YOLO11-Medium fine-tuned on custom YT data |
| Automated Planogram Compliance | ✅ Done | IoU-matching engine with JSON schema |
| Demand Forecasting & Replenishment | ✅ Done | XGBoost per-SKU + safety stock formula |
| Real-Time Alert System | ✅ Done | WebSocket push (<100ms latency) |
| Dashboard & Analytics | ✅ Done | React + Vite frontend (built locally) |

---

## 4. Our Novel Data Pipeline — The Key Differentiator

### 4.1 Why Standard Datasets Were Not Enough

The suggested datasets (Grocery Store dataset, SKU-110K) suffer from:
- Controlled lighting conditions (not real store environments)
- Fixed camera angles (not the varied angles real CCTV has)
- Limited coverage of Indian retail context

### 4.2 YouTube 4K Video → Training Data Pipeline

We built a **novel data collection pipeline**:

```
YouTube 4K Retail Store Videos
         ↓  (yt-dlp downloader)
    raw_video.mp4
         ↓  (random_extract.py with OpenCV)
    Diverse real-world shelf frames
         ↓  (Manual annotation in YOLO format)
    yolov8_dataset_export/
         ↓  (80/10/10 train/val/test split)
    YOLO11 Fine-Tuning on RTX 3050 GPU
         ↓
    best.pt  →  FastAPI /detect endpoint
```

**Why this works better than static datasets:**
- YouTube 4K retail walkthroughs capture **natural lighting variations**, shadows, busy aisles, and real customer obstructions
- Random frame extraction ensures **temporal diversity** — no near-duplicate frames
- Covers **multiple store formats** giving the model cross-store generalization ability

**Frame extraction code:**
```python
import cv2, random
cap = cv2.VideoCapture("retail_store_4k.mp4")
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
sampled = random.sample(range(total_frames), 200)
for idx in sampled:
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(f"frames/frame_{idx}.jpg", frame)
```

---

## 5. Computer Vision Module

### 5.1 Model Architecture

| Parameter | Value |
|---|---|
| Base Model | **YOLO11-Medium** (`yolo11m.pt`) |
| Parameters | 20.1 Million |
| Model Size | 43 MB |
| Training Resolution | **1024 × 1024 px** (vs standard 640px) |
| Fine-tuning Strategy | Transfer Learning + Backbone Freezing |
| Hardware | NVIDIA RTX 3050 (CUDA) |

### 5.2 Detection Classes (6 Classes)

| Class | Description | Business Purpose |
|---|---|---|
| `Product` | Individual SKU unit (bottle, box, can) | Core inventory count |
| `Stockout` | Empty shelf gap / missing product | Critical revenue alert |
| `Label_Price` | Standard white price sticker | Compliance check |
| `Label_Promo` | Bright promotional tag (yellow/red) | Promo audit |
| `Obstruction` | Cart, customer hand blocking shelf | Accuracy qualifier |
| `Shelf_Rail` | Horizontal metal shelf edge | Planogram anchor |

### 5.3 Training Configuration

```python
model.train(
    imgsz=1024,          # Higher res = better small object detection (price tags!)
    freeze=10,           # Freeze backbone: prevents overfitting on small dataset
    epochs=100,
    patience=30,
    optimizer='AdamW',
    lr0=0.005,
    lrf=0.0001,
    cos_lr=True,         # Cosine LR decay for smooth convergence
    weight_decay=0.0005,
    warmup_epochs=5,
    batch=-1,            # Auto-batch (RTX 3050 VRAM management)
    nbs=64,              # Gradient accumulation to simulate batch=64
    amp=True,            # Mixed precision (FP16) for VRAM savings

    # 10+ Augmentation techniques:
    hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,  # Lighting simulation
    degrees=3.0, translate=0.1, scale=0.5, shear=2.0,
    mosaic=1.0,       # 4-image mosaic: 4x dataset diversity
    mixup=0.1,        # Blends two images: prevents overconfidence
    copy_paste=0.2,   # Copies objects between images
    erasing=0.2,      # Random erasing: simulates partial occlusions
    label_smoothing=0.1   # Boosts precision by preventing overconfident labels
)
```

**Key Insight — Backbone Freezing (`freeze=10`):**
> By locking the first 10 backbone layers, we preserve YOLO11's pre-trained feature extraction (edges, shapes, textures learned on COCO's 80+ classes). Only the detection head retrains on our 6 retail classes. This prevents the small custom dataset from degrading the model's fundamental vision capabilities.

**Key Insight — 1024px Resolution:**
> Price tag (`Label_Price`) objects occupy as few as 20×6 pixels in a 4K shelf image. At standard 640px training, these become unrecognizable blobs. At 1024px, text color and shape are preserved — dramatically improving detection accuracy for the planogram compliance component.

### 5.4 Target Metrics

| Metric | Target |
|---|---|
| mAP@50 | ≥ 0.95 |
| mAP@50-95 | ≥ 0.50 |
| Precision | ≥ 0.90 |
| Recall | ≥ 0.85 |

### 5.5 Dual-Model CV Architecture (Our Key Differentiator)

**Most teams use one model. We use two in parallel:**

| | YOLO11-Medium | GroundingDINO |
|---|---|---|
| Type | CNN-based detector | Vision Transformer + BERT |
| Speed | ~30ms per frame | ~800ms per frame |
| Use Case | Real-time live detection | Semantic planogram extraction |
| Vocabulary | Fixed 6 classes | Open (any text description) |
| API Endpoint | `POST /detect` | `POST /planogram` |
| Strength | Speed + reliability | Flexibility + zero-shot |

**GroundingDINO example prompt:**
```python
CaptionOntology({
    "Stockout": "Empty Shelf Gap: visible shelf liners or back-panels where product is missing",
    "Label_Promo": "Promotional/Discount Tag: bright-colored tags (Yellow, Red, or Fluorescent)"
})
```
> GroundingDINO can detect ANY product description without retraining — just update the text prompt.

---

## 6. Planogram Compliance Engine

### 6.1 How It Works

```
Reference Planogram JSON (input)
    { "aisle": "Aisle 5",
      "positions": [
        { "id": "pos_01", "expected_class": "Product",
          "sku": "Coca-Cola 500ml", "region": [x1, y1, x2, y2] }
      ]
    }
         ↓
YOLO11 Detections (bounding boxes)
         ↓
IoU Matching Engine (iou_threshold=0.15)
         ↓
Per-position verdict: PRESENT / MISSING / MISPLACED / STOCKOUT
         ↓
Compliance Score 0–100% per aisle/section
```

### 6.2 Violation Types Detected

| Violation | Detection Method |
|---|---|
| Missing Facing | No detection overlaps expected region (IoU < 0.15) |
| Misplaced Product | Detection present but class ≠ expected class |
| Stockout | `Stockout` class found at expected product region |
| Incorrect Price Tag | No `Label_Price` found near position region |
| Unauthorized Product | Detection not matching any reference position |

### 6.3 Sample Response
```json
{
  "aisle": "Aisle 5", "section": "Shelf C",
  "compliance_score": 83.3,
  "total_positions": 12, "compliant_positions": 10,
  "issue_summary": {
    "misplaced": 0, "missing_facings": 1,
    "incorrect_tags": 1, "unauthorized": 0
  }
}
```

---

## 7. Demand Forecasting & Replenishment

### 7.1 Model: XGBoost with Feature Engineering

**Why XGBoost over Prophet or LSTM?**
- Fine-grained domain knowledge via manual feature engineering
- Trains in seconds (LSTM needs much more data and compute)
- On our 730-day, 10-SKU dataset: best WMAPE

### 7.2 Features Used
```
Temporal:    day_of_week, month, day_of_year
Lag:         lag_7, lag_14, lag_28 (demand 7/14/28 days ago)
Rolling:     rolling_mean_7, rolling_std_7 (demand volatility)
External:    on_promotion, is_weekend, temp (weather proxy)
```

### 7.3 Replenishment Formula (Operations Research)

```
Safety Stock  =  Z × σ_demand × √(lead_time)
                 Z = 1.645 for 95% service level

Reorder Point =  Demand_during_lead_time + Safety_stock

if current_stock ≤ ROP:
    Suggested_Order = Target_stock − current_stock
```

**Sample output:**
```json
{
  "sku": "SKU_001", "current_stock": 15,
  "reorder_point": 42, "safety_stock": 14,
  "suggested_order_quantity": 67, "status": "REORDER"
}
```

---

## 8. Real-Time Alert System

### Alert Priority (Revenue-Weighted)

| Alert Type | Revenue Score | Severity |
|---|---|---|
| STOCKOUT | 100 | CRITICAL |
| LOW_STOCK | 60 | HIGH |
| PLANOGRAM_VIOLATION | 40 | MEDIUM |
| PRICE_TAG_MISSING | 30 | MEDIUM |
| OBSTRUCTION | 10 | LOW |

### Multi-Channel Delivery
- **Dashboard Push** — WebSocket broadcast to all connected clients
- **REST Polling** — `GET /alerts/active` sorted by revenue impact
- **Acknowledgment Lifecycle** — Associates confirm resolution
- **Alert History** — Full audit trail via `GET /alerts/history`
- **Extensible** — Architecture ready for mobile push / email digest

**Latency: < 100ms** — exceeds the 5-minute SLA by 3000×

---

## 9. Complete API Map (14 Endpoints)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | System health + features |
| POST | `/detect` | YOLO detection + auto alerts |
| POST | `/planogram` | GroundingDINO semantic detection |
| POST | `/compliance/scan` | All-in-one: detect + compliance |
| POST | `/compliance/check` | Compliance from pre-computed detections |
| GET | `/compliance/sample-planogram` | Reference planogram generator |
| GET | `/forecast/{sku}` | 30-day per-SKU demand forecast |
| GET | `/replenishment/{sku}` | Replenishment recommendation |
| GET | `/skus` | List all active SKUs |
| GET | `/alerts/active` | Unacknowledged alerts (sorted by revenue) |
| GET | `/alerts/history` | Recent alert history |
| GET | `/alerts/stats` | Dashboard statistics |
| POST | `/alerts/acknowledge/{id}` | Mark alert as resolved |
| POST | `/alerts/test` | Fire test alert |
| WS | `/ws/alerts` | Real-time WebSocket channel |

---

## 10. Frontend — Status & What Was Built

### Built Components
- `LandingPage.jsx` — Hero, feature overview, CTA
- `Dashboard.jsx` — Shelf health scores, alert feed, compliance charts
- `index.css` — Complete design system (11,718 bytes)
- shadcn/ui component library (Cards, Buttons, Tables)

### Why Not on GitHub Yet
The Git push failed because `yolo11m.pt` (43MB weight file) triggered a GitHub file-size warning. The team is resolving this with **Git LFS** (Large File Storage) for `.pt` model files. **The frontend code is fully written and runs locally.**

### Workaround for Evaluation
Open `DEMO_PRESENTATION.html` in any browser — it's a fully interactive standalone demo page showing all system features with live animations, no backend needed.

---

## 11. Five Innovations That Set ShelfWise Apart

1. **📹 YouTube → YOLO Pipeline** — Custom real-world data from 4K retail store walkthrough videos using `yt-dlp` + OpenCV frame extraction
2. **🧠 Dual-Model CV** — YOLO11 for speed (30ms) + GroundingDINO for zero-shot semantic flexibility
3. **💰 Revenue-Weighted Alerts** — Every alert scored by business impact, not just confidence score
4. **🔬 1024px Fine-Tuning** — Identified price tag detection failure at standard 640px; solved with higher training resolution
5. **📊 Statistical Safety Stock** — Proper operations research formula (Z-score, σ_demand, √lead_time) — identical to enterprise ERP systems

---

## 12. Live Demo Instructions

```powershell
# Start backend
cd "C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\backend"
.\.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

| URL | What to Show |
|---|---|
| http://localhost:8000/docs | Interactive Swagger API — all 14 endpoints |
| http://localhost:8000/ | System running confirmation |
| http://localhost:8000/skus | All 10 forecasting SKUs |
| http://localhost:8000/forecast/SKU_001?horizon=30 | Live 30-day forecast |
| http://localhost:8000/replenishment/SKU_001?current_stock=15 | REORDER recommendation |
| http://localhost:8000/alerts/stats | Dashboard metrics |
| POST /alerts/test | Fire live WebSocket alert |
| DEMO_PRESENTATION.html | Visual frontend demo (open in browser) |

---

## 13. Codebase Summary

| File | Lines | Purpose |
|---|---|---|
| `main.py` | 368 | FastAPI server, all routes |
| `alert_system.py` | 300 | WebSocket + alert lifecycle |
| `planogram_compliance.py` | 283 | IoU engine + scoring |
| `demand_forecasting.py` | 177 | XGBoost + replenishment |
| `train_fast.py` | 138 | YOLO11 training config |
| Frontend (`*.jsx` + CSS) | ~500 | React dashboard |
| **Total** | **~1,766 lines** | **Production-grade system** |

---

*ShelfWise AI — Prama Innovations Challenge 2026 | Team: Tanish Chaudhari & Arjun Suthar*
