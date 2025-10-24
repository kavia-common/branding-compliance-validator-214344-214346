//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-006
// User Story: As a frontend, I need a robust API client that adds required headers,
//             handles JSON/multipart, retries transient failures, and normalizes errors.
// Acceptance Criteria:
// - Exponential backoff retries with jitter for network/5xx
// - Standard headers: Content-Type (as applicable), X-Request-ID (UUIDv4),
//   optional Authorization (Bearer), X-User-ID when available
// - JSON and multipart/form-data request handling
// - Error normalization with user-friendly message and technical details
// - Helper methods for GET/POST/PUT/PATCH/DELETE with typed responses
// - Tree-shakable exports
// GxP Impact: YES - captures user attribution and correlation IDs in all requests.
// Risk Level: MEDIUM
// Validation Protocol: VP-FE-006
// ============================================================================
// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================
// None; uses browser fetch, crypto (for UUID), and process.env via bundler.
// ============================================================================

import { getApiBaseUrl } from "./contracts";

/**
 * PUBLIC_INTERFACE
 * uuidv4
 * Purpose: Generate a RFC 4122 UUID v4 using the Web Crypto API when available.
 * GxP Critical: Yes - used for X-Request-ID correlation in audit trails.
 * Parameters: none
 * Returns: string - UUIDv4
 */
export function uuidv4() {
  // Use Web Crypto if available; fall back to a simple polyfill if not.
  if (typeof crypto !== "undefined" && crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: adapted from StackOverflow UUIDv4 polyfills
  const rnd = (a) => (a ^ (Math.random() * 16) >> (a / 4)).toString(16);
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, rnd);
}

/**
 * PUBLIC_INTERFACE
 * getAuthContext
 * Purpose: Read Authorization bearer token and userId from application context.
 * GxP Critical: Yes - used to attribute requests to a specific user.
 * Returns: { token?: string, userId?: string }
 * Note: This uses localStorage keys established by the current simple auth mock.
 *       Replace with a real AuthContext/provider integration when available.
 */
export function getAuthContext() {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const token = parsed?.token; // future integration
    const userId = parsed?.id || parsed?.email;
    return { token, userId };
  } catch {
    return {};
  }
}

/**
 * Normalize various error shapes into ApiError
 * @param {any} err
 * @param {string} [fallbackMessage]
 * @returns {import('./contracts').ApiError}
 */
function normalizeError(err, fallbackMessage = "Unexpected error occurred") {
  const apiErr = {
    name: "UnknownError",
    message: fallbackMessage,
  };

  if (typeof err === "string") {
    apiErr.message = err;
    return apiErr;
  }

  if (err?.name) apiErr.name = err.name;
  if (err?.message) apiErr.message = err.message;

  // Include HTTP-specific details if present
  if (typeof err?.status === "number") apiErr.status = err.status;
  if (err?.code) apiErr.code = err.code;
  if (err?.requestId) apiErr.requestId = err.requestId;
  if (err?.details) apiErr.details = err.details;

  return apiErr;
}

/**
 * Decide whether an error/response is retryable.
 * Retries on:
 *  - Network errors (TypeError from fetch)
 *  - 429 Too Many Requests
 *  - 5xx server errors
 * @param {Response|any} reason
 */
function isRetryable(reason) {
  if (reason instanceof Response) {
    const s = reason.status;
    return s === 429 || (s >= 500 && s <= 599);
  }
  // fetch network error often is TypeError
  if (reason && reason.name === "TypeError") return true;
  return false;
}

/**
 * Sleep helper for backoff
 * @param {number} ms
 */
function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * PUBLIC_INTERFACE
 * apiFetch
 * Purpose: Core fetch wrapper adding standard headers, handling JSON/multipart,
 *          implementing retry with exponential backoff, and normalizing errors.
 * GxP Critical: Yes - enforces user attribution headers and correlation IDs.
 * Parameters:
 *  - path: string - relative or absolute path
 *  - options: {
 *      method?: string,
 *      headers?: Record<string,string>,
 *      query?: Record<string, string|number|boolean|undefined>,
 *      json?: any,
 *      formData?: FormData,
 *      signal?: AbortSignal,
 *      retry?: { attempts?: number, baseMs?: number, maxMs?: number }
 *    }
 * Returns: Promise<{ ok: boolean, status: number, headers: Headers, data: any, requestId: string }>
 * Throws: ApiError on non-ok responses or failures after retries
 * Audit: Adds X-Request-ID to correlate with backend logs; includes X-User-ID.
 */
