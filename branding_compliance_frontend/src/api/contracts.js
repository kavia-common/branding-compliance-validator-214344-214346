//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-005
// User Story: As a developer, I need consistent API contracts and a reliable client to interact with the backend.
// Acceptance Criteria:
// - Provide JSDoc typedefs for API entities and errors
// - Export a helper to resolve API base URL from environment
// - Ensure exports are tree-shakable and documented
// GxP Impact: YES - contracts document required fields for audit trail and user attribution
// Risk Level: LOW
// Validation Protocol: VP-FE-005
// ============================================================================
// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================
// None (pure typedefs and helpers)
// ============================================================================

/**
 * PUBLIC_INTERFACE
 * getApiBaseUrl
 * Purpose: Resolve API base URL from environment variable with a safe fallback.
 * GxP Critical: Yes - ensures consistent endpoint resolution which affects audit and data integrity.
 * Parameters: none
 * Returns: string - API base URL without trailing slash
 * Throws: None
 * Notes:
 * - Reads REACT_APP_API_BASE_URL (must be set in .env; orchestrator to provide)
 * - If missing, defaults to same-origin '/api' path for local proxy setups
 */
import { getEnv } from "../utils/env";

export function getApiBaseUrl() {
  // IMPORTANT: Do not hardcode production URLs; use env var, with local fallback
  const raw = getEnv("REACT_APP_API_BASE_URL", "/api");
  // normalize: remove trailing slash (but keep protocol slashes)
  return typeof raw === "string" && raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

// ============================================================================
// FEATURE CONTRACTS (typedefs)
// ============================================================================

/**
 * @typedef {('pending'|'running'|'completed'|'failed')} JobStatus
 * @description Lifecycle status of a processing job.
 */

/**
 * @typedef {Object} Violation
 * @property {string} id - Unique identifier for the violation (e.g., image/frame id).
 * @property {string} issue - Human-readable issue description.
 * @property {('low'|'medium'|'high')} severity - Severity level of the violation.
 * @property {number} [confidence] - Confidence score (0..1).
 * @property {string} [ruleCode] - Internal rule code that triggered the violation.
 * @property {Record<string, any>} [meta] - Additional machine-readable metadata.
 * @property {boolean} [detectedOldBrand] - True if this violation is due to old brand detection.
 * @property {Array<{x:number,y:number,w:number,h:number,label?:string,color?:string}>} [detectedOldBrandRegions] - Regions where old brand was detected.
 */

/**
 * @typedef {Object} Preview
 * @property {string} id - Preview identifier.
 * @property {string} url - URL to preview image or resource.
 * @property {string} [note] - Optional note for the preview.
 * @property {Record<string, any>} [overlays] - Rendering overlays or annotations meta.
 */

/**
 * @typedef {Object} Job
 * @property {string} id - Job identifier.
 * @property {JobStatus} status - Current job status.
 * @property {Violation[]} [violations] - List of detected violations.
 * @property {Preview[]} [previews] - Optional previews for flagged items.
 * @property {string} [createdAt] - ISO timestamp when job was created.
 * @property {string} [updatedAt] - ISO timestamp when job was last updated.
 * @property {string} [requestedBy] - User ID or email who initiated the job.
 * @property {{filename?:string,mime?:string}} [oldBrand] - Metadata for uploaded old-brand image used for detection.
 * @property {{filename?:string,mime?:string}} [newBrand] - Metadata for optional new-brand image for replacement.
 */

/**
 * @typedef {Object} FixRequest
 * @property {string} jobId - Target job identifier to fix.
 * @property {string[]} [includeIds] - Specific violation IDs to include in fixes.
 * @property {Record<string, any>} [parameters] - Additional algorithm parameters for fixes.
 * @property {string} [reason] - Reason for fix request (for audit trails).
 * @property {('replace_brand'|'custom'|'auto')} [operation] - Operation type; 'replace_brand' replaces old with new brand.
 * @property {{ userId:string, timestamp:string, action:string, reason?:string, signatureId?:string }} [audit] - Audit fields.
 */

/**
 * @typedef {Object} AuditEntry
 * @property {string} id - Audit entry identifier.
 * @property {string} userId - User ID associated with the action.
 * @property {string} action - Action type (CREATE/READ/UPDATE/DELETE or domain-specific).
 * @property {string} timestamp - ISO8601 timestamp of the action.
 * @property {Record<string, any>} [context] - Contextual metadata for the action.
 * @property {Record<string, any>} [before] - Data snapshot before change (if applicable).
 * @property {Record<string, any>} [after] - Data snapshot after change (if applicable).
 * @property {string} [signatureId] - ID of bound electronic signature (if applicable).
 */

/**
 * @typedef {Object} ApiError
 * @property {string} name - Error name/category (e.g., 'NetworkError', 'HttpError').
 * @property {string} message - User-friendly message.
 * @property {number} [status] - HTTP status code if available.
 * @property {string} [requestId] - Correlation ID from server if present.
 * @property {string} [code] - Backend-specific error code.
 * @property {any} [details] - Structured details if provided by backend.
 */

// PUBLIC_INTERFACE
export const __contracts__ = {
  // Dummy export to keep typedefs referenced for some tooling;
  // actual runtime value is irrelevant. Helps with tree-shaking safety.
  version: "1.0.0",
};

export default undefined;
