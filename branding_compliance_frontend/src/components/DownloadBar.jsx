import React, { useMemo, useState } from "react";
import { getJson, postJson } from "../api/client";
import { formatApiError, normalizeApiError } from "../utils/errorHandling";

/**
 * ============================================================================
 * REQUIREMENT TRACEABILITY
 * ============================================================================
 * Requirement ID: REQ-FE-014
 * User Story: As a user, once processing is completed, I want to finalize (with e-sign placeholders)
 *             and download the fixed zip, with role checks and clear errors/loaders.
 * Acceptance Criteria:
 * - Finalize action calls POST /api/v1/jobs/{jobId}/finalize with { userId, timestamp, reason, signature }
 * - Download action calls GET /api/v1/jobs/{jobId}/download and streams a file
 * - Role-gated actions (e.g., only 'operator' or 'admin' can finalize/download)
 * - Captures/validates e-sign placeholder fields (reason required, signature optional)
 * - User-friendly errors and loaders
 * GxP Impact: YES - includes audit/e-sign placeholders and user attribution (ALCOA+)
 * Risk Level: MEDIUM
 * Validation Protocol: VP-FE-014
 * ============================================================================
 * ============================================================================
 * IMPORTS AND DEPENDENCIES
 * ============================================================================
 * Uses api/client for REST calls and error utilities for normalization/formatting.
 * ============================================================================
 */

/**
 * PUBLIC_INTERFACE
 * DownloadBar
 * Purpose: Provide finalize (e-sign placeholder) and download controls for a job.
 * GxP Critical: Yes - emits audit/e-sign placeholders before enabling download.
 * Parameters:
 *  - jobId: string | null
 *  - status: 'pending' | 'running' | 'completed' | 'failed' | string
 *  - user: { id?: string, email?: string, role?: string } | null
 *  - onFinalized?: (result:any) => void
 *  - onError?: (apiErr:any) => void
 * Returns: JSX.Element
 * Throws: None
 * Audit: Sends { userId, timestamp, reason, signature } in finalize payload.
 */
