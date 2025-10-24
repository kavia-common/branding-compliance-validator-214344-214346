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
import UploadPanel from '../components/UploadPanel';
import { formatApiError } from '../utils/errorHandling';

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
  // Upload file state (propagated into UploadPanel)
  const [files, setFiles] = useState({ zip: null, branding: null, guidelines: null });
  // Job and UI states
  const [job, setJob] = useState(null);
  const [flags, setFlags] = useState([]);
  const [preview, setPreview] = useState(null);
  const [notice, setNotice] = useState("");

  const onJobStarted = ({ jobId, status }) => {
    setJob({ id: jobId, status });
    setNotice(`Job started: ${jobId} • status: ${status}`);
    // Placeholder: in a later step we will poll /api/v1/jobs/{id} to fetch results
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
      <UploadPanel value={files} onChange={setFiles} onStarted={onJobStarted} />

      {!!notice && (
        <div className="badge success" style={{ marginTop: -6 }}>
          {notice}
        </div>
      )}

      <div className="grid grid-3">
        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">Results & Flags</div>
          <div className="col" style={{ marginTop: 10 }}>
            {(!job && flags.length === 0) && (
              <div className="badge">No results yet. Start a job to see flags.</div>
            )}
            {(flags.length > 0) && (
              flags.map((f) => (
                <div key={f.id} className="row" style={{ justifyContent: 'space-between', borderBottom: '1px dashed var(--ocn-border)', padding: '10px 0' }}>
                  <div className="col">
                    <strong>{f.id}</strong>
                    <span className={`badge ${f.severity === 'high' ? 'error' : 'important'}`}>{f.issue}</span>
                  </div>
                  <div className="row">
                    <button className="btn ghost" onClick={() => setPreview({ id: f.id, url: '', note: f.issue })}>Preview</button>
                  </div>
                </div>
              ))
            )}
            {job && flags.length === 0 && (
              <div className="badge">Job {job.id} • {job.status}. Results will appear here once available.</div>
            )}
            {canAdmin ? (
              <button className="btn secondary" style={{ marginTop: 12 }}>Admin Bulk Action</button>
            ) : (
              <span className="badge" style={{ marginTop: 12 }}>Admin Bulk Action (role-gated)</span>
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
