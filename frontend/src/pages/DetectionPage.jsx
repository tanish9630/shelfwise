import React, { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { Spinner, ShelfGrid } from '../components/SharedComponents';

export default function DetectionPage({ toast, backendOnline }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState('Aisle A');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) handleFile(f);
    else toast.error('Please drop an image file');
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const detect = async () => {
    if (!file) { toast.error('Please select an image first'); return; }
    if (!backendOnline) { toast.error('Backend is offline. Start the FastAPI server.'); return; }
    setLoading(true);
    try {
      const data = await api.detect(file, location);
      setResult(data);
      toast.success(`✅ Detected ${data.count} objects, fired ${data.alerts_fired} alerts`);
    } catch (e) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const classColors = {
    Product: 'var(--success)', Stockout: 'var(--danger)', Label_Price: 'var(--primary-light)',
    Label_Promo: 'var(--warning)', Obstruction: 'var(--muted)', Shelf_Rail: 'var(--accent)',
  };

  const classCounts = result?.detections?.reduce((acc, d) => {
    acc[d.class] = (acc[d.class] || 0) + 1; return acc;
  }, {}) || {};

  const fillRate = result
    ? Math.round(((classCounts.Product || 0) / Math.max(result.count, 1)) * 100)
    : null;

  return (
    <div>
      <div className="page-header">
        <h2>🔍 Shelf Detection</h2>
        <p>Upload a shelf image for YOLO11-M powered object detection</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Upload */}
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">📍 Shelf Location</label>
              <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Aisle 5, Shelf C" />
            </div>
          </div>

          <div
            className={`upload-zone ${dragging ? 'dragging' : ''}`}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => document.getElementById('shelf-upload').click()}
            style={{ marginBottom: '16px' }}
          >
            <input id="shelf-upload" type="file" accept="image/*" className="upload-input"
              onChange={e => handleFile(e.target.files[0])} />
            {preview ? (
              <img src={preview} alt="preview" style={{ width: '100%', borderRadius: '12px', maxHeight: '220px', objectFit: 'contain' }} />
            ) : (
              <>
                <div className="upload-icon">📷</div>
                <div className="upload-text">Drop shelf image here</div>
                <div className="upload-hint">PNG, JPG, WEBP supported · Click or drag & drop</div>
              </>
            )}
          </div>

          <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={detect} disabled={loading || !file}>
            {loading ? <><Spinner size={16} /> &nbsp; Analyzing...</> : '🧠 Detect Objects'}
          </button>
        </div>

        {/* Live Detection Visualization */}
        <div className="shelf-demo">
          <div className="shelf-title">
            <span className="live-dot" />
            {result ? `Detection Results — ${location}` : 'Live Detection Feed — Demo'}
            <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--muted)', fontWeight: 400 }}>
              YOLO11-M | 1024px | RTX 3050
            </span>
          </div>
          <ShelfGrid detections={result?.detections} />
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { val: classCounts.Product || (result ? 0 : 4), lab: 'Products Detected', color: 'var(--success)' },
              { val: classCounts.Stockout || (result ? 0 : 1), lab: 'Stockouts Found', color: 'var(--danger)' },
              { val: result?.alerts_fired ?? 2, lab: 'Alerts Fired', color: 'var(--danger)' },
              { val: fillRate !== null ? `${fillRate}%` : '67%', lab: 'Fill Rate', color: 'var(--primary-light)' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, minWidth: '100px', background: `rgba(0,0,0,0.2)`, border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{s.lab}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detection Results Table */}
      {result && (
        <div className="card card-accent">
          <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>📦 Detection Results ({result.count} objects)</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Object.entries(classCounts).map(([cls, cnt]) => (
                <span key={cls} className="tag" style={{ color: classColors[cls] || 'var(--muted)' }}>
                  {cls}: {cnt}
                </span>
              ))}
            </div>
          </div>

          {result.detections.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Class</th><th>Confidence</th><th>Bounding Box</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.detections.map((d, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                      <td><span style={{ fontWeight: 700, color: classColors[d.class] || 'var(--text)' }}>{d.class}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar" style={{ width: '80px' }}>
                            <div className="progress-fill" style={{
                              width: `${d.confidence * 100}%`,
                              background: d.confidence > 0.8 ? 'var(--success)' : d.confidence > 0.6 ? 'var(--warning)' : 'var(--danger)',
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>{(d.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '12px', fontFamily: 'monospace' }}>
                        [{d.bbox.map(v => v.toFixed(0)).join(', ')}]
                      </td>
                      <td>
                        <span className={`status-chip ${d.class === 'Stockout' ? 'chip-danger' : d.class === 'Product' ? 'chip-success' : 'chip-warning'}`}>
                          {d.class === 'Stockout' ? 'ALERT' : d.class === 'Product' ? 'OK' : 'WATCH'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No objects detected in this image</div>
          )}

          {result.alert_summary?.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--warning)' }}>⚠️ Auto-Generated Alerts ({result.alerts_fired})</div>
              <div className="alert-feed">
                {result.alert_summary.map((a, i) => (
                  <div key={i} className="alert-card" style={{ padding: '12px 16px' }}>
                    <div className="alert-icon" style={{ fontSize: '1.2rem' }}>
                      {a.alert_type === 'STOCKOUT' ? '🚨' : '⚠️'}
                    </div>
                    <div className="alert-body">
                      <div className="alert-header">
                        <span className="alert-type" style={{ fontSize: '13px' }}>{a.alert_type}</span>
                        <span className={`alert-sev ${a.severity === 'CRITICAL' ? 'sev-critical' : a.severity === 'HIGH' ? 'sev-high' : 'sev-medium'}`}>{a.severity}</span>
                      </div>
                      <div className="alert-msg">{a.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Info */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--primary-light)' }}>📡 Model Configuration</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
          {[['Classes', 'Product, Stockout, Label_Price, Label_Promo, Obstruction, Shelf_Rail'],
            ['Input Resolution', '640px (inference), 1024px (training)'],
            ['Confidence Threshold', '0.25'], ['NMS IoU', '0.45'],
            ['Device', 'CUDA (RTX 3050) / CPU fallback'], ['Framework', 'Ultralytics YOLO11'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '4px' }}>{k}</div>
              <div style={{ fontWeight: 600, fontSize: '12px' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
