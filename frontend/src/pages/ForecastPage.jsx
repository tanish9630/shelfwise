import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Spinner, ForecastChart } from '../components/SharedComponents';

const DEMO_SKU_DATA = {
  SKU_001: { hist: [28,32,25,41,38,27,33,45,29,31,36,28,42,35,30,38,27,33,41,29,36,40,28,35,32,44,38,27,31,35], fore: [33,36,31,38,42,35,30,37,40,34,36,39,32,38,41,35,30,36,39,33,37,41,35,30,36,40,34,38,42,36], rop: 42, safety: 14, order: 67, status: 'REORDER', name: 'Premium Sparkling Water 500ml' },
  SKU_002: { hist: [18,22,19,25,21,17,23,26,20,19,24,18,27,22,19,25,18,22,26,20,23,27,19,23,21,28,25,18,21,24], fore: [22,24,20,25,27,23,19,24,26,22,24,26,21,25,27,23,19,24,26,22,25,27,23,19,24,27,23,26,28,24], rop: 28, safety: 9, order: 0, status: 'OK', name: 'Dark Chocolate Bar 200g' },
  SKU_003: { hist: [45,52,43,58,54,44,49,61,47,45,53,46,60,52,47,55,44,50,58,46,53,59,45,52,49,63,57,44,48,53], fore: [50,54,47,57,62,52,46,55,59,50,54,58,49,56,61,52,46,54,58,50,55,60,52,46,54,59,52,57,62,54], rop: 58, safety: 18, order: 42, status: 'REORDER', name: 'Organic Greek Yogurt 1kg' },
  SKU_004: { hist: [12,15,11,18,14,10,14,17,12,11,15,11,18,14,11,16,11,14,17,12,14,17,11,14,13,19,16,11,13,15], fore: [14,15,12,17,18,14,11,15,17,13,15,17,12,15,17,14,11,15,17,13,15,17,13,11,14,17,14,16,18,15], rop: 16, safety: 5, order: 0, status: 'OK', name: 'Hand Sanitizer 250ml' },
  SKU_005: { hist: [35,40,33,46,42,34,38,48,36,35,41,35,47,40,35,43,34,38,45,35,41,46,34,40,37,49,44,33,37,41], fore: [39,42,36,44,48,40,35,42,46,38,41,45,37,43,47,40,35,41,45,38,42,46,40,35,41,46,40,44,49,42], rop: 44, safety: 14, order: 28, status: 'REORDER', name: 'Whole Grain Cereal 750g' },
};

