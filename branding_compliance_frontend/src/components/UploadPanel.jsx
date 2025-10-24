import React, { useMemo } from "react";
import { useUploadComplianceJob } from "../hooks/useUploadComplianceJob";
import { formatApiError } from "../utils/errorHandling";

/**
 * ============================================================================
 * REQUIREMENT TRACEABILITY
 * ============================================================================
 * Requirement ID: REQ-FE-007
 * User Story: As a user, I need a clear upload panel to submit a zip, old and new brand images, and guidelines, with immediate feedback.
 * Acceptance Criteria:
 * - Inputs for zip (*.zip), old brand (*.png|*.svg), optional new brand (*.png|*.svg), and guidelines (*.pdf|*.txt)
 * - Validations on required file type and size with user-friendly errors
 * - POST multipart to /api/v1/jobs via api/client, fields: zip, old_brand, new_brand (optional), guidelines
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
 *  - value: { zip: File|null, oldBrand: File|null, newBrand?: File|null, guidelines: File|null, intendReplace?: boolean }
 *  - onChange: (next) => void
 *  - onStarted?: ({ jobId, status }) => void
 *  - disabled?: boolean
 * Returns: JSX.Element
 */
export default function UploadPanel({ value, onChange, onStarted, disabled }) {
  const { startJob, loading, error, jobInfo } = useUploadComplianceJob();

  const allSet = useMemo(() => {
    // oldBrand required, newBrand optional depending on intendReplace flag (validated in hook as well)
    const hasCore = Boolean(value?.zip && value?.oldBrand && value?.guidelines);
    const replacementOk = !value?.intendReplace || Boolean(value?.newBrand);
    return hasCore && replacementOk;
  }, [value]);

  const onFile = (key) => (e) => {
    const file = e.target.files?.[0] ?? null;
    onChange?.({ ...value, [key]: file });
  };

  const onToggleReplace = (e) => {
    const checked = !!e.target.checked;
    onChange?.({ ...value, intendReplace: checked });
  };

  // PUBLIC_INTERFACE
  async function start() {
    /**
     * This is a public function to start the job creation with multipart form-data.
     * Purpose: call the upload hook with selected files and replacement intent.
     * Parameters: none (uses component state)
     * Returns: void
     */
    const { jobId, status, error: hookErr } = await startJob({
      zip: value?.zip || null,
      oldBrand: value?.oldBrand || null,
      newBrand: value?.intendReplace ? (value?.newBrand || null) : null,
      guidelines: value?.guidelines || null,
      intendReplace: !!value?.intendReplace,
    });
    if (hookErr) return; // error will be surfaced below
    if (jobId && onStarted) onStarted({ jobId, status });
  }

  const effectiveDisabled = disabled || loading;

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="section-title">Upload Inputs</div>
        <span className="badge important">Zip, Old Brand, Guidelines required</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 12 }}>
        <div className="col">
          <label className="section-title">Images Zip</label>
          <input className="input" type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={onFile("zip")} />
          <small className="badge">Accepted: .zip</small>
          {value?.zip && <small className="badge success">Selected: {value.zip.name}</small>}
        </div>

        <div className="col">
          <label className="section-title">Old Brand Image (PNG/SVG)</label>
          <input className="input" type="file" accept="image/png,image/svg+xml,.png,.svg" onChange={onFile("oldBrand")} />
          <small className="badge">Accepted: .png, .svg</small>
          {value?.oldBrand && <small className="badge success">Selected: {value.oldBrand.name}</small>}
        </div>

        <div className="col">
          <label className="section-title">New Brand Image (optional)</label>
          <input className="input" type="file" accept="image/png,image/svg+xml,.png,.svg" onChange={onFile("newBrand")} disabled={!value?.intendReplace} />
          <small className="badge">PNG/SVG. Required only if "Replace" is checked.</small>
          {value?.newBrand && <small className="badge success">Selected: {value.newBrand.name}</small>}
        </div>

        <div className="col">
          <label className="section-title">Guidelines (PDF/TXT)</label>
          <input className="input" type="file" accept=".pdf,application/pdf,.txt,text/plain" onChange={onFile("guidelines")} />
          <small className="badge">Accepted: .pdf, .txt</small>
          {value?.guidelines && <small className="badge success">Selected: {value.guidelines.name}</small>}
        </div>
      </div>

      <div className="row" style={{ alignItems: "center", marginTop: 6 }}>
        <input id="intendReplace" type="checkbox" checked={!!value?.intendReplace} onChange={onToggleReplace} />
        <label htmlFor="intendReplace">I intend to replace old-brand occurrences with the new brand image</label>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" onClick={start} disabled={!allSet || effectiveDisabled}>
          {loading ? "Starting…" : "Start Job"}
        </button>
        <span className="badge">This will upload files and create a processing job.</span>
      </div>

      {(error) && (
        <div className="badge error" style={{ marginTop: 10 }}>
          {formatApiError(error)}
        </div>
      )}

      {jobInfo?.jobId && (
        <div className="badge success" style={{ marginTop: 10 }}>
          Job created: {jobInfo.jobId} (status: {jobInfo.status || "pending"})
        </div>
      )}
    </div>
  );
}
