import React, { useEffect, useRef, useState } from 'react';

// ── Toast Hook ──────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };
  return { toasts, success: m => add(m, 'success'), error: m => add(m, 'error'), info: m => add(m, 'info') };
}

// ── Toast Container ─────────────────────────────────────
export function ToastContainer({ toasts }) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{icons[t.type]}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Spinner ─────────────────────────────────────────────
export function Spinner({ size = 24 }) {
  return <div className="spinner" style={{ width: size, height: size }} />;
}

// ── Forecast Chart ──────────────────────────────────────
export function ForecastChart({ hist = [], fore = [] }) {
  const barsRef = useRef(null);
  const maxVal = Math.max(...hist, ...fore, 1);

  useEffect(() => {
    if (!barsRef.current) return;
    barsRef.current.innerHTML = '';

    const histSlice = hist.slice(-14);
    histSlice.forEach((v, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'bar-wrap';
      const bar = document.createElement('div');
      bar.className = 'bar hist';
      bar.style.height = Math.max(4, (v / maxVal) * 160) + 'px';
      bar.setAttribute('data-val', v + ' units');
      const label = document.createElement('div');
      label.className = 'bar-label';
      label.textContent = 'D-' + (histSlice.length - i);
      wrap.appendChild(bar); wrap.appendChild(label);
      barsRef.current.appendChild(wrap);
    });

    fore.slice(0, 16).forEach((v, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'bar-wrap';
      const bar = document.createElement('div');
      bar.className = 'bar forecast';
      bar.style.height = '4px';
      bar.setAttribute('data-val', Math.round(v) + ' units (forecast)');
      const label = document.createElement('div');
      label.className = 'bar-label';
      label.textContent = '+' + (i + 1);
      wrap.appendChild(bar); wrap.appendChild(label);
      barsRef.current.appendChild(wrap);
      setTimeout(() => { bar.style.height = Math.max(4, (v / maxVal) * 160) + 'px'; }, 50 + i * 40);
    });
  }, [hist, fore]);

  return (
    <div>
      <div className="chart-container">
        <div className="chart-bars" ref={barsRef} />
      </div>
      <div className="chart-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--primary)' }} />Historical Demand</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent)' }} />Forecast (30 days)</div>
      </div>
    </div>
  );
}

// ── Compliance Ring ─────────────────────────────────────
export function ComplianceRing({ score = 0, color = '#6366f1' }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="score-ring">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle className="ring-bg" cx="45" cy="45" r={r} />
        <circle className="ring-fill" cx="45" cy="45" r={r}
          stroke={color} strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className="score-num" style={{ color }}>{score}%</div>
    </div>
  );
}

// ── Shelf Items Grid ────────────────────────────────────
const SHELF_CONFIG = [
  { cls: 'product', icon: '🥤', label: 'Product', badge: 'PRESENT', badgeCls: 'badge-ok', conf: 0.94 },
  { cls: 'stockout', icon: '⚠️', label: 'Stockout', badge: 'EMPTY', badgeCls: 'badge-ko', conf: 0.89 },
  { cls: 'product', icon: '🍫', label: 'Product', badge: 'PRESENT', badgeCls: 'badge-ok', conf: 0.91 },
  { cls: 'low', icon: '📦', label: 'Low Stock', badge: 'LOW', badgeCls: 'badge-warn', conf: 0.72 },
  { cls: 'label', icon: '🏷️', label: 'Label_Price', badge: 'OK', badgeCls: 'badge-ok', conf: 0.88 },
  { cls: 'product', icon: '🧴', label: 'Product', badge: 'PRESENT', badgeCls: 'badge-ok', conf: 0.96 },
];

