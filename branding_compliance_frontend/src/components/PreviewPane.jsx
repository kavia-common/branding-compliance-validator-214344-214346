import React, { useEffect, useMemo, useState } from "react";
import { getJson, postJson } from "../api/client";
import { formatApiError, normalizeApiError } from "../utils/errorHandling";

/**
 * ============================================================================
 * REQUIREMENT TRACEABILITY
 * ============================================================================
 * Requirement ID: REQ-FE-013
 * User Story: As a user, I want to preview flagged images with overlays and apply suggested fixes with audit controls.
 * Acceptance Criteria:
 * - Shows selected preview image with optional overlays/annotations
 * - Fetches and lists suggested fixes for selected violation/image
 * - Apply fix posts to /api/v1/jobs/{jobId}/fixes with audit info and parameters
 * - After fix, refresh previews via GET /api/v1/jobs/{jobId}/previews
 * - Graceful error handling and user feedback
 * GxP Impact: YES - includes audit trail fields and e-sign placeholder support
 * Risk Level: MEDIUM
 * Validation Protocol: VP-FE-013
 * ============================================================================
 * ============================================================================
 * IMPORTS AND DEPENDENCIES
 * ============================================================================
 * Uses api/client for REST calls and error utilities.
 * ============================================================================
 */

/**
 * PUBLIC_INTERFACE
 * PreviewPane
 * Purpose: Render a preview image with overlays and a list of suggested fixes.
 * GxP Critical: Yes - Emits audit metadata when applying a fix.
 * Parameters:
 *  - jobId: string
 *  - selected: { id: string, url?: string, overlays?: any, note?: string } | null
 *  - user: { id?: string, email?: string } | null
 *  - onPreviewsUpdated?: (previews: Array<any>) => void   // called after refresh
 *  - onApplied?: (result: any) => void                    // when a fix is applied successfully
 *  - onError?: (apiErr: any) => void                      // surfaced errors
 * Returns: JSX.Element
 * Throws: None
 * Audit: Applies fixes with { userId, timestamp, reason, esign } metadata.
 */
