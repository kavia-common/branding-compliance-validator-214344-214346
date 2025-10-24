//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-008
// User Story: As a frontend, I need a reusable hook that validates inputs, builds multipart form data, calls the backend to create a job, and normalizes errors.
// Acceptance Criteria:
// - Validate file presence, type, and size
// - Build FormData with fields: zip, branding, guidelines
// - Use POST /api/v1/jobs via api/client postMultipart
// - Return { jobId, status } on success; surface normalized ApiError on failure
// GxP Impact: YES - Input validation and error normalization are critical controls
// Risk Level: MEDIUM
// Validation Protocol: VP-FE-008
// ============================================================================

import { useCallback, useMemo, useState } from "react";
import { postMultipart } from "../api/client";
import { validateUploadPayload } from "../utils/validation";
import { normalizeApiError } from "../utils/errorHandling";

/**
 * PUBLIC_INTERFACE
 * useUploadComplianceJob
 * Purpose: Provide stateful API for starting an upload job with validations and error handling.
 * GxP Critical: Yes - Ensures only valid data is transmitted, and errors are normalized for auditability.
 * Parameters: none
 * Returns:
 *  {
 *    startJob: (files: {zip: File|null, branding: File|null, guidelines: File|null}) => Promise<{jobId?: string, status?: string, error?: ApiError}>
 *    loading: boolean,
 *    error: ApiError | null,
 *    jobInfo: { jobId?: string, status?: string } | null
 *  }
 */
export function useUploadComplianceJob() {
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState(null);
  const [jobInfo, setJobInfo] = useState(null);

  const startJob = useCallback(async ({ zip, branding, guidelines }) => {
    setErr(null);
    setJobInfo(null);

    // Validate inputs
    const val = validateUploadPayload({ zip, branding, guidelines });
    if (!val.ok) {
      const norm = normalizeApiError({ name: "ValidationError", message: val.message, code: "VALIDATION_FAILED" });
      setErr(norm);
      return { error: norm };
    }

    // Build form-data
    const fd = new FormData();
    // Field names chosen to match backend expectation "zip", "branding", "guidelines"
    fd.append("zip", zip);
    fd.append("branding", branding);
    fd.append("guidelines", guidelines);

    setLoading(true);
    try {
      // POST /api/v1/jobs returns e.g. { id: string, status: 'pending'|'running'|'completed'|'failed' }
      const data = await postMultipart("/api/v1/jobs", fd, {
        retry: { attempts: 2, baseMs: 200, maxMs: 1500 },
      });

      const jobId = data?.id || data?.jobId;
      const status = data?.status || "pending";
      const info = { jobId, status };
      setJobInfo(info);
      return info;
    } catch (err) {
      const norm = normalizeApiError(err);
      setErr(norm);
      return { error: norm };
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(() => ({ startJob, loading, error: error, jobInfo }), [startJob, loading, error, jobInfo]);
}

export default useUploadComplianceJob;
