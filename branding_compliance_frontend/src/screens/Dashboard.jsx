/* Dashboard Screen - Ocean Professional layout */
//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-003
// User Story: As an authenticated user, I can upload inputs and view results, with clear placeholders for compliance features.
// Acceptance Criteria:
// - Upload area (zip, branding PNG, guidelines)
// - Results/flags center, preview on side
// - Download fixed zip button
// - Audit/e-sign placeholders
// - Role-gated actions placeholder
// GxP Impact: YES - includes audit/e-sign placeholders and mentions role checks
// Risk Level: MEDIUM
// Validation Protocol: VP-FE-003
// ============================================================================

import React, { useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * Dashboard
 * Purpose: Main application screen for uploads and results presentation.
 * GxP Critical: Yes (UI control points for audit/e-sign placeholders)
 * Parameters:
 *  - user: { id?: string, email?: string, role?: string }
 * Returns: JSX.Element
 * Throws: None
 * Audit: Placeholder events for upload and download actions; actual audit logging to be implemented in backend and real auth integration.
 */
export default function Dashboard({ user }) {
  const [files, setFiles] = useState({ zip: null, branding: null, guidelines: null });
  const [flags, setFlags] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const onFile = (key) => (e) => {
    const file = e.target.files?.[0] ?? null;
    setFiles((f) => ({ ...f, [key]: file }));
  };

  const mockProcess = async () => {
    // Placeholder for API call to backend; include audit/e-sign placeholders.
    setBusy(true);
    try {
      // Audit placeholder: capture action metadata
      console.debug('AUDIT_PLACEHOLDER', {
        userId: user?.id || 'demo-user',
        action: 'PROCESS_UPLOAD',
        timestamp: new Date().toISOString(),
        payloadMeta: {
          zip: files.zip?.name,
          branding: files.branding?.name,
          guidelines: files.guidelines?.name,
        },
        reason: 'Initial processing run',
      });
      // Simulated result set
      await new Promise((r) => setTimeout(r, 700));
      setFlags([
        { id: 'img-001', issue: 'Logo misalignment', severity: 'medium' },
        { id: 'img-002', issue: 'Color variance beyond tolerance', severity: 'high' },
      ]);
      setPreview({ id: 'img-001', url: '', note: 'Sample preview (placeholder)' });
    } catch (e) {
      console.error('PROCESS_ERROR', e);
      alert('Processing failed (placeholder). See console for details.');
    } finally {
      setBusy(false);
    }
  };

  const mockDownload = async () => {
    // Placeholder for e-sign prompt and audit logging
    console.debug('ESIGN_PLACEHOLDER_PROMPT', {
      userId: user?.id || 'demo-user',
      action: 'DOWNLOAD_FIXED_ZIP',
      timestamp: new Date().toISOString(),
      note: 'Require e-sign to approve fixes before download.',
    });
    alert('E-sign placeholder: In production, capture signature before downloading.');
  };

  const canAdmin = user?.role === 'admin';

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">Upload Inputs</div>
          <span className="badge important">Audit & E-sign placeholders embedded</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 12 }}>
          <div className="col">
            <label className="section-title">Images Zip</label>
            <input className="input" type="file" accept=".zip" onChange={onFile('zip')} />
            <small className="badge">Accepted: .zip</small>
          </div>
          <div className="col">
            <label className="section-title">Branding PNG</label>
            <input className="input" type="file" accept="image/png" onChange={onFile('branding')} />
            <small className="badge">Accepted: .png</small>
          </div>
          <div className="col">
            <label className="section-title">Guidelines (PDF/TXT)</label>
            <input className="input" type="file" accept=".pdf,.txt" onChange={onFile('guidelines')} />
            <small className="badge">Accepted: .pdf, .txt</small>
          </div>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={mockProcess} disabled={busy || !files.zip || !files.branding || !files.guidelines}>
            {busy ? 'Processing…' : 'Process'}
          </button>
          <button className="btn ghost" disabled>
            Connect Backend (pending)
          </button>
          {canAdmin ? (
            <button className="btn secondary">Admin Bulk Action</button>
          ) : (
            <span className="badge">Admin Bulk Action (role-gated)</span>
          )}
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">Results & Flags</div>
          <div className="col" style={{ marginTop: 10 }}>
            {flags.length === 0 ? (
              <div className="badge">No results yet. Run processing to see flags.</div>
            ) : (
              flags.map((f) => (
                <div key={f.id} className="row" style={{ justifyContent: 'space-between', borderBottom: '1px dashed var(--ocn-border)', padding: '10px 0' }}>
                  <div className="col">
                    <strong>{f.id}</strong>
                    <span className="badge {`${f.severity === 'high' ? 'error' : 'important'}`}">{f.issue}</span>
                  </div>
                  <div className="row">
                    <button className="btn ghost" onClick={() => setPreview({ id: f.id, url: '', note: f.issue })}>Preview</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">Preview</div>
          <div className="col" style={{ marginTop: 10 }}>
            {preview ? (
              <div className="col">
                <div className="badge">Image: {preview.id}</div>
                <div className="audit-panel" style={{ marginTop: 8 }}>
                  Audit Trail Placeholder:
                  <ul>
                    <li>User: {user?.email || 'demo@user'}</li>
                    <li>Action: PREVIEW_OPEN</li>
                    <li>Timestamp: {new Date().toISOString()}</li>
                    <li>Note: {preview.note}</li>
                  </ul>
                </div>
                <div className="esign-panel" style={{ marginTop: 8 }}>
                  E-Sign Placeholder: Approval required for final download.
                </div>
                <div className="card" style={{ height: 220, marginTop: 10, display: 'grid', placeItems: 'center', color: 'var(--ocn-muted)' }}>
                  Preview Image Placeholder
                </div>
              </div>
            ) : (
              <div className="badge">Select a result to preview.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">Finalize</div>
          <div className="col" style={{ marginTop: 10 }}>
            <button className="btn" onClick={mockDownload}>Download Fixed Zip</button>
            <small className="badge important" style={{ marginTop: 8 }}>
              E-sign required before download (placeholder)
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
