import React, { useState, useEffect, useRef } from 'react';
import { api, connectWebSocket } from '../lib/api';
import { Spinner, AlertCard } from '../components/SharedComponents';

const DEMO_ALERTS = [
  { id: '1', alert_type: 'STOCKOUT', severity: 'CRITICAL', message: 'Empty shelf gap detected at Aisle 5, Shelf C. 1 stockout found across 6 shelf positions. Immediate backroom retrieval required.', location: 'Aisle 5, Shelf C', confidence: 0.89, revenue_impact: 100 },
  { id: '2', alert_type: 'LOW_STOCK', severity: 'HIGH', message: 'Low stock detected at Aisle 3, Shelf B. Fill rate: 67% (4 products, 2 gaps). Pull additional units from backroom.', location: 'Aisle 3, Shelf B', confidence: 0.76, revenue_impact: 60 },
  { id: '3', alert_type: 'PLANOGRAM_VIOLATION', severity: 'MEDIUM', message: 'Promotional tag detected at Aisle 1, Shelf A. Verify if promotion is currently active for this section.', location: 'Aisle 1, Shelf A', revenue_impact: 40 },
  { id: '4', alert_type: 'PRICE_TAG_MISSING', severity: 'MEDIUM', message: 'No price labels detected at Aisle 2, Shelf D despite 3 shelf rails visible. Print correct shelf-edge labels.', location: 'Aisle 2, Shelf D', revenue_impact: 30 },
];

export default function AlertsPage({ toast, backendOnline }) {
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const alertCountRef = useRef(0);

  const AISLES = ['Aisle 2, Shelf A', 'Aisle 4, Shelf C', 'Aisle 6, Shelf B', 'Aisle 8, Shelf D', 'Aisle 1, Shelf E', 'Aisle 7, Shelf A'];

  const fetchAlerts = async () => {
    if (!backendOnline) return;
    setLoading(true);
    try {
      const res = await api.activeAlerts(filter === 'ALL' ? null : filter);
      const fetched = (res.alerts || []).map(a => ({ ...a, id: a.alert_id || a.id }));
      if (fetched.length > 0) setAlerts(fetched);
    } catch (e) { toast.error('Could not load alerts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, [filter, backendOnline]);

  // WebSocket
  useEffect(() => {
    if (!backendOnline) { setWsConnected(false); return; }
    try {
      const ws = connectWebSocket((msg) => {
        if (msg.event === 'new_alert') {
          const a = msg.alert;
          setAlerts(prev => [{ ...a, id: a.alert_id || a.id }, ...prev]);
          toast.info(`🔔 ${a.severity}: ${a.alert_type}`);
        }
      });
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      wsRef.current = ws;
      return () => ws.close();
    } catch {}
  }, [backendOnline]);

  const handleAck = async (id) => {
    try {
      if (backendOnline) await api.acknowledgeAlert(id);
      setAlerts(prev => prev.filter(a => (a.id || a.alert_id) !== id));
      toast.success('Alert acknowledged');
    } catch { toast.error('Could not acknowledge'); }
  };

  const fireTestAlert = async () => {
    if (!backendOnline) { toast.error('Backend offline'); return; }
    try {
      await api.fireTestAlert();
      toast.success('Test alert fired via WebSocket!');
    } catch (e) { toast.error(e.message); }
  };

  const simulateLocalAlert = () => {
    alertCountRef.current++;
    const aisle = AISLES[alertCountRef.current % AISLES.length];
    const newAlert = {
      id: Date.now().toString(),
      alert_type: 'STOCKOUT',
      severity: 'CRITICAL',
      message: `NEW: Empty shelf gap detected at ${aisle}. Immediate backroom retrieval required.`,
      location: aisle,
      revenue_impact: 100,
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'];
  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.severity === filter);
  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'CRITICAL').length,
    high: alerts.filter(a => a.severity === 'HIGH').length,
    stockouts: alerts.filter(a => a.alert_type === 'STOCKOUT').length,
  };

  return (
    <div>
      <div className="page-header">
        <h2>🔔 Real-Time Alert System</h2>
        <p>Revenue-weighted, sub-100ms WebSocket alert pipeline</p>
      </div>

      {/* Stats */}
      <div className="stat-row">
        {[
          { val: stats.total, lab: 'Active Alerts', color: 'var(--warning)' },
          { val: stats.critical, lab: 'Critical', color: 'var(--danger)' },
          { val: stats.high, lab: 'High Priority', color: 'var(--warning)' },
          { val: stats.stockouts, lab: 'Stockouts', color: 'var(--danger)' },
        ].map((s, i) => (
          <div key={i} className="stat-chip">
            <div className="stat-chip-val" style={{ color: s.color }}>{s.val}</div>
            <div className="stat-chip-lab">{s.lab}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
        <div className="tab-bar" style={{ flex: '0 0 auto', marginBottom: 0 }}>
          {FILTERS.map(f => (
            <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: wsConnected ? 'var(--success)' : 'var(--muted)' }}>
            <span className="live-dot" style={{ background: wsConnected ? 'var(--success)' : 'var(--muted)' }} />
            {wsConnected ? 'WebSocket Connected' : 'WebSocket Offline'}
          </div>
          <button className="btn-danger" onClick={simulateLocalAlert}>🔴 Simulate Stockout Alert</button>
          <button className="btn-outline btn-sm" onClick={fireTestAlert} disabled={!backendOnline}
            style={{ fontSize: '13px' }}>📡 Fire via API</button>
          <button className="btn-outline btn-sm" onClick={fetchAlerts} disabled={loading}
            style={{ fontSize: '13px' }}>{loading ? 'Loading...' : '🔄 Refresh'}</button>
        </div>
      </div>

      {/* Alert Feed */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>No Active Alerts</div>
          <div style={{ color: 'var(--muted)' }}>All shelves are compliant. No stockouts detected.</div>
        </div>
      ) : (
        <div className="alert-feed">
          {filtered.map((alert, i) => (
            <AlertCard key={alert.id || i} alert={alert} onAck={handleAck} />
          ))}
        </div>
      )}

      {/* Alert Channels Info */}
      <div className="card" style={{ marginTop: '28px' }}>
        <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px', color: 'var(--primary-light)' }}>📡 Alert Delivery Channels</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { icon: '🖥️', title: 'Dashboard Push', desc: 'Real-time WebSocket push to all connected dashboard clients. <100ms delivery.', status: 'Active', color: 'var(--success)' },
            { icon: '📱', title: 'Mobile Alerts', desc: 'Configurable push notifications to store associates\' devices via notification service.', status: 'Configured', color: 'var(--warning)' },
            { icon: '📧', title: 'Email Digests', desc: 'Hourly email digests of unresolved critical alerts with revenue impact summary.', status: 'Pending Setup', color: 'var(--muted)' },
          ].map((ch, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{ch.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>{ch.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '12px' }}>{ch.desc}</div>
              <span className="status-chip" style={{ background: `rgba(${ch.status === 'Active' ? '16,185,129' : ch.status === 'Configured' ? '245,158,11' : '100,116,139'},0.15)`, color: ch.color }}>
                {ch.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
