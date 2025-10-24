//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-011
// User Story: As a user, after a job is created I want the UI to automatically poll for job status/results and stop when complete or failed.
// Acceptance Criteria:
// - Poll GET /api/v1/jobs/{id} for status with exponential backoff
// - When status is running/completed, also poll GET /api/v1/jobs/{id}/results to fetch violations
// - Cancellation support (unmount or explicit stop)
// - Error handling with normalization
// - Terminal states: completed, failed -> stop polling automatically
// GxP Impact: YES - ensures accurate, timely updates and robust error handling for auditability
// Risk Level: MEDIUM
// Validation Protocol: VP-FE-011
// ============================================================================
// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================
// Using existing API client helpers and error formatting utilities
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getJson } from "../api/client";
import { normalizeApiError } from "../utils/errorHandling";

/**
 * Backoff helper to compute next delay with jitter and max cap.
 * @param {number} attempt - zero-based attempt number
 * @param {number} baseMs - base delay
 * @param {number} maxMs - maximum delay
 */
function computeBackoff(attempt, baseMs, maxMs) {
  const exp = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * (baseMs / 2);
  return Math.min(maxMs, exp + jitter);
}

/**
 * PUBLIC_INTERFACE
 * usePollingJobStatus
 * Purpose: Poll job status and results for a given jobId with backoff and cancellation.
 * GxP Critical: Yes - Provides timely and accurate updates with robust error handling.
 * Parameters:
 *  - jobId: string | null
 *  - options?: {
 *      start?: boolean,           // whether to start polling immediately
 *      baseMs?: number,           // initial backoff delay (default 1000)
 *      maxMs?: number,            // max backoff delay (default 8000)
 *      resultsPageSize?: number,  // default pagination size for results
 *    }
 * Returns:
 *  {
 *    status: 'idle'|'pending'|'running'|'completed'|'failed',
 *    isTerminal: boolean,
 *    violations: Array,
 *    totalViolations: number|null,
 *    loading: boolean,
 *    error: ApiError|null,
 *    page: number,
 *    pageSize: number,
 *    setPage: (n:number)=>void,
 *    setFilter: (f:{severity?:string|undefined, q?:string|undefined})=>void,
 *    filter: {severity?:string,q?:string},
 *    start: ()=>void,
 *    stop: ()=>void,
 *    refreshNow: ()=>Promise<void>, // force-refresh once
 *  }
 */
export function usePollingJobStatus(jobId, options = {}) {
  const [status, setStatus] = useState("idle");
  const [violations, setViolations] = useState([]);
  const [totalViolations, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options.resultsPageSize || 10);
  const [filter, setFilter] = useState({ severity: "", q: "" });

  const runningRef = useRef(false);
  const abortRef = useRef(null);
  const attemptsRef = useRef(0);
  const statusAttemptsRef = useRef(0);
  const timerRef = useRef(null);

  const baseMs = Math.max(500, options.baseMs || 1000);
  const maxMs = Math.max(baseMs, options.maxMs || 8000);

  const isTerminal = useMemo(() => status === "completed" || status === "failed", [status]);

  const cleanupTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelOngoing = () => {
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
      abortRef.current = null;
    }
  };

  const stop = useCallback(() => {
    runningRef.current = false;
    cleanupTimer();
    cancelOngoing();
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return null;
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const data = await getJson(`/api/v1/jobs/${encodeURIComponent(jobId)}`, {
        signal: ac.signal,
        retry: { attempts: 1, baseMs: 200, maxMs: 1200 },
      });
      const st = (data?.status || "pending").toLowerCase();
      setStatus(st);
      setErr(null);
      return st;
    } catch (e) {
      const norm = normalizeApiError(e);
      setErr(norm);
      return null;
    } finally {
      abortRef.current = null;
    }
  }, [jobId]);

  const fetchResults = useCallback(async () => {
    if (!jobId) return;
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const query = {
        page,
        page_size: pageSize,
        severity: filter.severity || undefined,
        q: (filter.q || "").trim() || undefined,
      };
      const res = await getJson(`/api/v1/jobs/${encodeURIComponent(jobId)}/results`, {
        signal: ac.signal,
        retry: { attempts: 1, baseMs: 200, maxMs: 1200 },
        query,
      });
      const list = Array.isArray(res?.violations) ? res.violations : (Array.isArray(res) ? res : []);
      const total = typeof res?.total === "number" ? res.total : (res?.pagination?.total ?? null);
      setViolations(list);
      setTotal(total);
      setErr(null);
    } catch (e) {
      const norm = normalizeApiError(e);
      setErr(norm);
    } finally {
      abortRef.current = null;
    }
  }, [jobId, page, pageSize, filter]);

  const tick = useCallback(async () => {
    if (!runningRef.current || !jobId) return;

    setLoading(true);
    const st = await fetchStatus();
    setLoading(false);

    if (!runningRef.current) return;

    if (st === "running" || st === "completed") {
      // On running/completed, fetch results for current page/filter
      await fetchResults();
      statusAttemptsRef.current = 0; // reset status backoff once a good status call returns
    }

    if (st === "completed" || st === "failed") {
      runningRef.current = false;
      cleanupTimer();
      return;
    }

    // schedule next poll with backoff
    const attempt = statusAttemptsRef.current++;
    const delayMs = computeBackoff(attempt, baseMs, maxMs);
    cleanupTimer();
    timerRef.current = setTimeout(() => {
      tick();
    }, delayMs);
  }, [jobId, fetchStatus, fetchResults, baseMs, maxMs]);

  const start = useCallback(() => {
    if (!jobId) return;
    if (runningRef.current) return;
    runningRef.current = true;
    attemptsRef.current = 0;
    statusAttemptsRef.current = 0;
    cleanupTimer();
    cancelOngoing();
    // immediate first tick
    tick();
  }, [jobId, tick]);

  const refreshNow = useCallback(async () => {
    if (!jobId) return;
    // fetch once (status + results if needed) without altering running flag
    const st = await fetchStatus();
    if (st === "running" || st === "completed") {
      await fetchResults();
    }
  }, [jobId, fetchStatus, fetchResults]);

  // Auto-start behavior
  useEffect(() => {
    if (!jobId) {
      stop();
      setStatus("idle");
      setViolations([]);
      setTotal(null);
      setErr(null);
      return undefined;
    }
    if (options.start) {
      start();
    }
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // When filter or page changes while running, refresh results promptly
  useEffect(() => {
    if (runningRef.current && jobId && (status === "running" || status === "completed")) {
      // debounce minor: direct fetchResults
      fetchResults();
    }
  }, [page, pageSize, filter, jobId, fetchResults, status]);

  const api = useMemo(() => ({
    status,
    isTerminal,
    violations,
    totalViolations,
    loading,
    error,
    page,
    pageSize,
    setPage,
    setPageSize,
    setFilter,
    filter,
    start,
    stop,
    refreshNow,
  }), [status, isTerminal, violations, totalViolations, loading, error, page, pageSize, filter, start, stop, refreshNow]);

  return api;
}

export default usePollingJobStatus;
