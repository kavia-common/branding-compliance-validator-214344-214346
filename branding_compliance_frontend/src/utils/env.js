//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-023
// User Story: As a frontend, I need safe environment variable access without relying on Node's process in the browser.
// Acceptance Criteria:
// - Provide getEnv(key, fallback) that reads from window.__ENV__, import.meta.env, and guarded process.env
// - Avoid runtime ReferenceError in browsers where process is undefined
// - Document PUBLIC_INTERFACE
// GxP Impact: NO - configuration helper; indirectly supports reliable operation
// Risk Level: LOW
// Validation Protocol: VP-FE-023
// ============================================================================
// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================
// None - utility file
// ============================================================================

/**
 * PUBLIC_INTERFACE
 * getEnv
 * Purpose: Safely read environment values in browser across different bundlers (CRA/Vite) and runtime shims.
 * Parameters:
 *  - key: string - environment variable name (e.g., 'REACT_APP_API_BASE_URL')
 *  - fallback?: any - value to return if not found
 * Returns: string|any - resolved value or fallback
 */
export function getEnv(key, fallback = undefined) {
  // 1) Window-provided runtime env shim has highest precedence
  if (typeof window !== "undefined" && window.__ENV__ && Object.prototype.hasOwnProperty.call(window.__ENV__, key)) {
    return window.__ENV__[key];
  }
  // 2) Vite-style import.meta.env
  try {
    // Guarded access to import.meta.env without referencing the reserved identifier directly
    const getImportMeta = () => (typeof import.meta !== "undefined" ? import.meta : undefined);
    const im = getImportMeta && getImportMeta();
    if (im && im.env && Object.prototype.hasOwnProperty.call(im.env, key)) {
      return im.env[key];
    }
  } catch {
    // ignore
  }
  // 3) CRA-style process.env with guard for process existence
  const hasProcess = typeof process !== "undefined" && process && typeof process.env !== "undefined";
  if (hasProcess && Object.prototype.hasOwnProperty.call(process.env, key)) {
    return process.env[key];
  }
  return fallback;
}

/**
 * PUBLIC_INTERFACE
 * getBoolEnv
 * Purpose: Convenience to read boolean-like env values, defaulting to provided fallback.
 * Parameters:
 *  - key: string
 *  - fallback?: boolean
 * Returns: boolean
 */
export function getBoolEnv(key, fallback = false) {
  const raw = getEnv(key, undefined);
  if (raw === undefined || raw === null) return Boolean(fallback);
  const str = String(raw).toLowerCase().trim();
  if (["1", "true", "yes", "on"].includes(str)) return true;
  if (["0", "false", "no", "off"].includes(str)) return false;
  return Boolean(fallback);
}

export default { getEnv, getBoolEnv };
