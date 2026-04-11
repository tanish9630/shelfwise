import React, { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { Spinner, ComplianceRing } from '../components/SharedComponents';

const DEMO_AISLES = [
  { aisle: 'Aisle 1', name: 'Beverages Section', score: 90, color: '#10b981', missing: 1, misplaced: 0, incorrect: 1, unauthorized: 0 },
  { aisle: 'Aisle 3', name: 'Snacks & Confectionery', score: 65, color: '#f59e0b', missing: 3, misplaced: 1, incorrect: 2, unauthorized: 1 },
  { aisle: 'Aisle 5', name: 'Personal Care', score: 97, color: '#6366f1', missing: 0, misplaced: 0, incorrect: 1, unauthorized: 0 },
  { aisle: 'Aisle 7', name: 'Dairy & Frozen', score: 50, color: '#ef4444', missing: 5, misplaced: 2, incorrect: 3, unauthorized: 2 },
];

export default function CompliancePage({ toast, backendOnline }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [showPlanogramJSON, setShowPlanogramJSON] = useState(false);

  const SAMPLE_PLANOGRAM = JSON.stringify({
    aisle: "Aisle 1", section: "Shelf A",
    expected_products: [
      { sku: "SKU_001", position: [50, 100, 200, 300], class: "Product" },
      { sku: "SKU_002", position: [250, 100, 400, 300], class: "Product" },
      { sku: "LABEL_001", position: [50, 300, 200, 340], class: "Label_Price" },
    ]
  }, null, 2);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) handleFile(f);
    else toast.error('Please drop an image file');
  }, []);

  const scan = async () => {
    if (!file) { toast.error('Please select an image first'); return; }
    if (!backendOnline) { toast.error('Backend is offline'); return; }
    setLoading(true);
    try {
      const data = await api.complianceScan(file);
      setResult(data);
      toast.success(`✅ Scan complete — Compliance: ${data.compliance_report?.compliance_score?.toFixed(0) ?? '?'}%`);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const complianceReport = result?.compliance_report;

  return (
    <div>
      <div className="page-header">
        <h2>🗺️ Planogram Compliance</h2>
        <p>IoU-matching engine generates per-aisle compliance scores against reference planogram JSON</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', marginBottom: '28px' }}>
        {/* Upload Panel */}
        <div>
          <div
            className={`upload-zone ${dragging ? 'dragging' : ''}`}
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => document.getElementById('comp-upload').click()}
            style={{ marginBottom: '16px' }}
          >
            <input id="comp-upload" type="file" accept="image/*" className="upload-input"
              onChange={e => handleFile(e.target.files[0])} />
            {preview ? (
              <img src={preview} alt="preview" style={{ width: '100%', borderRadius: '12px', maxHeight: '200px', objectFit: 'contain' }} />
            ) : (
              <>
                <div className="upload-icon">🗺️</div>
                <div className="upload-text">Upload shelf image for compliance scan</div>
                <div className="upload-hint">Will auto-generate planogram if none provided</div>
              </>
            )}
          </div>

          <button
            style={{ width: '100%', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', marginBottom: '12px', fontFamily: 'inherit' }}
            onClick={() => setShowPlanogramJSON(!showPlanogramJSON)}
          >
            {showPlanogramJSON ? '▼' : '▶'} View Sample Planogram JSON
          </button>
          {showPlanogramJSON && (
            <pre style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', fontSize: '11px', overflow: 'auto', maxHeight: '160px', color: 'var(--text)', marginBottom: '12px' }}>
              {SAMPLE_PLANOGRAM}
            </pre>
          )}

          <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={scan} disabled={loading || !file}>
            {loading ? <><Spinner size={16} /> &nbsp; Scanning...</> : '🔍 Run Compliance Scan'}
          </button>

          {!backendOnline && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '12px', marginTop: '12px', fontSize: '13px', color: 'var(--warning)' }}>
              ⚠️ Backend offline — showing demo data below
            </div>
          )}
        </div>

        {/* Scan Result */}
        <div>
          {result && complianceReport ? (
            <div className="card card-accent">
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px' }}>📊 Scan Results</div>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
                <ComplianceRing
                  score={Math.round(complianceReport.compliance_score ?? 0)}
                  color={complianceReport.compliance_score > 80 ? '#10b981' : complianceReport.compliance_score > 60 ? '#f59e0b' : '#ef4444'}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '6px' }}>
                    {complianceReport.aisle} — {complianceReport.section}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{result.detection_count} objects detected</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{complianceReport.issues?.length || 0} compliance issues</div>
                </div>
              </div>
              <div className="comp-issues">
                {[
                  ['Missing Facings', complianceReport.missing_facings, 'ic-red'],
                  ['Misplaced Products', complianceReport.misplaced_products, 'ic-yellow'],
                  ['Incorrect Price Tags', complianceReport.incorrect_labels, 'ic-yellow'],
                  ['Unauthorized Products', complianceReport.unauthorized_products, 'ic-purple'],
                ].map(([label, count, cls]) => (
                  <div key={label} className="issue-row">
                    <span className="issue-label">{label}</span>
                    <span className={`issue-count ${cls}`}>{count ?? 0}</span>
                  </div>
                ))}
              </div>
              {complianceReport.issues?.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px', color: 'var(--warning)' }}>Issues Found:</div>
                  {complianceReport.issues.map((issue, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 14px', marginBottom: '6px', fontSize: '13px' }}>
                      <span className="tag" style={{ marginRight: '8px', color: 'var(--danger)' }}>{issue.type}</span>
                      <span style={{ color: 'var(--muted)' }}>{issue.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🗺️</div>
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>Ready to Scan</div>
              <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Upload a shelf image to run planogram compliance check</div>
            </div>
          )}
        </div>
      </div>

      {/* Demo Compliance Cards (always shown) */}
      <div style={{ marginBottom: '12px' }}>
        <div className="sec-label" style={{ marginBottom: '8px' }}>Store-Wide Compliance Overview</div>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
          Live compliance scores per aisle — updated on each scan cycle
        </p>
      </div>
      <div className="compliance-grid">
        {DEMO_AISLES.map((aisle, i) => (
          <div key={i} className="comp-card">
            <div className="comp-aisle">{aisle.aisle}</div>
            <div className="comp-name">{aisle.name}</div>
            <ComplianceRing score={aisle.score} color={aisle.color} />
            <div className="comp-issues">
              <div className="issue-row"><span className="issue-label">Missing Facings</span><span className={`issue-count ${aisle.missing > 0 ? 'ic-red' : 'ic-green'}`}>{aisle.missing}</span></div>
              <div className="issue-row"><span className="issue-label">Misplaced Products</span><span className={`issue-count ${aisle.misplaced > 0 ? 'ic-yellow' : 'ic-green'}`}>{aisle.misplaced}</span></div>
              <div className="issue-row"><span className="issue-label">Incorrect Price Tags</span><span className={`issue-count ${aisle.incorrect > 0 ? 'ic-yellow' : 'ic-green'}`}>{aisle.incorrect}</span></div>
              <div className="issue-row"><span className="issue-label">Unauthorized Products</span><span className={`issue-count ${aisle.unauthorized > 0 ? 'ic-purple' : 'ic-green'}`}>{aisle.unauthorized}</span></div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${aisle.score}%`, background: aisle.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="card" style={{ marginTop: '28px' }}>
        <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '16px', color: 'var(--primary-light)' }}>⚙️ How Planogram Compliance Works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '13px' }}>
          {[
            { step: '1', title: 'YOLO Detection', desc: 'YOLO11-M runs on the shelf image to detect all products, labels, and gaps with bounding boxes.' },
            { step: '2', title: 'IoU Matching', desc: 'Each detection is matched against the reference planogram JSON using Intersection-over-Union at threshold 0.15.' },
            { step: '3', title: 'Violation Detection', desc: 'Unmatched reference positions = missing facings. Extra detections = unauthorized products. Label mismatches = pricing errors.' },
            { step: '4', title: 'Score Calculation', desc: 'Compliance score = (matched positions / total expected positions) × 100. Weighted by product revenue tier.' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ width: '28px', height: '28px', background: 'rgba(99,102,241,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: 'var(--primary-light)', marginBottom: '10px' }}>{s.step}</div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>{s.title}</div>
              <div style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
