import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, connectWebSocket } from '../lib/api';
import { useToast, ToastContainer } from '../components/SharedComponents';
import DetectionPage from './DetectionPage';
import AlertsPage from './AlertsPage';
import ForecastPage from './ForecastPage';
import CompliancePage from './CompliancePage';
import AnalyticsPage from './AnalyticsPage';

const NAV = [
  { path: '', icon: '🏠', label: 'Overview' },
  { path: 'detection', icon: '🔍', label: 'Detection' },
  { path: 'alerts', icon: '🔔', label: 'Alerts', badge: true },
  { path: 'forecast', icon: '📈', label: 'Forecast' },
  { path: 'compliance', icon: '🗺️', label: 'Compliance' },
  { path: 'analytics', icon: '📊', label: 'Analytics' },
];

function OverviewPage({ backendOnline, alertStats, liveAlerts }) {
  const stats = [
    { val: alertStats?.total_active ?? '—', lab: 'Active Alerts', cls: 'mv-red' },
    { val: alertStats?.total_acknowledged ?? '—', lab: 'Resolved Today', cls: 'mv-green' },
    { val: alertStats?.critical_count ?? '—', lab: 'Critical Alerts', cls: 'mv-red' },
    { val: alertStats?.total_all_time ?? '—', lab: 'Total Processed', cls: 'mv-purple' },
    { val: '<100ms', lab: 'Alert Latency', cls: 'mv-cyan' },
    { val: '6', lab: 'Detection Classes', cls: 'mv-orange' },
  ];

  const quickActions = [
    { icon: '🔍', label: 'Analyze Shelf Image', path: '/dashboard/detection', color: 'var(--primary)' },
    { icon: '🔔', label: 'View Live Alerts', path: '/dashboard/alerts', color: 'var(--danger)' },
    { icon: '📈', label: 'Demand Forecast', path: '/dashboard/forecast', color: 'var(--success)' },
    { icon: '🗺️', label: 'Compliance Scan', path: '/dashboard/compliance', color: 'var(--warning)' },
    { icon: '📊', label: 'Analytics', path: '/dashboard/analytics', color: 'var(--accent)' },
    { icon: '📡', label: 'API Docs', path: null, href: 'http://localhost:8000/docs', color: 'var(--primary-light)' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>📊 Dashboard Overview</h2>
        <p>Welcome to ShelfWise AI — Real-time retail shelf intelligence platform</p>
      </div>

      {/* Backend Status Banner */}
      <div style={{ background: backendOnline ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${backendOnline ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '14px', padding: '16px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.4rem' }}>{backendOnline ? '✅' : '❌'}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: backendOnline ? 'var(--success)' : 'var(--danger)' }}>
            Backend {backendOnline ? 'Online' : 'Offline'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {backendOnline ? 'FastAPI server running at http://localhost:8000 • YOLO11-M loaded • WebSocket active' : 'Start the backend: cd backend && python main.py'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--primary-light)', padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
            📡 Swagger UI
          </a>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid" style={{ marginBottom: '28px' }}>
        {stats.map((s, i) => (
          <div key={i} className="metric-card">
            <div className={`metric-val ${s.cls}`}>{s.val}</div>
            <div className="metric-lab">{s.lab}</div>
          </div>
        ))}
      </div>

      {/* Live Alert Feed Preview */}
      {liveAlerts.length > 0 && (
        <div className="card card-accent" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-dot" />Live Alert Feed
            </div>
            <Link to="/dashboard/alerts" style={{ color: 'var(--primary-light)', fontSize: '13px', textDecoration: 'none' }}>View All →</Link>
          </div>
          <div className="alert-feed">
            {liveAlerts.slice(0, 3).map((alert, i) => {
              const sevMap = { CRITICAL: 'sev-critical', HIGH: 'sev-high', MEDIUM: 'sev-medium', LOW: 'sev-low' };
              const iconMap = { STOCKOUT: '🚨', LOW_STOCK: '⚠️', PLANOGRAM_VIOLATION: '📋', PRICE_TAG_MISSING: '🏷️' };
              return (
                <div key={i} className="alert-card">
                  <div className="alert-icon">{iconMap[alert.alert_type] || '🔔'}</div>
                  <div className="alert-body">
                    <div className="alert-header">
                      <span className="alert-type">{alert.alert_type}</span>
                      <span className={`alert-sev ${sevMap[alert.severity] || 'sev-medium'}`}>{alert.severity}</span>
                    </div>
                    <div className="alert-msg">{alert.message}</div>
                    <div className="alert-meta">
                      {alert.location && <span className="meta-chip">📍 {alert.location}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.4rem' }}>Quick Actions</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {quickActions.map((a, i) => (
          a.href
            ? <a key={i} href={a.href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{a.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: a.color }}>{a.label}</div>
                </div>
              </a>
            : <Link key={i} to={a.path} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{a.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: a.color }}>{a.label}</div>
                </div>
              </Link>
        ))}
      </div>

      {/* System Info */}
      <div className="card">
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--primary-light)' }}>📡 Training Configuration (YOLO11-Medium)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
          {[
            ['Base Model', 'yolo11m.pt'], ['Resolution', '1024 × 1024 px'], ['Epochs', '100 (patience=30)'],
            ['Optimizer', 'AdamW + CosLR'], ['Freeze', 'Backbone (10 layers)'], ['Batch', 'Auto (nbs=64)'],
            ['Augmentation', 'Mosaic, MixUp, CopyPaste'], ['Data Source', 'YouTube 4K + yt-dlp'], ['Hardware', 'RTX 3050 (CUDA)'],
            ['Classes', '6 (Product, Stockout, ...)'],
          ].map(([k, v]) => (
            <div key={k}><span style={{ color: 'var(--muted)' }}>{k}:</span> <strong>{v}</strong></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [backendOnline, setBackendOnline] = useState(false);
  const [alertStats, setAlertStats] = useState(null);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [alertBadgeCount, setAlertBadgeCount] = useState(0);

  const currentPath = location.pathname.replace('/dashboard/', '').replace('/dashboard', '');

  // Health check + initial data
  useEffect(() => {
    const check = async () => {
      const ok = await api.healthCheck();
      setBackendOnline(ok);
      if (ok) {
        try {
          const stats = await api.alertStats();
          setAlertStats(stats);
          const activeRes = await api.activeAlerts();
          const alerts = activeRes.alerts || [];
          setLiveAlerts(alerts);
          setAlertBadgeCount(alerts.length);
        } catch {}
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket for live alerts
  useEffect(() => {
    if (!backendOnline) return;
    let ws;
    try {
      ws = connectWebSocket((msg) => {
        if (msg.event === 'new_alert') {
          setLiveAlerts(prev => [msg.alert, ...prev.slice(0, 9)]);
          setAlertBadgeCount(p => p + 1);
          toast.info(`🔔 New ${msg.alert?.severity} alert: ${msg.alert?.alert_type}`);
        }
      });
    } catch {}
    return () => { try { ws?.close(); } catch {} };
  }, [backendOnline]);

  const renderPage = () => {
    switch (currentPath) {
      case 'detection': return <DetectionPage toast={toast} backendOnline={backendOnline} />;
      case 'alerts': return <AlertsPage toast={toast} backendOnline={backendOnline} />;
      case 'forecast': return <ForecastPage toast={toast} backendOnline={backendOnline} />;
      case 'compliance': return <CompliancePage toast={toast} backendOnline={backendOnline} />;
      case 'analytics': return <AnalyticsPage toast={toast} backendOnline={backendOnline} />;
      default: return <OverviewPage backendOnline={backendOnline} alertStats={alertStats} liveAlerts={liveAlerts} />;
    }
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Top Nav */}
      <nav className="nav">
        <Link to="/" className="nav-logo">⚡ ShelfWise</Link>
        <div className="nav-links">
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API Docs</a>
          <span className={`nav-badge ${backendOnline ? '' : 'offline'}`}>
            {backendOnline ? '🟢 Backend Live' : '🔴 Backend Offline'}
          </span>
        </div>
      </nav>

      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div style={{ padding: '20px 12px 8px' }}>
            <div className="sidebar-label">Navigation</div>
            {NAV.map(item => {
              const isActive = currentPath === item.path;
              return (
                <Link
                  key={item.path}
                  to={`/dashboard${item.path ? `/${item.path}` : ''}`}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  {item.label}
                  {item.badge && alertBadgeCount > 0 && (
                    <span className="sidebar-badge">{alertBadgeCount}</span>
                  )}
                </Link>
              );
            })}
          </div>

          <div style={{ padding: '12px', marginTop: 'auto', borderTop: '1px solid var(--border)' }}>
            <div className="sidebar-label">Status</div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="live-dot" style={{ background: backendOnline ? 'var(--success)' : 'var(--danger)' }} />
                <span style={{ color: 'var(--muted)' }}>Backend</span>
                <span style={{ marginLeft: 'auto', color: backendOnline ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                  {backendOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px' }}>📡</span>
                <span style={{ color: 'var(--muted)' }}>WebSocket</span>
                <span style={{ marginLeft: 'auto', color: backendOnline ? 'var(--success)' : 'var(--muted)', fontWeight: 700, fontSize: '12px' }}>
                  {backendOnline ? 'Active' : 'Down'}
                </span>
              </div>
            </div>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <button className="sidebar-item" style={{ marginTop: '8px', width: '100%', color: 'var(--muted)' }}>
                <span className="sidebar-icon">←</span> Back to Landing
              </button>
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="main-content">
          {renderPage()}
        </main>
      </div>

      <ToastContainer toasts={toast.toasts} />
    </div>
  );
}