export default function DownloadBar({ jobId, status, user, onFinalized, onError }) {
  const [reason, setReason] = useState("");
  const [signature, setSignature] = useState("");
  const [loadingFinalize, setLoadingFinalize] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [error, setError] = useState(null);
  const [finalized, setFinalized] = useState(false);

  const userId = useMemo(() => user?.id || user?.email || "unknown-user", [user]);
  const role = user?.role || "viewer";
  // Role check: allow finalize/download only for 'operator' or 'admin'
  const canAct = role === "operator" || role === "admin";
  const isCompleted = (status || "").toLowerCase() === "completed";

  // Helper to download a Blob/ArrayBuffer as a file
  const saveBlob = (data, filename, mime = "application/zip") => {
    try {
      const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `fixed_${jobId || "job"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("File download failed:", e);
      throw e;
    }
  };

  // PUBLIC_INTERFACE
  async function finalizeJob() {
    /**
     * This is a public function to finalize a job prior to download.
     * Purpose: POST audit/e-sign placeholder to finalize endpoint.
     * Parameters: none (uses component state and props)
     * Returns: void
     */
    if (!jobId) return;
    if (!canAct) {
      const err = { name: "Forbidden", message: "You do not have permission to finalize.", status: 403 };
      setError(err);
      onError?.(err);
      return;
    }
    if (!isCompleted) {
      const err = { name: "InvalidState", message: "Job is not completed.", code: "NOT_COMPLETED" };
      setError(err);
      onError?.(err);
      return;
    }
    if (!reason || reason.trim().length < 3) {
      const err = { name: "ValidationError", message: "Reason is required (min 3 chars).", code: "REASON_REQUIRED" };
      setError(err);
      onError?.(err);
      return;
    }

    setLoadingFinalize(true);
    setError(null);
    try {
      const payload = {
        userId,
        timestamp: new Date().toISOString(),
        reason: reason.trim(),
        signature: signature ? String(signature) : undefined, // placeholder
      };
      const res = await postJson(`/api/v1/jobs/${encodeURIComponent(jobId)}/finalize`, payload, {
        retry: { attempts: 1, baseMs: 200, maxMs: 1200 },
      });
      setFinalized(true);
      onFinalized?.(res);
    } catch (e) {
      const norm = normalizeApiError(e);
      setError(norm);
      onError?.(norm);
    } finally {
      setLoadingFinalize(false);
    }
  }

  // PUBLIC_INTERFACE
  async function downloadZip() {
    /**
     * This is a public function to download the fixed zip after finalization.
     * Purpose: GET the binary from download route and trigger browser save.
     * Parameters: none
     * Returns: void
     */
    if (!jobId) return;
    if (!canAct) {
      const err = { name: "Forbidden", message: "You do not have permission to download.", status: 403 };
      setError(err);
      onError?.(err);
      return;
    }
    if (!isCompleted) {
      const err = { name: "InvalidState", message: "Job is not completed.", code: "NOT_COMPLETED" };
      setError(err);
      onError?.(err);
      return;
    }

    // Require finalize first (soft gate; could be enforced server-side too)
    if (!finalized) {
      const err = { name: "NotFinalized", message: "Please finalize with e-sign placeholder before downloading.", code: "FINALIZE_REQUIRED" };
      setError(err);
      onError?.(err);
      return;
    }

    setLoadingDownload(true);
    setError(null);
    try {
      // Use apiFetch directly to ensure we can get arrayBuffer; here leverage getJson path awareness:
      // Our api client returns arrayBuffer for non-JSON on success; invoke via getJson would try JSON.
      // So we call fetch through client.apiFetch by importing getJson? We will call getJson is JSON only.
      // Instead, use a direct fetch with our headers: prefer apiFetch, but not exported default binary.
      // Workaround: call getJson on a proxy that returns a presigned URL; else read as arrayBuffer using native fetch.
      // For now, attempt a native fetch to the same path with standard headers from browser (credentials if same-origin).
      const res = await fetch(`/api/v1/jobs/${encodeURIComponent(jobId)}/download`, {
        method: "GET",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const err = { name: "HttpError", message: text || `Download failed (HTTP ${res.status})`, status: res.status };
        throw err;
      }
      const contentDisposition = res.headers.get("Content-Disposition") || "";
      const defaultName = `fixed_${jobId}.zip`;
      const filenameMatch = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(contentDisposition || "");
      const filename = decodeURIComponent(filenameMatch?.[1] || filenameMatch?.[2] || defaultName);
      const buf = await res.arrayBuffer();
      saveBlob(buf, filename, res.headers.get("Content-Type") || "application/zip");
    } catch (e) {
      const norm = normalizeApiError(e);
      setError(norm);
      onError?.(norm);
    } finally {
      setLoadingDownload(false);
    }
  }

  const finalizeDisabled = !jobId || !isCompleted || !canAct || loadingFinalize;
  const downloadDisabled = !jobId || !isCompleted || !canAct || !finalized || loadingDownload;

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="section-title">Finalize & Download</div>
        {!canAct ? (
          <span className="badge">Role required: operator or admin</span>
        ) : (
          <span className="badge success">Authorized as {role}</span>
        )}
      </div>

      <div className="col esign-panel" style={{ gap: 8 }}>
        <label className="section-title">Electronic Signature (placeholder)</label>
        <input
          className="input"
          placeholder="Reason for approval (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Reason for approval"
        />
        <input
          className="input"
          placeholder="Signature (optional placeholder)"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          aria-label="Electronic signature placeholder"
          style={{ maxWidth: 300 }}
        />
        <div className="row" style={{ alignItems: "center" }}>
          <button className="btn" onClick={finalizeJob} disabled={finalizeDisabled}>
            {loadingFinalize ? "Finalizing…" : "Finalize"}
          </button>
          {finalized ? (
            <span className="badge success">Finalized</span>
          ) : (
            <span className="badge">Finalize required before download</span>
          )}
        </div>
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn secondary" onClick={downloadZip} disabled={downloadDisabled}>
          {loadingDownload ? "Preparing…" : "Download Fixed Zip"}
        </button>
        <span className="badge">Status: {String(status || "unknown")}</span>
      </div>

      {!!error && (
        <div className="badge error">
          {formatApiError(error)}
        </div>
      )}
    </div>
  );
}
