import React, { useState, useEffect } from 'react';
import { StockoutHeatmap } from '../components/SharedComponents';

const REVENUE_DATA = [
  { month: 'Oct', recovered: 12400, lost: 3200 },
  { month: 'Nov', recovered: 18700, lost: 2800 },
  { month: 'Dec', recovered: 24100, lost: 1900 },
  { month: 'Jan', recovered: 19500, lost: 2400 },
  { month: 'Feb', recovered: 22300, lost: 1600 },
  { month: 'Mar', recovered: 28900, lost: 1200 },
  { month: 'Apr', recovered: 31400, lost: 900 },
];

function RevenueChart() {
  const maxVal = Math.max(...REVENUE_DATA.map(d => d.recovered + d.lost));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '180px', padding: '0 8px' }}>
      {REVENUE_DATA.map((d, i) => {
        const totalH = ((d.recovered + d.lost) / maxVal) * 160;
        const recH = (d.recovered / (d.recovered + d.lost)) * totalH;
        const lostH = totalH - recH;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
              <div title={`Recovered: $${d.recovered.toLocaleString()}`}
                style={{ height: recH + 'px', background: 'linear-gradient(180deg, var(--success), rgba(16,185,129,0.4))', borderRadius: '4px 4px 0 0', cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.target.style.opacity = '0.8'} onMouseLeave={e => e.target.style.opacity = '1'} />
              <div title={`Lost: $${d.lost.toLocaleString()}`}
                style={{ height: lostH + 'px', background: 'linear-gradient(180deg, var(--danger), rgba(239,68,68,0.4))', cursor: 'pointer' }}
                onMouseEnter={e => e.target.style.opacity = '0.8'} onMouseLeave={e => e.target.style.opacity = '1'} />
            </div>
            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

function MiniSparkline({ data, color = 'var(--primary)' }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 30;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AnalyticsPage({ toast, backendOnline }) {
  const [activeTab, setActiveTab] = useState('overview');

  const kpis = [
    { val: '$2.4M', lab: 'Revenue Recovered (YTD)', sub: '+34% vs last year', color: 'mv-green' },
    { val: '87%', lab: 'Avg Shelf Fill Rate', sub: 'Up from 71%', color: 'mv-cyan' },
    { val: '92%', lab: 'Planogram Compliance', sub: 'Across all aisles', color: 'mv-purple' },
    { val: '4.2min', lab: 'Avg Alert Response Time', sub: 'Target: <5min ✅', color: 'mv-orange' },
    { val: '89%', lab: 'Forecast Accuracy (MAPE)', sub: '30-day horizon', color: 'mv-green' },
    { val: '156', lab: 'Stockouts Prevented', sub: 'This month', color: 'mv-cyan' },
  ];

  const topStockoutProducts = [
    { sku: 'SKU_003', name: 'Organic Greek Yogurt 1kg', count: 23, impact: '$4,200', trend: [8,12,15,9,23,18,14,20] },
    { sku: 'SKU_001', name: 'Premium Sparkling Water', count: 18, impact: '$3,100', trend: [12,8,18,14,10,18,16,15] },
    { sku: 'SKU_005', name: 'Whole Grain Cereal 750g', count: 14, impact: '$2,800', trend: [5,9,11,14,12,14,13,11] },
    { sku: 'SKU_007', name: 'Fresh Orange Juice 1L', count: 11, impact: '$1,900', trend: [7,8,9,11,8,10,9,11] },
    { sku: 'SKU_002', name: 'Dark Chocolate Bar 200g', count: 9, impact: '$1,200', trend: [4,6,8,5,9,7,8,9] },
  ];

  const complianceTrend = [62, 68, 71, 75, 78, 82, 85, 88, 90, 92, 91, 92];

  return (
    <div>
      <div className="page-header">
        <h2>📊 Analytics & Insights</h2>
        <p>Management dashboard with shelf health scores, heatmaps, and revenue impact metrics</p>
      </div>

      {/* Tab bar */}
      <div className="tab-bar" style={{ maxWidth: '500px' }}>
        {[['overview', '📈 Overview'], ['heatmap', '🔥 Heatmap'], ['revenue', '💰 Revenue'], ['floor', '🏪 Floor Map']].map(([id, label]) => (
          <button key={id} className={`tab-btn ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <>
          <div className="metrics-grid" style={{ marginBottom: '24px' }}>
            {kpis.map((k, i) => (
              <div key={i} className="metric-card">
                <div className={`metric-val ${k.color}`}>{k.val}</div>
                <div className="metric-lab">{k.lab}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Compliance Trend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="card card-accent">
              <div style={{ fontWeight: 700, marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <span>📈 Planogram Compliance Trend</span>
                <span style={{ color: 'var(--success)', fontSize: '14px' }}>+30pts YTD</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' }}>
                {complianceTrend.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '100%', background: `${v >= 85 ? 'var(--success)' : v >= 70 ? 'var(--warning)' : 'var(--danger)'}33`, border: `1px solid ${v >= 85 ? 'var(--success)' : v >= 70 ? 'var(--warning)' : 'var(--danger)'}55`, borderRadius: '4px 4px 0 0', height: `${(v / 100) * 100}px`, transition: 'height 0.5s' }} />
                    <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{['O','N','D','J','F','M','A','M','J','J','A','S'][i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card card-accent">
              <div style={{ fontWeight: 700, marginBottom: '16px' }}>🏪 Shelf Health by Aisle</div>
              {[
                { aisle: 'Aisle 1 — Beverages', score: 90, color: 'var(--success)' },
                { aisle: 'Aisle 3 — Snacks', score: 65, color: 'var(--warning)' },
                { aisle: 'Aisle 5 — Personal Care', score: 97, color: 'var(--success)' },
                { aisle: 'Aisle 7 — Dairy & Frozen', score: 50, color: 'var(--danger)' },
                { aisle: 'Aisle 2 — Bakery', score: 84, color: 'var(--success)' },
                { aisle: 'Aisle 4 — Household', score: 78, color: 'var(--warning)' },
              ].map((a, i) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--muted)' }}>{a.aisle}</span>
                    <span style={{ fontWeight: 700, color: a.color }}>{a.score}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${a.score}%`, background: a.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Stockout Products */}
          <div className="card card-accent">
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px' }}>🚨 Top Stockout Products (This Month)</div>
            <table className="data-table">
              <thead>
                <tr><th>SKU</th><th>Product</th><th>Stockout Events</th><th>Revenue Impact</th><th>Trend</th></tr>
              </thead>
              <tbody>
                {topStockoutProducts.map((p, i) => (
                  <tr key={i}>
                    <td><span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{p.sku}</span></td>
                    <td style={{ fontSize: '13px' }}>{p.name}</td>
                    <td><span className="status-chip chip-danger">{p.count}</span></td>
                    <td style={{ fontWeight: 700, color: 'var(--warning)' }}>{p.impact}</td>
                    <td><MiniSparkline data={p.trend} color="var(--danger)" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── HEATMAP ── */}
      {activeTab === 'heatmap' && (
        <div className="card card-accent">
          <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>🔥 Stockout Frequency Heatmap</div>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
            Heatmap of stockout risk by aisle and time of day (simulated from detection history)
          </p>
          <StockoutHeatmap />
          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Peak Stockout Window', val: '11am — 2pm', color: 'var(--danger)' },
              { label: 'Highest Risk Aisle', val: 'Aisle 7 (Dairy)', color: 'var(--danger)' },
              { label: 'Safest Window', val: '6am — 8am', color: 'var(--success)' },
              { label: 'Replenishment Window', val: '6am — 9am', color: 'var(--accent)' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontWeight: 700, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REVENUE ── */}
      {activeTab === 'revenue' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { val: '$2.4M', lab: 'Revenue Recovered YTD', color: 'mv-green' },
              { val: '$154K', lab: 'Revenue Still Lost', color: 'mv-red' },
              { val: '93.9%', lab: 'Recovery Rate', color: 'mv-cyan' },
              { val: '$31.4K', lab: 'Recovered This Month', color: 'mv-green' },
            ].map((k, i) => (
              <div key={i} className="metric-card">
                <div className={`metric-val ${k.color}`}>{k.val}</div>
                <div className="metric-lab">{k.lab}</div>
              </div>
            ))}
          </div>
          <div className="card card-accent">
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>💰 Revenue Recovered vs Lost (Monthly)</div>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>Faster replenishment via AI alerts directly recovers lost sales</p>
            <RevenueChart />
            <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
              <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--success)' }} />Revenue Recovered</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--danger)' }} />Revenue Lost</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '16px', color: 'var(--primary-light)' }}>📊 Forecast Accuracy Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {[
                { metric: 'MAPE', val: '10.8%', lab: 'Mean Abs % Error', color: 'var(--success)' },
                { metric: 'MAE', val: '3.2 units', lab: 'Mean Abs Error', color: 'var(--accent)' },
                { metric: 'Service Level', val: '95%', lab: 'Fill rate achieved', color: 'var(--success)' },
                { metric: 'Bias', val: '+1.4%', lab: 'Slight overforecast', color: 'var(--warning)' },
              ].map((m, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>{m.metric}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: m.color }}>{m.val}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{m.lab}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── FLOOR MAP ── */}
      {activeTab === 'floor' && (
        <div>
          <div className="card card-accent" style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>🏪 Store Floor Plan — Live Overlay</div>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
              Visual shelf map overlaying detection results. Colors indicate compliance level.
            </p>
            <div className="floor-plan" style={{ height: '400px' }}>
              {/* Floor grid */}
              <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '12px', padding: '20px' }}>
                {[
                  { name: 'Aisle 1\nBeverages', score: 90, color: '#10b981' },
                  { name: 'Aisle 2\nBakery', score: 84, color: '#10b981' },
                  { name: 'Aisle 3\nSnacks', score: 65, color: '#f59e0b' },
                  { name: 'Aisle 4\nHousehold', score: 78, color: '#f59e0b' },
                  { name: 'Aisle 5\nPersonal Care', score: 97, color: '#6366f1' },
                  { name: 'Aisle 6\nHealth', score: 88, color: '#10b981' },
                  { name: 'Aisle 7\nDairy & Frozen', score: 50, color: '#ef4444' },
                  { name: 'Aisle 8\nProduce', score: 73, color: '#f59e0b' },
                  { name: 'Checkout\nZone', score: 100, color: '#22d3ee' },
                  { name: 'Storage\nBackroom', score: 100, color: '#6366f1' },
                  { name: '\nEntrance', score: 100, color: '#22d3ee' },
                  { name: '\nService Desk', score: 100, color: '#64748b' },
                ].map((a, i) => (
                  <div key={i} className="aisle-block" style={{
                    position: 'relative', background: `${a.color}22`,
                    border: `2px solid ${a.color}55`, color: a.color,
                    borderRadius: '10px', padding: '12px', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, whiteSpace: 'pre-line', lineHeight: 1.3, marginBottom: '6px' }}>{a.name}</div>
                    <div style={{ fontSize: '13px', fontWeight: 900 }}>{a.score}%</div>
                    <div style={{ width: '80%', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '6px' }}>
                      <div style={{ height: '100%', width: `${a.score}%`, background: a.color, borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
              {[['var(--success)', '>80% Compliant'], ['var(--warning)', '60–80% Compliant'], ['var(--danger)', '<60% Critical'], ['var(--accent)', 'Non-inventory Zone']].map(([c, l]) => (
                <div key={l} className="legend-item">
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: c }} />{l}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
