import React, { useMemo } from "react";
import { useUploadComplianceJob } from "../hooks/useUploadComplianceJob";
import { formatApiError } from "../utils/errorHandling";

/**
 * ============================================================================
 * REQUIREMENT TRACEABILITY
 * ============================================================================
 * Requirement ID: REQ-FE-007
 * User Story: As a user, I need a clear upload panel to submit a zip, branding PNG, and guidelines, and get immediate feedback.
 * Acceptance Criteria:
 * - Inputs for zip (*.zip), branding (*.png), and guidelines (*.pdf|*.txt)
 * - Validations on required file type and size with user-friendly errors
 * - POST multipart to /api/v1/jobs via api/client
 * - Display of jobId on success, errors on failure
 * GxP Impact: YES - Inputs validation and audit-relevant feedback
 * Risk Level: MEDIUM
 * Validation Protocol: VP-FE-007
 * ============================================================================
 */

/**
 * PUBLIC_INTERFACE
 * UploadPanel
 * Purpose: UI component to collect upload inputs and trigger job creation.
 * GxP Critical: Yes - Validates inputs and triggers auditable job creation
 * Parameters:
 *  - value: { zip: File|null, branding: File|null, guidelines: File|null }
 *  - onChange: (next) => void
 *  - onStarted?: ({ jobId, status }) => void
 *  - disabled?: boolean
 * Returns: JSX.Element
 */
export default function UploadPanel({ value, onChange, onStarted, disabled }) {
  const { startJob, loading, error, jobInfo } = useUploadComplianceJob();

  const allSet = useMemo(() => {
    return Boolean(value?.zip && value?.branding && value?.guidelines);
  }, [value]);

  const onFile = (key) => (e) => {
    const file = e.target.files?.[0] ?? null;
    onChange?.({ ...value, [key]: file });
  };

  const start = async () => {
    const { jobId, status, error: hookErr } = await startJob({
      zip: value?.zip || null,
      branding: value?.branding || null,
      guidelines: value?.guidelines || null,
    });
    if (hookErr) return; // error will be surfaced below
    if (jobId && onStarted) onStarted({ jobId, status });
  };

  const effectiveDisabled = disabled || loading;

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="section-title">Upload Inputs</div>
        <span className="badge important">All files required</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 12 }}>
        <div className="col">
          <label className="section-title">Images Zip</label>
          <input className="input" type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={onFile("zip")} />
          <small className="badge">Accepted: .zip</small>
          {value?.zip && <small className="badge success">Selected: {value.zip.name}</small>}
        </div>

        <div className="col">
          <label className="section-title">Branding PNG</label>
          <input className="input" type="file" accept="image/png" onChange={onFile("branding")} />
          <small className="badge">Accepted: .png</small>
          {value?.branding && <small className="badge success">Selected: {value.branding.name}</small>}
        </div>

        <div className="col">
          <label className="section-title">Guidelines (PDF/TXT)</label>
          <input className="input" type="file" accept=".pdf,application/pdf,.txt,text/plain" onChange={onFile("guidelines")} />
          <small className="badge">Accepted: .pdf, .txt</small>
          {value?.guidelines && <small className="badge success">Selected: {value.guidelines.name}</small>}
        </div>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" onClick={start} disabled={!allSet || effectiveDisabled}>
          {loading ? "Starting…" : "Start Job"}
        </button>
        <span className="badge">This will upload files and create a processing job.</span>
      </div>

      {/* Error surface */}
      {(error) && (
        <div className="badge error" style={{ marginTop: 10 }}>
          {formatApiError(error)}
        </div>
      )}

      {/* Success surface */}
      {jobInfo?.jobId && (
        <div className="badge success" style={{ marginTop: 10 }}>
          Job created: {jobInfo.jobId} (status: {jobInfo.status || "pending"})
        </div>
      )}
    </div>
  );
}
