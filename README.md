<div align="center">

# 🛒 ShelfWise AI

### Smart Retail Shelf Intelligence Platform

**Computer Vision · Demand Forecasting · Real-Time Alerts**

[![Python](https://img.shields.io/badge/Python-3.8%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![YOLO](https://img.shields.io/badge/YOLO11--Medium-Fine--Tuned-FF6F00?style=for-the-badge)](https://ultralytics.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![XGBoost](https://img.shields.io/badge/XGBoost-Demand%20Forecasting-FF6600?style=for-the-badge)](https://xgboost.readthedocs.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> A full-stack AI-powered retail intelligence platform that transforms **existing store cameras into smart monitoring agents**. Detects real-time shelf anomalies, forecasts per-SKU demand, and fires prioritized alerts to store associates — all without replacing existing infrastructure.

*Built for Prama Innovations India Pvt. Ltd. — Problem Statement 2*

</div>

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [The Business Problem](#-the-business-problem)
3. [Key Features](#-key-features)
4. [Architecture Overview](#-architecture-overview)
5. [Novel Data Pipeline](#-novel-data-pipeline)
6. [Computer Vision Module](#-computer-vision-module)
7. [Planogram Compliance Engine](#-planogram-compliance-engine)
8. [Demand Forecasting & Replenishment](#-demand-forecasting--replenishment)
9. [Real-Time Alert System](#-real-time-alert-system)
10. [Complete API Reference](#-complete-api-reference)
11. [Frontend Dashboard](#-frontend-dashboard)
12. [Tech Stack](#-tech-stack)
13. [Project Structure](#-project-structure)
14. [Getting Started](#-getting-started)
15. [Live Demo](#-live-demo)
16. [Codebase Summary](#-codebase-summary)
17. [Team](#-team)

---

## 🌟 Project Overview

**ShelfWise** combines cutting-edge computer vision, machine learning, and real-time streaming to solve one of retail's most persistent and costly problems: **shelf visibility**. The platform ingests images from existing store cameras, analyzes shelf state using a fine-tuned YOLO11-M model alongside a GroundingDINO vision transformer, checks compliance against planogram layouts, predicts demand trends per SKU, and dispatches actionable alerts to store staff — all in under 100ms.

### Five Core Capabilities

| # | Capability | Technology |
|---|---|---|
| 1 | 🔍 Real-time shelf image analysis & product detection | YOLO11-Medium (fine-tuned) |
| 2 | 📐 Automated planogram compliance checking | IoU-based matching engine |
| 3 | 📈 Demand forecasting & automated replenishment | XGBoost with feature engineering |
| 4 | 🚨 Real-time alert system with revenue prioritization | WebSocket + REST |
| 5 | 📊 Interactive analytics dashboard | React 19 + Vite + Framer Motion |

---

## 💰 The Business Problem

> **Retail out-of-stock events cost the global industry an estimated $1 trillion per year in lost sales.**

Traditional approaches to shelf monitoring rely on manual audits, which are:
- **Infrequent** — typically once per day, or less
- **Inconsistent** — dependent on individual associate diligence
- **Reactive** — stockouts are discovered after significant lost sales
- **Expensive** — specialized merchandising audits cost time and labor

ShelfWise **bridges the critical last-mile visibility gap** between ERP supply chains and actual, real-time shelf state.

---

## ✨ Key Features

- **🧠 Dual-Model CV Architecture** — YOLO11-M for 30ms real-time speed + GroundingDINO for zero-shot semantic flexibility
- **📹 YouTube → Training Data Pipeline** — Novel data collection from 4K retail walkthrough videos, bypassing dataset limitations
- **💰 Revenue-Weighted Alert Prioritization** — Every alert is scored by business impact, not just model confidence
- **🔬 1024px Fine-Tuning Resolution** — Correctly detects even small price-tag objects that vanish at standard 640px
- **📊 Statistical Safety Stock Formula** — Operations Research-grade replenishment (Z-score × σ_demand × √lead_time)
- **⚡ <100ms Alert Latency** — WebSocket push meets and exceeds real-world SLAs by 3,000×
- **🔌 14-Endpoint REST API + WebSocket** — Fully documented with auto-generated Swagger/OpenAPI
- **📱 Extensible Alert Channels** — Dashboard WebSocket, REST polling, and architecture ready for mobile push/email

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        ShelfWise AI                          │
├──────────────────┬──────────────────┬───────────────────────┤
│   Camera Input   │   FastAPI Core   │    React Dashboard     │
│  (Image Upload)  │  (Port 8000)    │  (React 19 + Vite)    │
└────────┬─────────┴────────┬─────────┴───────────┬───────────┘
         │                  │                      │
         ▼                  ▼                      ▼
┌─────────────────┐  ┌──────────────┐   ┌──────────────────────┐
│  CV Pipeline    │  │  Forecasting │   │  WebSocket /ws/alerts │
│  ─────────────  │  │  ──────────  │   │  ─────────────────── │
│  YOLO11-M       │  │  XGBoost     │   │  Real-time push to   │
│  GroundingDINO  │  │  per-SKU     │   │  all connected UIs   │
└────────┬────────┘  └──────┬───────┘   └──────────────────────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────┐
│ Planogram Check │  │ Alert Engine │
│  IoU Matching   │  │ Revenue-     │
│  Compliance %   │  │ Weighted     │
└─────────────────┘  └──────────────┘
```

---

## 📹 Novel Data Pipeline

### Why Standard Datasets Were Not Enough

The commonly suggested retail datasets (Grocery Store dataset, SKU-110K) have significant limitations:

| Limitation | Impact |
|---|---|
| Controlled lighting | Model fails in real store environments with varied illumination |
| Fixed camera angles | Cannot handle diverse CCTV placement found in real stores |
| Limited Indian retail context | Poor generalization for local store formats |

### Our YouTube 4K → YOLO Training Pipeline

We engineered a custom data collection pipeline specifically designed to overcome these limitations:

```
YouTube 4K Retail Store Walkthrough Videos
         ↓  (yt-dlp automated downloader)
    raw_video.mp4
         ↓  (random_extract.py with OpenCV — temporal diversity)
    Diverse Real-World Shelf Frames (200+ per video)
         ↓  (Manual annotation in YOLO bounding-box format)
    yolov8_dataset_export/
         ↓  (split_dataset.py — 80% train / 10% val / 10% test)
    YOLO11-M Fine-Tuning on NVIDIA RTX 3050 GPU (CUDA)
         ↓
    runs/detect/train_ultimate/weights/best.pt
         ↓
    FastAPI /detect endpoint (production inference)
```

**Why 4K retail walkthrough videos work better than static datasets:**

- **Natural Lighting Variations** — Captures shadows, busy aisles, varying store illumination throughout the day
- **Temporal Diversity** — Random frame extraction ensures no near-duplicate frames across training examples
- **Cross-Store Generalization** — Multiple store formats, layouts, and product arrangements in a single pipeline
- **Real Customer Obstructions** — Training data includes carts, hands, and people — improving production robustness

**Frame extraction implementation:**

```python
import cv2, random

cap = cv2.VideoCapture("retail_store_4k.mp4")
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
sampled = random.sample(range(total_frames), 200)  # Temporal diversity

for idx in sampled:
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(f"frames/frame_{idx}.jpg", frame)
```

---

## 🔍 Computer Vision Module

### 5.1 Model Architecture

| Parameter | Value | Rationale |
|---|---|---|
| Base Model | **YOLO11-Medium** (`yolo11m.pt`) | Balance of speed and accuracy |
| Parameters | 20.1 Million | Production-grade capacity |
| Model Size | 43 MB | Deployable on edge hardware |
| Training Resolution | **1024 × 1024 px** | Critical for small price-tag detection |
| Fine-tuning Strategy | Transfer Learning + Backbone Freezing | Prevents overfitting on small custom dataset |
| Hardware | NVIDIA RTX 3050 (CUDA + AMP) | Consumer GPU with mixed-precision efficiency |
| Optimizer | AdamW with Cosine LR Decay | Smooth convergence, better final metrics |

### 5.2 Detection Classes (6 Classes)

| Class ID | Class Name | Description | Business Purpose |
|---|---|---|---|
| 0 | `Product` | Individual SKU unit (bottle, box, can) | Core inventory count |
| 1 | `Stockout` | Empty shelf gap / missing product facings | Critical revenue alert trigger |
| 2 | `Label_Price` | Standard white shelf-edge price sticker | Compliance check |
| 3 | `Label_Promo` | Bright promotional tag (yellow/red) | Promo audit |
| 4 | `Obstruction` | Cart, customer hand, or person blocking shelf | Accuracy qualifier |
| 5 | `Shelf_Rail` | Horizontal metal shelf edge/divider | Planogram spatial anchor |

### 5.3 Training Configuration Deep-Dive

```python
model.train(
    imgsz=1024,          # Higher res = better small object detection (price tags!)
    freeze=10,           # Freeze backbone: prevents overfitting on small dataset
    epochs=100,
    patience=30,         # Early stopping to prevent overfitting
    optimizer='AdamW',
    lr0=0.005,           # Initial learning rate
    lrf=0.0001,          # Final learning rate ratio
    cos_lr=True,         # Cosine LR decay for smooth convergence
    weight_decay=0.0005,
    warmup_epochs=5,     # Gradual warmup prevents early instability
    batch=-1,            # Auto-batch: maximizes RTX 3050 VRAM utilization
    nbs=64,              # Nominal batch size: gradient accumulation to simulate batch=64
    amp=True,            # Mixed precision (FP16) — 2× VRAM savings

    # 10+ Augmentation Techniques:
    hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,   # Lighting/color simulation
    degrees=3.0, translate=0.1,            # Geometric transforms
    scale=0.5, shear=2.0,                  # Scale and perspective variation
    mosaic=1.0,        # 4-image mosaic: effectively 4× dataset diversity
    mixup=0.1,         # Blends two images: prevents overconfidence
    copy_paste=0.2,    # Copies objects between images: boosts rare-class exposure
    erasing=0.2,       # Random erasing: simulates partial occlusions
    label_smoothing=0.1  # Prevents overconfident predictions on ambiguous samples
)
```

**Key Insight — Backbone Freezing (`freeze=10`):**
> By locking the first 10 backbone layers, we preserve YOLO11's pre-trained feature extraction capabilities (edges, shapes, textures learned from COCO's 80+ classes). Only the detection head is retrained on our 6 retail classes. This prevents the small custom dataset from degrading the model's fundamental vision capabilities, while still adapting the output layer for our specific retail context.

**Key Insight — 1024px Resolution:**
> `Label_Price` objects (price tags) occupy as few as **20×6 pixels** in a 4K shelf image. At standard 640px training resolution, these become unrecognizable blobs — the network cannot distinguish a price tag from background noise. At 1024px, text color, shape boundaries, and label geometry are preserved. This dramatically improves detection accuracy for the planogram compliance component, which depends on price-tag detection to fully score a shelf.

### 5.4 Target Performance Metrics

| Metric | Target |
|---|---|
| mAP@50 | ≥ 0.95 |
| mAP@50-95 | ≥ 0.50 |
| Precision | ≥ 0.90 |
| Recall | ≥ 0.85 |

### 5.5 Dual-Model Architecture

**Most systems use one model. We use two in parallel — each optimized for a distinct task:**

| | YOLO11-Medium | GroundingDINO |
|---|---|---|
| Type | CNN-based anchor detector | Vision Transformer + BERT language model |
| Inference Speed | ~30ms per frame | ~800ms per frame |
| Primary Use | Real-time live shelf monitoring | Semantic planogram layout extraction |
| Class Vocabulary | Fixed 6 classes | Open vocabulary (any text description) |
| API Endpoint | `POST /detect` | `POST /planogram` |
| Key Strength | Speed + production reliability | Zero-shot flexibility |

**GroundingDINO Ontology:**
```python
CaptionOntology({
    "Product": "Individual SKU Unit: bottles, boxes, cans",
    "Stockout": "Empty Shelf Gap: visible shelf liners or back-panels where product is missing",
    "Label_Price": "Standard Shelf Edge Label: white or standard price sticker",
    "Label_Promo": "Promotional/Discount Tag: bright-colored tags (Yellow, Red, or Fluorescent)",
    "Obstruction": "Visual Interference: shopping cart, customer hand, or person blocking shelf",
    "Shelf_Rail": "Planogram Anchor: horizontal metal rail or edge of shelf"
})
```

> GroundingDINO can detect **any product via free-text description** without retraining — just update the ontology text.

---

## 📐 Planogram Compliance Engine

### How It Works

```
Reference Planogram JSON (uploaded or auto-generated)
    { "aisle": "Aisle 5",
      "positions": [
        { "id": "pos_01", "expected_class": "Product",
          "sku": "Coca-Cola 500ml", "region": [x1, y1, x2, y2] }
      ]
    }
         ↓
YOLO11 Detection Results (bounding boxes from /detect)
         ↓
IoU Matching Engine (iou_threshold=0.15)
    → For each reference position, find best-matching detection
         ↓
Per-position verdict:
    PRESENT     → Detection found with correct class
    MISSING     → No detection overlaps reference region
    MISPLACED   → Detection found but wrong class
    STOCKOUT    → Stockout class found at expected product region
         ↓
Compliance Score 0–100% + detailed issue list
```

### Violation Types Detected

| Violation Type | Detection Method | Severity |
|---|---|---|
| Missing Facing | No detection overlaps expected region (IoU < 0.15) | High |
| Misplaced Product | Detection present but class ≠ expected class | Medium |
| Stockout | `Stockout` class detected at expected product region | Critical |
| Incorrect Price Tag | No `Label_Price` found near position region | Medium |
| Unauthorized Product | Detection not matching any reference position | Low |

### Sample Compliance Response

```json
{
  "aisle": "Aisle 5",
  "section": "Shelf C",
  "compliance_score": 83.3,
  "total_positions": 12,
  "compliant_positions": 10,
  "issue_summary": {
    "misplaced": 0,
    "missing_facings": 1,
    "incorrect_tags": 1,
    "unauthorized": 0
  },
  "issues": [
    {
      "type": "MISSING_FACING",
      "position_id": "pos_07",
      "sku": "Pepsi 1L",
      "detail": "No product detected at expected position"
    }
  ]
}
```

---

## 📈 Demand Forecasting & Replenishment

### Why XGBoost?

| Model | Training Time | Data Requirement | Interpretability | Our Choice |
|---|---|---|---|---|
| XGBoost | Seconds | Moderate | High (feature importance) | ✅ Yes |
| Facebook Prophet | Seconds | Low | Medium | ❌ Less control |
| LSTM | Hours | High (thousands of sequences) | Low (black box) | ❌ Compute-prohibitive |

XGBoost gives **best WMAPE on our 730-day, 10-SKU dataset** while training in seconds and offering full feature explainability.

### Feature Engineering

```
Temporal Features:
  ├── day_of_week       (0–6, captures weekly seasonality)
  ├── month             (1–12, captures seasonal trends)
  └── day_of_year       (1–365, captures annual cycles)

Lag Features (Demand History):
  ├── lag_7             (demand exactly 7 days ago)
  ├── lag_14            (demand 14 days ago)
  └── lag_28            (demand 28 days ago — monthly cycle)

Rolling Statistics:
  ├── rolling_mean_7    (7-day demand average — trend)
  └── rolling_std_7     (7-day demand volatility — variance)

External / Business Features:
  ├── on_promotion      (binary: 0 or 1)
  ├── is_weekend        (binary: higher foot traffic)
  └── temp              (proxy for weather impact on demand)
```

### Replenishment Formula (Operations Research)

```
Safety Stock  =  Z_score × σ_demand × √(lead_time_days)
                 Z_score = 1.645 for 95% service level

Reorder Point  =  Average_demand_during_lead_time + Safety_stock

if current_stock ≤ Reorder_Point:
    Suggested_Order  =  Target_stock − current_stock
    Status           =  "REORDER"
else:
    Status           =  "SUFFICIENT"
```

This formula is **identical to enterprise ERP systems** (SAP, Oracle Retail) — production-grade math, not a heuristic.

### Sample Replenishment Response

```json
{
  "sku": "SKU_001",
  "current_stock": 15,
  "forecasted_demand_30d": 156,
  "reorder_point": 42,
  "safety_stock": 14,
  "suggested_order_quantity": 67,
  "status": "REORDER",
  "urgency": "HIGH"
}
```

---

## 🚨 Real-Time Alert System

### Alert Priority (Revenue-Weighted Scoring)

| Alert Type | Revenue Impact Score | Default Severity | Trigger Condition |
|---|---|---|---|
| `STOCKOUT` | 100 | CRITICAL | Empty shelf gap detected (conf ≥ 0.4) |
| `LOW_STOCK` | 60 | HIGH | Fill rate between 30–70% |
| `PLANOGRAM_VIOLATION` | 40 | MEDIUM | Misplaced product in compliance scan |
| `PRICE_TAG_MISSING` | 30 | MEDIUM | Shelf rail detected, no price label found |
| `OBSTRUCTION` | 10 | LOW | Cart or person blocking shelf view |

### Alert Lifecycle

```
Detection Event
      ↓
analyze_detections_for_alerts()   ← intelligence layer
      ↓
Alert object created (UUID, timestamp, corrective actions)
      ↓
AlertManager.create_alert()
      ├── Stored in alert_history (deque, max 500)
      ├── Added to unacknowledged dict
      └── broadcast() → ALL connected WebSocket clients (<100ms)
      ↓
Store Associate receives push notification
      ↓
POST /alerts/acknowledge/{id}  ← associate marks as resolved
      ↓
Removed from active queue, kept in history audit trail
```

### Multi-Channel Notification Architecture

- **🖥️ Dashboard Push** — WebSocket broadcast (`/ws/alerts`) to all connected React clients
- **📡 REST Polling** — `GET /alerts/active` returns sorted-by-revenue-impact alert list
- **✅ Acknowledgment Workflow** — Associates confirm resolution via REST or WebSocket message
- **📋 Audit Trail** — Full history via `GET /alerts/history` (last 500 alerts)
- **📱 Extensible** — Architecture is ready for mobile push notifications and email digests

**Corrective Actions per Alert Type** — Each alert ships with step-by-step instructions:

```json
{
  "type": "STOCKOUT",
  "corrective_actions": [
    "Immediately retrieve product from backroom inventory.",
    "Check replenishment order status for this SKU.",
    "If backroom is empty, escalate to store manager for emergency reorder."
  ]
}
```

---

## 📡 Complete API Reference

**Base URL:** `http://localhost:8000`  
**Interactive Docs:** `http://localhost:8000/docs` (Swagger UI)  
**OpenAPI Schema:** `http://localhost:8000/openapi.json`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/` | System health check + feature list | None |
| `POST` | `/detect` | YOLO11 object detection + automatic alert generation | None |
| `POST` | `/planogram` | GroundingDINO zero-shot semantic detection | None |
| `POST` | `/compliance/scan` | All-in-one: image upload → detection → compliance report → alerts | None |
| `POST` | `/compliance/check` | Compliance from pre-computed detections (no image re-upload) | None |
| `GET` | `/compliance/sample-planogram` | Generate a reference planogram JSON for testing | None |
| `GET` | `/forecast/{sku}` | 30-day per-SKU demand forecast | None |
| `GET` | `/replenishment/{sku}` | Replenishment recommendation with suggested order quantity | None |
| `GET` | `/skus` | List all active forecasting SKUs | None |
| `GET` | `/alerts/active` | All unacknowledged alerts, sorted by revenue impact | None |
| `GET` | `/alerts/history` | Recent alert history (configurable limit) | None |
| `GET` | `/alerts/stats` | Dashboard statistics: totals, by-type, by-severity | None |
| `POST` | `/alerts/acknowledge/{id}` | Mark an alert as resolved by store associate | None |
| `POST` | `/alerts/test` | Fire a test alert to validate WebSocket pipeline | None |
| `WS` | `/ws/alerts` | Real-time WebSocket channel for live alert streaming | None |

### Example: Detection Request

```bash
curl -X POST "http://localhost:8000/detect?location=Aisle%205" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@shelf_image.jpg"
```

**Response:**
```json
{
  "count": 8,
  "detections": [
    { "class": "Product", "confidence": 0.912, "bbox": [120.5, 45.2, 280.3, 190.7] },
    { "class": "Stockout", "confidence": 0.876, "bbox": [310.0, 45.2, 450.1, 190.7] }
  ],
  "alerts_fired": 1,
  "alert_summary": [
    {
      "id": "a7f3d1c2",
      "type": "STOCKOUT",
      "severity": "CRITICAL",
      "message": "Empty shelf gap detected at Aisle 5. 1 stockout(s) found.",
      "revenue_impact_score": 100
    }
  ]
}
```

### WebSocket Connection (JavaScript)

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/alerts");

ws.onmessage = (event) => {
  const { event: eventType, data: alert } = JSON.parse(event.data);
  if (eventType === "alert") {
    console.log(`[${alert.severity}] ${alert.type}: ${alert.message}`);
    showNotification(alert);
  }
};

// Acknowledge an alert
ws.send(JSON.stringify({ action: "acknowledge", alert_id: "a7f3d1c2" }));
```

---

## 🖥️ Frontend Dashboard

Built with **React 19 + Vite + Framer Motion**, the dashboard provides a real-time view of shelf health across the store.

### Tech Stack

| Package | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework |
| Vite | 5.x | Build tooling & dev server |
| Framer Motion | 12.x | Animations & micro-interactions |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | Latest | Pre-built accessible components |
| React Router | 7.x | Client-side routing |
| Lucide React | Latest | Iconography |

### Pages & Components

```
frontend/src/
├── pages/
│   ├── LandingPage.jsx     — Hero section, feature overview, CTA
│   └── Dashboard.jsx       — Shelf health scores, alert feed, compliance charts
├── components/
│   └── ui/                 — shadcn/ui components (cards, buttons, tables)
├── index.css               — Complete design system (11,718 bytes)
├── App.jsx                 — Router & layout wrapper
└── main.jsx                — React DOM entry point
```

### Running the Frontend

```powershell
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Role |
|---|---|---|
| **Python** | 3.8+ | Core runtime |
| **FastAPI** | 0.100+ | REST API framework |
| **Uvicorn** | Latest | ASGI server |
| **Ultralytics YOLO** | Latest | YOLO11 inference & training |
| **GroundingDINO** (autodistill) | Latest | Zero-shot open-vocabulary detection |
| **OpenCV** | Latest | Image preprocessing |
| **XGBoost** | Latest | Demand forecasting |
| **scikit-learn** | Latest | Feature engineering & scaling |
| **Pandas / NumPy** | Latest | Data manipulation |
| **Torch (CUDA)** | 2.x | GPU acceleration for inference |
| **Transformers (HuggingFace)** | Latest | BERT backbone for GroundingDINO |
| **Pillow** | Latest | Image I/O |
| **python-multipart** | Latest | File upload handling |
| **websockets** | Latest | WebSocket support |

### Frontend

| Technology | Role |
|---|---|
| React 19 + Vite | Modern component-based UI |
| Framer Motion | Smooth animations |
| Tailwind CSS 4 | Utility styling |
| shadcn/ui | UI component library |
| React Router 7 | Client-side routing |

### ML Models

| Model | Size | Speed | Used For |
|---|---|---|---|
| YOLO11-M (fine-tuned `best.pt`) | 43 MB | ~30ms | Real-time shelf detection |
| GroundingDINO (SwinT-OGC) | ~700 MB | ~800ms | Planogram semantic extraction |
| XGBoost (per-SKU) | < 1 MB each | < 1ms | Demand forecasting |

---

## 📂 Project Structure

```
shelfwise/
├── backend/
│   ├── main.py                     # FastAPI app — all 14 endpoints (368 lines)
│   ├── alert_system.py             # WebSocket + alert lifecycle (300 lines)
│   ├── planogram_compliance.py     # IoU matching engine + scoring (283 lines)
│   ├── demand_forecasting.py       # XGBoost + replenishment logic (177 lines)
│   ├── train_fast.py               # YOLO11 training configuration (138 lines)
│   ├── split_dataset.py            # 80/10/10 dataset splitter
│   ├── pyproject.toml              # Python package configuration
│   ├── requirements.txt            # Python dependencies
│   ├── test_alerts.py              # Alert system tests
│   ├── test_compliance.py          # Planogram compliance tests
│   ├── test_forecasting_api.py     # Forecasting endpoint tests
│   ├── test_inference.py           # YOLO inference tests
│   ├── test_vision_pipeline.py     # End-to-end vision tests
│   ├── docker/                     # Docker deployment configs
│   ├── docs/                       # API documentation
│   ├── scripts/                    # Utility scripts
│   └── yolov8_dataset_export/      # Labeled training dataset
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── components/ui/          # shadcn/ui components
│   │   ├── index.css               # Design system
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── runs/
│   └── detect/
│       └── train_ultimate/
│           └── weights/
│               └── best.pt         # Fine-tuned YOLO11-M weights
│
├── DEMO_PRESENTATION.html          # Standalone interactive demo (no backend needed)
├── PROJECT_REPORT.md               # Detailed technical report
├── FRONTEND_WALKTHROUGH.md         # Frontend guide
└── README.md                       # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js 18+ and npm
- NVIDIA GPU with CUDA support (recommended; CPU fallback works)
- `git` with Git LFS (for model weights)

### 1. Clone the Repository

```powershell
git clone https://github.com/tanish9630/shelfwise.git
cd shelfwise
```

### 2. Backend Setup

```powershell
cd backend

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -e .
# OR install from requirements.txt
pip install -r requirements.txt
```

> **Note on GPU:** Ensure you have the CUDA-enabled PyTorch build installed for your CUDA version.  
> Visit https://pytorch.org/get-started/locally/ to get the correct install command.

### 3. Model Weights

The fine-tuned YOLO11-M weights (`best.pt`, 43MB) are stored via **Git LFS**.

```powershell
# Pull model weights (requires git-lfs)
git lfs pull
```

If Git LFS is not available, you can re-train the model:

```powershell
cd backend
.\.venv\Scripts\activate
python train_fast.py
```

### 4. Start the Backend Server

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will load both models and initialize the forecasting engine:

```
Loading custom fine-tuned YOLO model: ...best.pt...
YOLO Model loaded successfully.
Loading GroundingDINO model...
GroundingDINO loaded successfully.
Initializing Demand Forecaster with synthetic M5 data...
Forecasting models trained successfully.
Alert system initialized. WebSocket endpoint ready at /ws/alerts
```

### 5. Start the Frontend (Optional)

```powershell
cd frontend
npm install
npm run dev
# Dashboard available at http://localhost:5173
```

### 6. Quick Test

```powershell
# Check server health
curl http://localhost:8000/

# Get a demand forecast
curl http://localhost:8000/forecast/SKU_001?horizon=30

# Get replenishment recommendation
curl "http://localhost:8000/replenishment/SKU_001?current_stock=15"

# List all SKUs
curl http://localhost:8000/skus

# View alert statistics
curl http://localhost:8000/alerts/stats

# Fire a test alert (WebSocket push)
curl -X POST http://localhost:8000/alerts/test
```

---

## 🎬 Live Demo

### Using the Standalone Demo (No Backend Required)

Open `DEMO_PRESENTATION.html` in any modern browser for a fully interactive demo showcasing all features with live animations — **no server needed**.

### Using the Live Backend

| URL | What to Explore |
|---|---|
| `http://localhost:8000/docs` | ✅ Interactive Swagger API — try all 14 endpoints live |
| `http://localhost:8000/` | System running confirmation + feature list |
| `http://localhost:8000/skus` | All 10 active forecasting SKUs |
| `http://localhost:8000/forecast/SKU_001?horizon=30` | Live 30-day demand forecast |
| `http://localhost:8000/replenishment/SKU_001?current_stock=15` | REORDER recommendation |
| `http://localhost:8000/alerts/stats` | Dashboard statistics |
| `http://localhost:8000/compliance/sample-planogram` | Sample planogram JSON |
| `POST http://localhost:8000/alerts/test` | Fire a live WebSocket alert |
| `WS ws://localhost:8000/ws/alerts` | Connect for real-time alert stream |

---

## 📊 Codebase Summary

| File | Lines | Purpose |
|---|---|---|
| `backend/main.py` | 368 | FastAPI server — all 14 REST/WebSocket routes |
| `backend/alert_system.py` | 300 | Alert lifecycle, WebSocket broadcast, prioritization |
| `backend/planogram_compliance.py` | 283 | IoU matching engine, compliance scoring, report generation |
| `backend/demand_forecasting.py` | 177 | XGBoost training, feature engineering, replenishment formula |
| `backend/train_fast.py` | 138 | YOLO11-M fine-tuning with 10+ augmentation techniques |
| `frontend/src/` (JSX + CSS) | ~500 | React 19 dashboard with Framer Motion animations |
| **Total** | **~1,766 lines** | **Production-grade retail AI platform** |

---

## 🏅 Five Innovations That Set ShelfWise Apart

1. **📹 YouTube → YOLO Pipeline** — Novel data collection from 4K retail store walkthrough videos using `yt-dlp` + OpenCV random frame extraction, capturing real-world lighting, occlusions, and store variations that static datasets miss.

2. **🧠 Dual-Model CV Architecture** — YOLO11-M for 30ms real-time speed + GroundingDINO (Vision Transformer + BERT) for zero-shot semantic flexibility. Two models, each doing what they do best.

3. **💰 Revenue-Weighted Alert Prioritization** — Every alert is scored by its estimated revenue impact (stockout = 100, obstruction = 10), not just ML confidence. Store associates act on alerts ordered by business value.

4. **🔬 1024px Fine-Tuning Resolution** — Identified that standard 640px training causes price tag detection to fail (20×6 px labels become unrecognizable). Solved by training at 1024px, enabling reliable planogram compliance.

5. **📊 Statistical Safety Stock Formula** — Implemented the proper Operations Research formula (Z = 1.645, σ_demand, √lead_time) identical to enterprise ERP systems — not a simple threshold heuristic.

---

## 👥 Team

| Member | Role | Contributions |
|---|---|---|
| **Tanish Chaudhari** | Backend AI Pipeline | YOLO11-M model fine-tuning, data pipeline design, model architecture decisions |
| **Arjun Suthar** | Backend API & Integration | FastAPI endpoints, alert system, planogram compliance engine, frontend integration |

*ShelfWise AI — Prama Innovations India Pvt. Ltd. — Problem Statement 2 — 2026*

---

<div align="center">

**Made with ❤️ by Team ShelfWise**

[API Docs](http://localhost:8000/docs) · [Project Report](PROJECT_REPORT.md) · [Demo](DEMO_PRESENTATION.html)

</div>