export default function ForecastPage({ toast, backendOnline }) {
  const [skus, setSkus] = useState(Object.keys(DEMO_SKU_DATA));
  const [selected, setSelected] = useState('SKU_001');
  const [currentStock, setCurrentStock] = useState(50);
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState(DEMO_SKU_DATA.SKU_001);
  const [replenData, setReplenData] = useState(null);
  const [useDemo, setUseDemo] = useState(true);

  useEffect(() => {
    if (backendOnline) {
      api.listSkus().then(r => { if (r.skus?.length) { setSkus(r.skus); setSelected(r.skus[0]); setUseDemo(false); } }).catch(() => {});
    }
  }, [backendOnline]);

  const loadForecast = async (sku) => {
    if (!backendOnline || useDemo) {
      const demo = DEMO_SKU_DATA[sku] || DEMO_SKU_DATA.SKU_001;
      setForecastData(demo);
      setReplenData({ sku, reorder_point: demo.rop, safety_stock: demo.safety, suggested_order_qty: demo.order, status: demo.status });
      return;
    }
    setLoading(true);
    try {
      const [fc, rep] = await Promise.all([api.forecast(sku), api.replenishment(sku, currentStock)]);
      setForecastData({ hist: fc.forecast.slice(0, 30), fore: fc.forecast.slice(0, 30), ...DEMO_SKU_DATA[sku] });
      setReplenData(rep);
      toast.success(`Loaded forecast for ${sku}`);
    } catch (e) { toast.error(e.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadForecast(selected); }, [selected, backendOnline]);

  const d = forecastData || DEMO_SKU_DATA.SKU_001;
  const rep = replenData || { reorder_point: d.rop, safety_stock: d.safety, suggested_order_qty: d.order, status: d.status };

  return (
    <div>
      <div className="page-header">
        <h2>📈 Demand Forecasting</h2>
        <p>XGBoost per-SKU 30-day rolling forecasts with automated replenishment recommendations</p>
      </div>

      {/* SKU Selector */}
      <div className="forecast-wrapper" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>📦 {DEMO_SKU_DATA[selected]?.name || selected}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
              {useDemo ? '⚠️ Demo data (backend offline)' : '✅ Live data from backend'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <input className="form-input" type="number" value={currentStock} onChange={e => setCurrentStock(+e.target.value)}
                placeholder="Current stock" style={{ width: '140px' }} />
            </div>
            {loading && <Spinner />}
          </div>
        </div>

        <div className="sku-tabs">
          {skus.map(sku => (
            <button key={sku} className={`sku-tab ${selected === sku ? 'active' : ''}`} onClick={() => setSelected(sku)}>
              {sku}
            </button>
          ))}
        </div>

        <ForecastChart hist={d.hist || []} fore={d.fore || []} />

        {/* Replenishment Summary */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: rep.status === 'REORDER' ? 'var(--danger)' : 'var(--success)' }}>
              {rep.status === 'REORDER' ? '🔴 REORDER' : '🟢 OK'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Replenishment Status</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)' }}>{rep.reorder_point ?? '—'}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Reorder Point (units)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>{rep.safety_stock ?? '—'}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Safety Stock (units)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-light)' }}>
              {rep.suggested_order_qty > 0 ? rep.suggested_order_qty : '—'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Suggested Order (units)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{currentStock}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Current Stock</div>
          </div>
        </div>
      </div>

      {/* All SKUs Summary Table */}
      <div className="card card-accent">
        <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px' }}>📊 All SKUs — Replenishment Summary</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th><th>Product</th><th>Reorder Point</th><th>Safety Stock</th>
                <th>Suggested Order</th><th>Status</th><th>Avg Daily Demand</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(DEMO_SKU_DATA).map(([sku, data]) => {
                const avg = Math.round(data.hist.reduce((a, b) => a + b, 0) / data.hist.length);
                return (
                  <tr key={sku} onClick={() => setSelected(sku)} style={{ cursor: 'pointer' }}>
                    <td><span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{sku}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: '12px' }}>{data.name}</td>
                    <td>{data.rop}</td>
                    <td>{data.safety}</td>
                    <td><span style={{ fontWeight: 700, color: data.order > 0 ? 'var(--warning)' : 'var(--success)' }}>{data.order || '—'}</span></td>
                    <td><span className={`status-chip ${data.status === 'REORDER' ? 'chip-danger' : 'chip-success'}`}>{data.status}</span></td>
                    <td>{avg} units/day</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '16px', color: 'var(--primary-light)' }}>🧠 Forecasting Model</div>
          {[['Algorithm', 'XGBoost (per-SKU)'], ['Training Data', '730-day M5-style synthetic'], ['Forecast Horizon', '30 days'], ['Features', 'Lag-7/14/30, rolling mean, promo flags, day-of-week'], ['Safety Stock Formula', 'Z-score based (95% service level)']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--muted)' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '16px', color: 'var(--accent)' }}>📆 Demand Drivers</div>
          {[['Historical POS Data', 'Primary driver'], ['Promotional Calendar', 'Boost multiplier'], ['Weather Data', 'Seasonal adjustment'], ['Local Events', 'Spike detection'], ['Day of Week', 'Cyclical feature']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--muted)' }}>{k}</span><span className="status-chip chip-info" style={{ fontSize: '11px' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
