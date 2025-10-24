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

  // Normalize overlay dimensions if provided as relative (0..1)
  const mapOverlayBox = (box, naturalW, naturalH) => {
    const isRelative = box?.x <= 1 && box?.y <= 1 && box?.w <= 1 && box?.h <= 1;
    if (isRelative && naturalW && naturalH) {
      return {
        ...box,
        x: box.x * naturalW,
        y: box.y * naturalH,
        w: box.w * naturalW,
        h: box.h * naturalH,
      };
    }
    return box;
  };

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
        // Prefer reading suggestions from preview list if present, else direct endpoint, else fallback defaults
        let fixes = [];
        try {
          const detail = await getJson(`/api/v1/jobs/${encodeURIComponent(jobId)}/previews`, {
            retry: { attempts: 1, baseMs: 200, maxMs: 1200 }
          });
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
          } catch {
            // Local fallback suggestions where backend suggestions are unavailable.
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

  // Refresh previews after applying a fix
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
        // Target preview/violation to fix
        targetId: selected.id,
        // Fix type/code
        fixId: fix?.id || fix?.code || "custom",
        // Parameters passed through to backend algorithm
        parameters: fix?.parameters || {},
        // Audit trail fields (ALCOA+)
        audit: {
          userId,
          timestamp: new Date().toISOString(),
          action: "APPLY_FIX",
          reason: reason.trim(),
          signatureId: esign ? String(esign) : undefined, // eSign placeholder when captured
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

  // We use a natural-size tracker to better render overlays if coordinates are relative.
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

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
                  onLoad={(e) => {
                    try {
                      const img = e.currentTarget;
                      setNaturalSize({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
                    } catch { /* ignore */ }
                  }}
                />
                {/* Overlays: draw boxes if provided under selected.overlays.boxes 
                    Accepts absolute (px) or relative (0..1) coordinates. */}
                {!!selected?.overlays?.boxes && Array.isArray(selected.overlays.boxes) && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {selected.overlays.boxes.map((b, idx) => {
                      const bx = mapOverlayBox(b, naturalSize.w, naturalSize.h);
                      return (
                        <div
                          key={idx}
                          title={bx.label || "overlay"}
                          style={{
                            position: "absolute",
                            left: bx.x,
                            top: bx.y,
                            width: bx.w,
                            height: bx.h,
                            border: `2px solid ${bx.color || "rgba(59,130,246,0.9)"}`,
                            borderRadius: 6,
                            boxShadow: "0 0 0 2px rgba(255,255,255,0.6) inset",
                          }}
                        />
                      );
                    })}
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
              {/* Replace with new brand dedicated action when old-brand detection present */}
              {(selected?.detectedOldBrand || selected?.overlays?.detectedOldBrand || selected?.note?.toLowerCase?.().includes?.("old-brand")) && (
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div className="row" style={{ alignItems: "center", gap: 8 }}>
                    <span className="badge important">Old-brand detected</span>
                    <span className="badge">You can request replacement with the new brand</span>
                  </div>
                  <button
                    className="btn secondary"
                    onClick={async () => {
                      // PUBLIC_INTERFACE
                      /**
                       * Replace with new brand operation
                       * Purpose: Call /api/v1/jobs/{id}/fixes with operation 'replace_brand'
                       * GxP Critical: Yes - includes audit metadata.
                       * Parameters: none
                       * Returns: void
                       */
                      if (!jobId || !selected?.id) return;
                      if (!reason || reason.trim().length < 3) {
                        const err = { name: "ValidationError", message: "Please enter a brief reason (min 3 chars).", code: "REASON_REQUIRED" };
                        setError(err);
                        onError?.(err);
                        return;
                      }
                      setApplyLoading(true);
                      setError(null);
                      try {
                        const payload = {
                          operation: "replace_brand",
                          targetId: selected.id,
                          parameters: {}, // backend may use job-level new_brand
                          audit: {
                            userId,
                            timestamp: new Date().toISOString(),
                            action: "APPLY_FIX",
                            reason: reason.trim(),
                            signatureId: esign ? String(esign) : undefined,
                          },
                        };
                        const res = await postJson(`/api/v1/jobs/${encodeURIComponent(jobId)}/fixes`, payload, {
                          retry: { attempts: 1, baseMs: 200, maxMs: 1200 }
                        });
                        onApplied?.(res);
                        await refreshPreviews();
                      } catch (e) {
                        const norm = normalizeApiError(e);
                        setError(norm);
                        onError?.(norm);
                      } finally {
                        setApplyLoading(false);
                      }
                    }}
                    disabled={applyLoading}
                    aria-label="Replace with new brand"
                  >
                    {applyLoading ? "Applying…" : "Replace with new brand"}
                  </button>
                </div>
              )}
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