export async function apiFetch(path, options = {}) {
  const base = getApiBaseUrl();
  const method = (options.method || "GET").toUpperCase();
  const retryCfg = {
    attempts: Math.max(0, options?.retry?.attempts ?? 2), // additional retries beyond first try
    baseMs: Math.max(50, options?.retry?.baseMs ?? 150),
    maxMs: Math.max(250, options?.retry?.maxMs ?? 1500),
  };

  // Build URL with query
  const isAbsolute = /^https?:\/\//i.test(path);
  const urlBase = isAbsolute ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const url = new URL(urlBase, window?.location?.origin);
  const query = options.query || {};
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  // Headers
  const reqId = uuidv4();
  const hdrs = new Headers(options.headers || {});
  const { token, userId } = getAuthContext();

  // Content-Type: set only for JSON; for FormData, let browser set the boundary.
  const hasJson = options.json !== undefined && options.formData === undefined;
  if (hasJson && !hdrs.has("Content-Type")) {
    hdrs.set("Content-Type", "application/json");
  }
  // Standard headers
  hdrs.set("X-Request-ID", reqId);
  if (userId && !hdrs.has("X-User-ID")) hdrs.set("X-User-ID", String(userId));
  if (token && !hdrs.has("Authorization")) hdrs.set("Authorization", `Bearer ${token}`);

  // Body
  let body;
  if (options.formData instanceof FormData) {
    body = options.formData; // browser will set proper multipart boundary
  } else if (hasJson) {
    body = JSON.stringify(options.json);
  }

  // Retry loop (first try + N retries)
  const maxTries = 1 + retryCfg.attempts;
  let lastErr = null;
  let attempt = 0;

  while (attempt < maxTries) {
    try {
      const res = await fetch(url.toString(), {
        method,
        headers: hdrs,
        body,
        signal: options.signal,
      });

      const contentType = res.headers.get("Content-Type") || "";
      const isJson = contentType.includes("application/json") || contentType.includes("+json");
      let data;
      if (isJson) {
        // Attempt JSON parse; empty body yields null
        const text = await res.text();
        data = text ? JSON.parse(text) : null;
      } else if (contentType.startsWith("text/")) {
        data = await res.text();
      } else if (!res.ok && res.status !== 204) {
        // For error binary payloads, read as blob to extract message when possible
        try {
          const blob = await res.blob();
          data = { blob };
        } catch {
          data = null;
        }
      } else if (res.status === 204) {
        data = null;
      } else {
        // default to arrayBuffer for binary success
        data = await res.arrayBuffer();
      }

      if (!res.ok) {
        // Build normalized error
        const errObj = {
          name: "HttpError",
          message: (data && (data.message || data.detail)) || `Request failed with status ${res.status}`,
          status: res.status,
          requestId: res.headers.get("X-Request-ID") || reqId,
          code: data?.code,
          details: data,
        };
        if (isRetryable(res) && attempt < maxTries - 1) {
          lastErr = errObj;
          const backoff = Math.min(retryCfg.maxMs, retryCfg.baseMs * Math.pow(2, attempt));
          const jitter = Math.random() * (retryCfg.baseMs / 2);
          await delay(backoff + jitter);
          attempt++;
          continue;
        }
        throw errObj;
      }

      return {
        ok: true,
        status: res.status,
        headers: res.headers,
        data,
        requestId: res.headers.get("X-Request-ID") || reqId,
      };
    } catch (err) {
      // Network error or thrown HttpError
      if (isRetryable(err) && attempt < maxTries - 1) {
        lastErr = err;
        const backoff = Math.min(retryCfg.maxMs, retryCfg.baseMs * Math.pow(2, attempt));
        const jitter = Math.random() * (retryCfg.baseMs / 2);
        await delay(backoff + jitter);
        attempt++;
        continue;
      }
      const norm = normalizeError(err);
      throw norm;
    }
  }

  // If loop exits without return, throw last error
  throw normalizeError(lastErr || new Error("Request failed after retries"));
}

/**
 * PUBLIC_INTERFACE
 * getJson
 * Purpose: Convenience wrapper for GET requests expecting JSON response.
 * GxP Critical: Yes - standardizes error handling and headers.
 * Parameters:
 *  - path: string
 *  - options?: Omit<Parameters<typeof apiFetch>[1], 'method' | 'json' | 'formData'>
 * Returns: Promise<any>
 */
export async function getJson(path, options) {
  const res = await apiFetch(path, { ...(options || {}), method: "GET" });
  return res.data;
}

/**
 * PUBLIC_INTERFACE
 * postJson
 * Purpose: POST JSON body and parse JSON response.
 * GxP Critical: Yes
 * Parameters:
 *  - path: string
 *  - body: any
 *  - options?: Omit<Parameters<typeof apiFetch>[1], 'method' | 'json' | 'formData'>
 * Returns: Promise<any>
 */
export async function postJson(path, body, options) {
  const res = await apiFetch(path, { ...(options || {}), method: "POST", json: body });
  return res.data;
}

/**
 * PUBLIC_INTERFACE
 * putJson
 * Purpose: PUT JSON body and parse JSON response.
 * GxP Critical: Yes
 * Parameters similar to postJson
 */
export async function putJson(path, body, options) {
  const res = await apiFetch(path, { ...(options || {}), method: "PUT", json: body });
  return res.data;
}

/**
 * PUBLIC_INTERFACE
 * patchJson
 * Purpose: PATCH JSON body and parse JSON response.
 * GxP Critical: Yes
 * Parameters similar to postJson
 */
export async function patchJson(path, body, options) {
  const res = await apiFetch(path, { ...(options || {}), method: "PATCH", json: body });
  return res.data;
}

/**
 * PUBLIC_INTERFACE
 * del
 * Purpose: DELETE request with optional query; returns JSON if present else null.
 * GxP Critical: Yes
 * Parameters:
 *  - path: string
 *  - options?: Omit<Parameters<typeof apiFetch>[1], 'method' | 'json' | 'formData'>
 * Returns: Promise<any>
 */
export async function del(path, options) {
  const res = await apiFetch(path, { ...(options || {}), method: "DELETE" });
  return res.data;
}

/**
 * PUBLIC_INTERFACE
 * postMultipart
 * Purpose: Send multipart/form-data, typically for uploads.
 * GxP Critical: Yes - maintains correlation and user attribution.
 * Parameters:
 *  - path: string
 *  - formData: FormData
 *  - options?: Omit<Parameters<typeof apiFetch>[1], 'method' | 'json' | 'formData'>
 * Returns: Promise<any>
 */
export async function postMultipart(path, formData, options) {
  const res = await apiFetch(path, { ...(options || {}), method: "POST", formData });
  return res.data;
}

// Tree-shakable named exports only; no default export to encourage explicit imports.