export default function PreviewPane({ jobId, selected, user, onPreviewsUpdated, onApplied, onError }) {
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState("");
  const [esign, setEsign] = useState(""); // placeholder: capture if available

  const userId = useMemo(() => user?.id || user?.email || "unknown-user", [user]);

  // Load suggested fixes for selected preview/violation
  useEffect(() => {
    let mounted = true;
    async function loadSuggestions() {
      if (!jobId || !selected?.id) {
        setSuggested([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Common patterns: /previews/{id}/fixes or /fixes?suggest_for=...
        // We'll prefer: GET /api/v1/jobs/{jobId}/previews to get list, which may include suggested; else fallback to /previews/{id}/fixes
        // First attempt to read suggestions from preview detail endpoint (if exists)
        let fixes = [];
        try {
          const detail = await getJson(`/api/v1/jobs/${encodeURIComponent(jobId)}/previews`, {
            retry: { attempts: 1, baseMs: 200, maxMs: 1200 }
          });
          // detail could be array; find the selected preview
          const list = Array.isArray(detail?.previews) ? detail.previews : (Array.isArray(detail) ? detail : []);
          const item = list.find(p => String(p.id) === String(selected.id));
          if (item?.suggestedFixes && Array.isArray(item.suggestedFixes)) {
            fixes = item.suggestedFixes;
          }
        } catch {
          // ignore and try direct endpoint
        }
        if (!fixes.length) {
          try {
            const direct = await getJson(`/api/v1/jobs/${encodeURIComponent(jobId)}/previews/${encodeURIComponent(selected.id)}/fixes`, {
              retry: { attempts: 1, baseMs: 200, maxMs: 1200 }
            });
            fixes = Array.isArray(direct) ? direct : (Array.isArray(direct?.items) ? direct.items : []);
          } catch (e) {
            // If suggestions endpoint not available, represent basic fix types as placeholders
            fixes = [
              { id: "auto-adjust-colors", label: "Auto adjust colors", parameters: { strategy: "color_tolerance" } },
              { id: "apply-brand-watermark", label: "Apply brand watermark", parameters: { opacity: 0.12, position: "bottom-right" } }
            ];
          }
        }
        if (mounted) setSuggested(fixes);
      } catch (e) {
        const norm = normalizeApiError(e);
        if (mounted) setError(norm);
        onError?.(norm);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSuggestions();
    return () => { mounted = false; };
  }, [jobId, selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshPreviews = async () => {
    if (!jobId) return;
    try {
      const previews = await getJson(`/api/v1/jobs/${encodeURIComponent(jobId)}/previews`, {
        retry: { attempts: 1, baseMs: 200, maxMs: 1200 }
      });
      const list = Array.isArray(previews?.previews) ? previews.previews : (Array.isArray(previews) ? previews : []);
      onPreviewsUpdated?.(list);
    } catch (e) {
      const norm = normalizeApiError(e);
      setError(norm);
      onError?.(norm);
    }
  };

  // Handler to apply a selected fix
  const applyFix = async (fix) => {
    if (!jobId || !selected?.id) return;
    if (!reason || reason.trim().length < 3) {
      const msg = "Please enter a brief reason (min 3 chars) for audit.";
      const err = { name: "ValidationError", message: msg, code: "REASON_REQUIRED" };
      setError(err);
      onError?.(err);
      return;
    }
    setApplyLoading(true);
    setError(null);
    try {
      const payload = {
        targetId: selected.id,
        fixId: fix?.id || fix?.code || "custom",
        parameters: fix?.parameters || {},
        audit: {
          userId,
          timestamp: new Date().toISOString(),
          action: "APPLY_FIX",
          reason: reason.trim(),
          signatureId: esign ? String(esign) : undefined, // placeholder binding if available
        },
      };
      const res = await postJson(`/api/v1/jobs/${encodeURIComponent(jobId)}/fixes`, payload, {
        retry: { attempts: 1, baseMs: 200, maxMs: 1200 }
      });
      onApplied?.(res);
      await refreshPreviews(); // ensure UI reflects new preview state
    } catch (e) {
      const norm = normalizeApiError(e);
      setError(norm);
      onError?.(norm);
    } finally {
      setApplyLoading(false);
    }
  };

  const imageUrl = useMemo(() => selected?.url || "", [selected]);

  return (
    <div className="col" style={{ gap: 10 }}>
      {!selected ? (
        <div className="badge">Select a result to preview.</div>
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="section-title">Preview: {String(selected.id)}</div>
            {!!selected?.note && <span className="badge">{selected.note}</span>}
          </div>

          <div className="card" style={{ padding: 8, minHeight: 260 }}>
            {imageUrl ? (
              <div style={{ position: "relative", width: "100%", minHeight: 240 }}>
                <img
                  src={imageUrl}
                  alt={`Preview ${selected.id}`}
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: 10 }}
                />
                {/* Overlays (simple demo): draw boxes if provided in overlays.boxes = [{x,y,w,h,label,color}] */}
                {!!selected?.overlays?.boxes && Array.isArray(selected.overlays.boxes) && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {selected.overlays.boxes.map((b, idx) => (
                      <div
                        key={idx}
                        title={b.label || "overlay"}
                        style={{
                          position: "absolute",
                          left: b.x,
                          top: b.y,
                          width: b.w,
                          height: b.h,
                          border: `2px solid ${b.color || "rgba(59,130,246,0.9)"}`,
                          borderRadius: 6,
                          boxShadow: "0 0 0 2px rgba(255,255,255,0.6) inset",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: 220, display: "grid", placeItems: "center", color: "var(--ocn-muted)" }}>
                Preview Image Placeholder
              </div>
            )}
          </div>

          <div className="col">
            <div className="section-title">Apply Fix</div>
            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <input
                className="input"
                placeholder="Reason for change (audit)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-label="Reason for fix"
              />
              <input
                className="input"
                placeholder="E-signature ID (optional placeholder)"
                value={esign}
                onChange={(e) => setEsign(e.target.value)}
                aria-label="E-signature placeholder"
                style={{ maxWidth: 240 }}
              />
            </div>
            <div className="card" style={{ padding: 10 }}>
              {loading ? (
                <div className="badge">Loading suggestions…</div>
              ) : suggested.length === 0 ? (
                <div className="badge">No suggestions available. You may need to configure rules.</div>
              ) : (
                <div className="col" style={{ gap: 8 }}>
                  {suggested.map((fix) => (
                    <div key={fix.id || fix.label} className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <div className="row" style={{ alignItems: "center", gap: 8 }}>
                        <span className="badge important">{fix.label || fix.id}</span>
                        {!!fix?.parameters && (
                          <span className="badge" title={JSON.stringify(fix.parameters)}>
                            params
                          </span>
                        )}
                      </div>
                      <button
                        className="btn"
                        onClick={() => applyFix(fix)}
                        disabled={applyLoading}
                        aria-label={`Apply fix ${fix.label || fix.id}`}
                      >
                        {applyLoading ? "Applying…" : "Apply"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!!error && (
            <div className="badge error">
              {formatApiError(error)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
