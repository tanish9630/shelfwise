import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* NAV */}
      <nav className="nav">
        <span className="nav-logo">⚡ ShelfWise</span>
        <div className="nav-links">
          <a href="#pipeline">Pipeline</a>
          <a href="#features">Features</a>
          <a href="#arch">Architecture</a>
          <span className="nav-badge">🟢 AI System Live</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" style={{ paddingTop: '120px', maxWidth: '100%' }}>
        <div className="badge"><span className="badge-dot" />Prama Innovations Challenge — Problem Statement 2</div>
        <h1>ShelfWise AI</h1>
        <p className="hero-sub">
          Smart Retail Shelf Intelligence powered by Fine-Tuned YOLO11 + GroundingDINO.
          Real-time stockout detection, planogram compliance, and AI-driven demand forecasting.
        </p>
        <div className="hero-stats">
          <div className="hstat"><div className="hstat-n">$1T</div><div className="hstat-l">Annual retail loss from stockouts</div></div>
          <div className="hstat"><div className="hstat-n">6</div><div className="hstat-l">CV detection classes</div></div>
          <div className="hstat"><div className="hstat-n">&lt;100ms</div><div className="hstat-l">Alert delivery via WebSocket</div></div>
          <div className="hstat"><div className="hstat-n">12+</div><div className="hstat-l">Backend API endpoints</div></div>
        </div>
        <div className="cta-row">
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            🚀 Open Dashboard
          </button>
          <button className="btn-outline" onClick={() => window.open('http://localhost:8000/docs', '_blank')}>
            📡 API Docs
          </button>
        </div>
      </section>

      <div className="divider" />

      {/* PIPELINE */}
      <section id="pipeline" className="section">
        <div className="sec-label">System Architecture</div>
        <h2 className="sec-title">End-to-End Intelligence Pipeline</h2>
        <p className="sec-desc">From raw camera feed to actionable replenishment order — in under 5 minutes.</p>
        <div className="pipeline">
          {[
            { icon: '📹', title: 'Camera Feed', desc: 'Existing store CCTV feeds or uploaded shelf images. Training data from 4K YouTube retail videos via yt-dlp.' },
            { icon: '🧠', title: 'YOLO11-M Inference', desc: 'Fine-tuned on custom retail dataset. 1024px resolution, 6 classes, backbone freezing, GPU accelerated.' },
            { icon: '🗺️', title: 'Planogram Check', desc: 'IoU-matching engine compares detections against reference layout. Compliance score per aisle/section.' },
            { icon: '🔔', title: 'Alert Engine', desc: 'Revenue-weighted prioritization. WebSocket push to all clients under 100ms. Corrective actions included.' },
            { icon: '📈', title: 'Demand Forecast', desc: 'XGBoost per-SKU model. 730-day history, lag features, seasonal patterns, auto replenishment orders.' },
          ].map((s, i) => (
            <div key={i} className="pipe-step">
              <div className="pipe-icon">{s.icon}</div>
              <div className="pipe-title">{s.title}</div>
              <div className="pipe-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* FEATURES */}
      <section id="features" className="section">
        <div className="sec-label">Key Capabilities</div>
        <h2 className="sec-title">Everything You Need</h2>
        <p className="sec-desc">A complete shelf intelligence platform addressing all challenge requirements.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {[
            { icon: '🔍', title: 'SKU-Level Detection', desc: 'YOLO11-M detects product presence, stockouts, low stock, and price labels at 94%+ confidence across varying lighting and angles.', color: 'var(--primary)' },
            { icon: '🗺️', title: 'Planogram Compliance', desc: 'IoU-matching engine generates per-aisle compliance scores. Identifies missing facings, misplaced products, and unauthorized items.', color: 'var(--accent)' },
            { icon: '📈', title: 'Demand Forecasting', desc: 'XGBoost models per SKU with 30-day rolling forecasts, safety stock calculation, and automated reorder recommendations.', color: 'var(--success)' },
            { icon: '🔔', title: 'Real-Time Alerts', desc: 'WebSocket pipeline delivers revenue-weighted alerts in <100ms. Multi-channel: dashboard, mobile, email digests.', color: 'var(--warning)' },
            { icon: '📊', title: 'Analytics Dashboard', desc: 'Shelf health scores, stockout heatmaps by aisle/time, compliance trends, forecast accuracy, and visual floor maps.', color: 'var(--danger)' },
            { icon: '🤖', title: 'Dual-Model CV', desc: 'YOLO11-M for fast real-time detection + GroundingDINO for zero-shot semantic understanding of arbitrary product descriptions.', color: 'var(--primary-light)' },
          ].map((f, i) => (
            <div key={i} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: f.color }} />
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>{f.icon}</div>
              <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '10px' }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* METRICS */}
      <section className="section">
        <div className="sec-label">System Performance</div>
        <h2 className="sec-title">Key Metrics</h2>
        <p className="sec-desc">Production-grade performance benchmarks across all system components.</p>
        <div className="metrics-grid">
          {[
            { val: '≥0.95', lab: 'Target mAP@50', cls: 'mv-purple' },
            { val: '<100ms', lab: 'WebSocket Alert Latency', cls: 'mv-cyan' },
            { val: '95%', lab: 'Forecast Service Level', cls: 'mv-green' },
            { val: '1024px', lab: 'Training Resolution', cls: 'mv-orange' },
            { val: '6', lab: 'Detection Classes', cls: 'mv-purple' },
            { val: '730d', lab: 'Historical Training Data', cls: 'mv-cyan' },
            { val: '10+', lab: 'Augmentation Techniques', cls: 'mv-green' },
            { val: '0.15', lab: 'IoU Threshold (Compliance)', cls: 'mv-orange' },
          ].map((m, i) => (
            <div key={i} className="metric-card">
              <div className={`metric-val ${m.cls}`}>{m.val}</div>
              <div className="metric-lab">{m.lab}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* ARCHITECTURE */}
      <section id="arch" className="section">
        <div className="sec-label">Technical Stack</div>
        <h2 className="sec-title">System Architecture</h2>
        <p className="sec-desc">Production-ready microservice backend with dual-model CV pipeline and real-time WebSocket alerting.</p>
        <div className="arch-grid">
          {[
            { icon: '🧠', title: 'Computer Vision', desc: 'Dual-model pipeline: YOLO11-Medium for fast real-time detection + GroundingDINO for zero-shot semantic understanding.', tags: ['YOLO11', 'GroundingDINO', 'PyTorch', 'OpenCV'] },
            { icon: '📡', title: 'Backend API', desc: 'FastAPI async backend with 12+ REST endpoints and WebSocket support. Auto-generates Swagger docs. CORS enabled.', tags: ['FastAPI', 'Uvicorn', 'WebSocket', 'REST'] },
            { icon: '📈', title: 'Demand Forecasting', desc: 'Per-SKU XGBoost models with 730-day M5-style synthetic data. Lag features, rolling statistics, promo flags.', tags: ['XGBoost', 'scikit-learn', 'Pandas', 'NumPy'] },
            { icon: '🔔', title: 'Alert System', desc: 'Revenue-impact weighted prioritization. Async WebSocket broadcast. Corrective actions and acknowledgment lifecycle.', tags: ['WebSocket', 'AsyncIO', 'UUID Alerts', 'Revenue Rank'] },
            { icon: '🗺️', title: 'Planogram Engine', desc: 'IoU-based spatial matching of YOLO detections against reference JSON layout. Compliance scores per aisle.', tags: ['IoU Matching', 'JSON Schema', 'Compliance Score'] },
          ].map((a, i) => (
            <div key={i} className="arch-card">
              <div className="arch-icon">{a.icon}</div>
              <div className="arch-title">{a.title}</div>
              <div className="arch-desc">{a.desc}</div>
              <div className="arch-tags">{a.tags.map(t => <span key={t} className="arch-tag">{t}</span>)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ textAlign: 'center' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '60px 40px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚀</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(135deg,#fff,var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '16px' }}>
            Ready to Monitor Shelves?
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
            Upload a shelf image and get instant AI-powered insights on stockouts, compliance, and replenishment.
          </p>
          <div className="cta-row">
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>Open Dashboard →</button>
            <button className="btn-outline" onClick={() => navigate('/dashboard/detection')}>Try Detection</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">ShelfWise AI</div>
        <p>Smart Retail Shelf Intelligence • Prama Innovations Challenge 2026</p>
        <p style={{ marginTop: '8px' }}>YOLO11 Fine-Tuning • GroundingDINO • XGBoost Forecasting • WebSocket Alerts</p>
        <p style={{ marginTop: '16px', fontSize: '12px' }}>
          Backend: <a href="http://localhost:8000/docs" style={{ color: 'var(--primary-light)' }}>http://localhost:8000/docs</a>
        </p>
      </footer>
    </div>
  );
}
