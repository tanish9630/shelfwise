<div align="center">
  <img src="DEMO_PRESENTATION.html" width="0" height="0" /> <!-- Added just for github context if hosted -->
  <h1>⚡ ShelfWise AI</h1>
  <p><strong>Smart Retail Shelf Intelligence: Computer Vision-Driven Inventory Monitoring and Demand Optimization</strong></p>
  <p><em>Prama Innovations India Pvt. Ltd. — Problem Statement 2</em></p>
</div>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#key-innovations">Key Innovations</a> •
  <a href="#system-architecture">Architecture</a> •
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a>
</p>

---

## 🚀 Overview

Retail out-of-stock events cost the global industry an estimated **$1 trillion annually** in lost sales. **ShelfWise** bridges the last-mile visibility gap between supply chain ERP systems and what's actually on the shelf. 

It transforms existing store security cameras into intelligent monitoring agents that provide:
- Real-time stockout detection using custom YOLO11 models.
- Automated planogram compliance verification against JSON schemas.
- Operations-research grade demand forecasting for SKUs.
- High-priority, real-time WebSocket alerts to store associates.

---

## 🔥 Key Innovations & Differentiators

This project introduces several production-grade practices that set it apart from basic implementations:

1. **Custom YouTube-to-YOLO Data Pipeline**: Standard datasets fail to capture natural lighting and angles. We built a pipeline capturing 4K retail store walkthrough videos from YouTube using `yt-dlp` and extracted diverse training frames using an OpenCV randomization script.
2. **Dual-Model Vision Architecture**: 
   - **YOLO11-Medium** handles fast, real-time detection (~30ms) for known SKUs.
   - **GroundingDINO** runs alongside for zero-shot semantic understanding, parsing text descriptions like *"promotional tag: bright yellow sticker"*.
3. **1024px High-Res Fine-Tuning**: Standard object detectors downscale to 640px, causing small objects like price tags to blur. We fine-tuned our network on `1024x1024` with backbone freezing, drastically boosting precision for planogram compliance.
4. **Revenue-Weighted Alerting**: Alerts are dynamically prioritized based on projected revenue impact (e.g., Stockouts = 100 points vs Obstructions = 10 points) over WebSockets (<100ms latency).
5. **Statistical Safety Stock Forecasting**: Replenishment uses real OR logic—forecasting with XGBoost + calculating a 95th percentile Z-Score safety stock instead of arbitrary thresholds.

---

## 🧠 System Architecture

The ecosystem relies on an asynchronous event-driven backend built with FastAPI and a modern frontend UI.

```mermaid
graph TD
    A[Store Camera Feed] -->|Frames| B(FastAPI Backend)
    B --> C{CV Engine}
    C -->|Real-Time (30ms)| D[YOLO11-M Model]
    C -->|Semantic (800ms)| E[GroundingDINO]
    D --> F[Planogram IoU Matcher]
    E --> F
    F --> G{Alert Engine}
    G -->|Priority Ranking| H((WebSocket Push))
    H --> I[Store Associate Dashboard]
    D --> J[XGBoost Forecasting]
    J --> K[Replenishment System]
```

---

## 🛠️ Features Addressed

✅ **Shelf Image Analysis & Product Detection:** 6 unique classes (`Product`, `Stockout`, `Label_Price`, `Label_Promo`, `Obstruction`, `Shelf_Rail`) detecting presence, gaps, and interference under partial occlusions.\
✅ **Automated Planogram Compliance:** An IoU-based matching engine takes the intended shelf layout (Structured JSON) and compares it against live detections generating an aisle-level compliance store (0-100%).\
✅ **Demand Forecasting & Replenishment:** 30-day time-series XGBoost per-SKU predictions utilizing engineered features like temperature proxy, season, lag variables, and promotional flags.\
✅ **Real-Time Alert System:** WebSocket driven pipeline distributing categorized actions and corrective procedures in under 100 milliseconds.\
✅ **Management Dashboard:** A complete React + Vite UI.

---

## 💻 Tech Stack

- **Computer Vision:** YOLO11 (Ultralytics), GroundingDINO, PyTorch, OpenCV
- **Backend API:** Python, FastAPI, Uvicorn, WebSockets
- **Data & Forecasting:** XGBoost, Scikit-Learn, Pandas, NumPy
- **Frontend Dashboard:** React 18, Vite, Tailwind CSS, shadcn/ui

---

## 🏁 Getting Started

### 1. Backend Setup

Launch the FastAPI intelligent core:

```bash
cd backend
uv sync               # Installs all required dependencies (via uv)
source .venv/scripts/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> **API Docs**: Navigate to `http://localhost:8000/docs` to test all 14 endpoints interactively (Detection, Forecasting, and WebSockets).

### 2. Frontend Dashboard

Run the operations UI:

```bash
cd frontend
npm install
npm run dev
```

> **Interactive Demo**: Alternatively, open `DEMO_PRESENTATION.html` in your browser for a standalone, animated presentation interface requiring no backend setup.

---

## 👥 Contributors
- **Tanish Chaudhari** 
- **Arjun Suthar** 
- **[Frontend Team Member]** 

*Built for the Prama Innovations India Pvt. Ltd. Hackathon 2026*
