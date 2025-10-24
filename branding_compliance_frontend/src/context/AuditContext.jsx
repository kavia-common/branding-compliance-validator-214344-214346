import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { uuidv4, postJson } from "../api/client";

/**
 * ============================================================================
 * REQUIREMENT TRACEABILITY
 * ============================================================================
 * Requirement ID: REQ-FE-021
 * User Story: As a system, I need to record client-side audit events with user attribution and correlation IDs.
 * Acceptance Criteria:
 * - Provide enqueueAudit(action, context, before, after, signatureId?)
 * - Attach ISO timestamp, X-Request-ID
 * - Batch send to /api/v1/audit when backend is ready (graceful fallback if not)
 * - Expose flush method
 * GxP Impact: YES - Implements contemporaneous audit trail capture (ALCOA+)
 * Risk Level: MEDIUM
 * Validation Protocol: VP-FE-021
 * ============================================================================
 */

const AuditContext = createContext(null);

/**
 * PUBLIC_INTERFACE
 * useAudit
 * Purpose: Hook to access client-side audit utilities.
 * GxP Critical: Yes
 * Returns: { entries, enqueueAudit, flush, lastError }
 */
export function useAudit() {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error("useAudit must be used within AuditProvider");
  return ctx;
}

/**
 * PUBLIC_INTERFACE
 * AuditProvider
 * Purpose: Provide client-side audit queue and sender.
 * GxP Critical: Yes
 * Parameters:
 *  - children: React.ReactNode
 * Returns: JSX.Element
 */
export function AuditProvider({ children }) {
  const [entries, setEntries] = useState([]);
  const [lastError, setLastError] = useState(null);
  const sendingRef = useRef(false);

  /**
   * PUBLIC_INTERFACE
   * enqueueAudit
   * Purpose: Enqueue an audit entry for later batch submission.
   * GxP Critical: Yes
   * Parameters:
   *  - action: string
   *  - meta?: { userId?: string, requestId?: string, context?: any, before?: any, after?: any, signatureId?: string }
   * Returns: { id: string }
   */
  const enqueueAudit = useCallback((action, meta = {}) => {
    const id = uuidv4();
    const entry = {
      id,
      action,
      timestamp: new Date().toISOString(),
      userId: meta.userId || null,
      requestId: meta.requestId || uuidv4(),
      context: meta.context || null,
      before: meta.before || null,
      after: meta.after || null,
      signatureId: meta.signatureId || null,
    };
    setEntries((prev) => [...prev, entry]);
    return { id };
  }, []);

  /**
   * PUBLIC_INTERFACE
   * flush
   * Purpose: Attempt to batch send accumulated audit entries to backend.
   * GxP Critical: Yes
   * Parameters: none
   * Returns: Promise<{ sent: number, remaining: number }>
   */
  const flush = useCallback(async () => {
    if (sendingRef.current) return { sent: 0, remaining: entries.length };
    if (!entries.length) return { sent: 0, remaining: 0 };
    sendingRef.current = true;
    setLastError(null);
    const batch = entries.slice(0);
    try {
      // Backend path placeholder - ignore errors if not implemented.
      await postJson("/api/v1/audit", { items: batch }, { retry: { attempts: 1, baseMs: 150, maxMs: 800 } });
      // On success, clear all items that were sent (simple: clear queue)
      setEntries([]);
      return { sent: batch.length, remaining: 0 };
    } catch (e) {
      setLastError(e);
      // Keep queue for retry; consider truncation if excessively large
      if (entries.length > 5000) {
        setEntries((prev) => prev.slice(-1000)); // keep last 1000 to avoid memory bloat
      }
      return { sent: 0, remaining: entries.length };
    } finally {
      sendingRef.current = false;
    }
  }, [entries]);

  const value = useMemo(
    () => ({
      entries,
      enqueueAudit,
      flush,
      lastError,
    }),
    [entries, enqueueAudit, flush, lastError]
  );

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export default AuditContext;