export function ShelfGrid({ detections }) {
  const items = detections && detections.length > 0
    ? detections.slice(0, 6).map(d => {
        const cls = d.class === 'Product' ? 'product'
          : d.class === 'Stockout' ? 'stockout'
          : d.class?.startsWith('Label') ? 'label'
          : 'low';
        const badge = d.class === 'Product' ? 'PRESENT' : d.class === 'Stockout' ? 'EMPTY' : d.class;
        const badgeCls = cls === 'product' ? 'badge-ok' : cls === 'stockout' ? 'badge-ko' : 'badge-warn';
        const icon = cls === 'product' ? '🛒' : cls === 'stockout' ? '⚠️' : cls === 'label' ? '🏷️' : '📦';
        return { cls, icon, label: d.class, badge, badgeCls, conf: d.confidence };
      })
    : SHELF_CONFIG;

  const fillClass = (cls) => cls === 'product' ? 'fill-green' : cls === 'stockout' ? 'fill-red' : 'fill-yellow';

  return (
    <div className="shelf-grid">
      {items.map((item, i) => (
        <div key={i} className={`shelf-item ${item.cls}`}>
          <div className="shelf-item-icon">{item.icon}</div>
          <span>{item.label}</span>
          <div className="conf-bar">
            <div className={`conf-fill ${fillClass(item.cls)}`} style={{ width: `${Math.round(item.conf * 100)}%` }} />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>conf: {item.conf.toFixed(2)}</span>
          <span className={`item-badge ${item.badgeCls}`}>{item.badge}</span>
        </div>
      ))}
    </div>
  );
}

// ── Alert Card ──────────────────────────────────────────
export function AlertCard({ alert, onAck }) {
  const [acked, setAcked] = useState(!!alert.acknowledged_at);
  const sevMap = {
    CRITICAL: 'sev-critical', HIGH: 'sev-high', MEDIUM: 'sev-medium', LOW: 'sev-low'
  };
  const iconMap = {
    STOCKOUT: '🚨', LOW_STOCK: '⚠️', PLANOGRAM_VIOLATION: '📋', PRICE_TAG_MISSING: '🏷️', OVERSTOCK: '📦'
  };

  const handleAck = async () => {
    setAcked(true);
    onAck && onAck(alert.id || alert.alert_id);
  };

  if (acked) return null;

  return (
    <div className="alert-card" style={{ animationDelay: '0s' }}>
      <div className="alert-icon">{iconMap[alert.alert_type] || '🔔'}</div>
      <div className="alert-body">
        <div className="alert-header">
          <span className="alert-type">{alert.alert_type}</span>
          <span className={`alert-sev ${sevMap[alert.severity] || 'sev-medium'}`}>{alert.severity}</span>
          <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: 'auto' }}>
            Revenue Impact: {alert.revenue_impact || '—'}
          </span>
        </div>
        <div className="alert-msg">{alert.message}</div>
        <div className="alert-meta">
          {alert.location && <span className="meta-chip">📍 {alert.location}</span>}
          {alert.confidence && <span className="meta-chip">🎯 conf: {alert.confidence.toFixed(2)}</span>}
          {alert.sku && <span className="meta-chip">🏷️ {alert.sku}</span>}
          <span className="meta-chip">📡 WebSocket pushed</span>
        </div>
      </div>
      <div className="alert-action">
        <button className="ack-btn" onClick={handleAck}>✓ Ack</button>
      </div>
    </div>
  );
}

// ── Heatmap ─────────────────────────────────────────────
export function StockoutHeatmap() {
  const aisles = ['Aisle 1', 'Aisle 2', 'Aisle 3', 'Aisle 4', 'Aisle 5', 'Aisle 6', 'Aisle 7', 'Aisle 8'];
  const hours = ['6am','7','8','9','10','11','12','1pm','2','3','4','5'];
  const heatData = aisles.map(() => hours.map(() => Math.random()));

  const getColor = (v) => {
    if (v < 0.2) return 'rgba(16,185,129,0.15)';
    if (v < 0.4) return 'rgba(245,158,11,0.2)';
    if (v < 0.6) return 'rgba(245,158,11,0.4)';
    if (v < 0.8) return 'rgba(239,68,68,0.3)';
    return 'rgba(239,68,68,0.6)';
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', paddingLeft: '80px' }}>
        {hours.map(h => <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: 'var(--muted)' }}>{h}</div>)}
      </div>
      {aisles.map((aisle, ai) => (
        <div key={ai} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
          <div style={{ width: '76px', fontSize: '11px', color: 'var(--muted)', flexShrink: 0 }}>{aisle}</div>
          {heatData[ai].map((v, hi) => (
            <div key={hi} className="heatmap-cell" style={{ flex: 1, height: '28px', background: getColor(v) }}
              title={`${aisle}, ${hours[hi]}: ${Math.round(v * 100)}% stockout risk`} />
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Risk:</span>
        {['Low', 'Moderate', 'High', 'Critical'].map((l, i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: ['rgba(16,185,129,0.4)', 'rgba(245,158,11,0.4)', 'rgba(239,68,68,0.3)', 'rgba(239,68,68,0.7)'][i] }} />
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
