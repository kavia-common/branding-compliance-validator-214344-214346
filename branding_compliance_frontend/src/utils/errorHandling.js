//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-010
// User Story: As a user, I need clear and consistent error messages derived from API failures.
// Acceptance Criteria:
// - Normalize error shapes into a consistent ApiError
// - Map to user-friendly text with optional requestId
// GxP Impact: YES - Improves user comprehension and supports audit traceability
// Risk Level: LOW
// Validation Protocol: VP-FE-010
// ============================================================================

/**
 * PUBLIC_INTERFACE
 * normalizeApiError
 * Purpose: Convert unknown error shapes into ApiError.
 * Parameters:
 *  - err: any
 * Returns: { name: string, message: string, status?: number, requestId?: string, code?: string, details?: any }
 */
export function normalizeApiError(err) {
  if (!err) return { name: "UnknownError", message: "Unexpected error occurred" };
  if (typeof err === "string") return { name: "Error", message: err };
  const obj = {
    name: err.name || "Error",
    message: err.message || "Unexpected error occurred",
  };
  if (typeof err.status === "number") obj.status = err.status;
  if (err.requestId) obj.requestId = err.requestId;
  if (err.code) obj.code = err.code;
  if (err.details) obj.details = err.details;
  return obj;
}

/**
 * PUBLIC_INTERFACE
 * formatApiError
 * Purpose: Convert ApiError into a UX-friendly message including requestId when present.
 * Parameters:
 *  - apiErr: ApiError | any
 * Returns: string
 */
export function formatApiError(apiErr) {
  const e = normalizeApiError(apiErr);
  let msg = e.message || "Unexpected error occurred";
  if (e.status) msg += ` (HTTP ${e.status})`;
  if (e.requestId) msg += ` • Ref: ${e.requestId}`;
  return msg;
}

export default {
  normalizeApiError,
  formatApiError,
};
