import React, { useEffect, useMemo, useState } from "react";

/**
 * ============================================================================
 * REQUIREMENT TRACEABILITY
 * ============================================================================
 * Requirement ID: REQ-FE-012
 * User Story: As a user, I want to review violations with filters and pagination.
 * Acceptance Criteria:
 * - Show list of violations with id, issue, severity, confidence
 * - Filter by severity and text search
 * - Pagination controls (next/prev and page size)
 * - Accessible labels and theme-consistent styling
 * GxP Impact: YES - Clear presentation supports accurate review and decision making
 * Risk Level: LOW
 * Validation Protocol: VP-FE-012
 * ============================================================================
 */

/**
 * PUBLIC_INTERFACE
 * ResultsTable
 * Purpose: Render a table-like list of violations with filtering and pagination controls.
 * GxP Critical: Yes - Ensures legible, accurate review of compliance results.
 * Parameters:
 *  - violations: Array<{id:string, issue:string, severity:string, confidence?:number}>
 *  - total: number|null
 *  - page: number
 *  - pageSize: number
 *  - onPageChange: (n:number)=>void
 *  - onPageSizeChange?: (n:number)=>void
 *  - filter: { severity?: string, q?: string }
 *  - onFilterChange: (f)=>void
 *  - onSelect?: (violation)=>void
 * Returns: JSX.Element
 */
export default function ResultsTable({
  violations = [],
  total = null,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  filter = {},
  onFilterChange,
  onSelect,
}) {
  const [q, setQ] = useState(filter.q || "");
  const [sev, setSev] = useState(filter.severity || "");

  useEffect(() => {
    setQ(filter.q || "");
    setSev(filter.severity || "");
  }, [filter]);

  const totalPages = useMemo(() => {
    if (!total || total <= 0) return 1;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const applyFilter = () => {
    onFilterChange?.({ q: q.trim(), severity: sev });
    if (page !== 1) onPageChange?.(1); // reset to first page on filter
  };

  const clearFilter = () => {
    setQ("");
    setSev("");
    onFilterChange?.({ q: "", severity: "" });
    if (page !== 1) onPageChange?.(1);
  };

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="section-title">Violations</div>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="Search text…"
            aria-label="Search violations"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 200 }}
          />
          <select
            className="input"
            aria-label="Filter by severity"
            value={sev}
            onChange={(e) => setSev(e.target.value)}
            style={{ width: 160 }}
          >
            <option value="">All severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button className="btn ghost" onClick={applyFilter}>Apply</button>
          <button className="btn ghost" onClick={clearFilter}>Clear</button>
        </div>
      </div>

      <div className="card" style={{ borderRadius: 12, overflow: "hidden" }}>
        <div className="row" style={{ padding: "10px 12px", borderBottom: "1px solid var(--ocn-border)", fontWeight: 700 }}>
          <div style={{ flex: 2 }}>ID</div>
          <div style={{ flex: 4 }}>Issue</div>
          <div style={{ flex: 2 }}>Severity</div>
          <div style={{ width: 100, textAlign: "right" }}>Conf.</div>
        </div>
        <div className="col">
          {violations.length === 0 ? (
            <div className="row" style={{ padding: "12px", color: "var(--ocn-muted)" }}>
              No violations to display.
            </div>
          ) : (
            violations.map(v => (
              <button
                key={v.id}
                onClick={() => onSelect?.(v)}
                className="row"
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom: "1px dashed var(--ocn-border)",
                  cursor: onSelect ? "pointer" : "default",
                  background: "transparent",
                  border: "none",
                }}
                aria-label={`Select violation ${v.id}`}
              >
                <div style={{ flex: 2, fontWeight: 600 }}>{v.id}</div>
                <div style={{ flex: 4 }}>{v.issue || "-"}</div>
                <div style={{ flex: 2 }}>
                  <span className={`badge ${v.severity === "high" ? "error" : v.severity === "medium" ? "important" : "success"}`}>
                    {v.severity || "unknown"}
                  </span>
                </div>
                <div style={{ width: 100, textAlign: "right" }}>
                  {typeof v.confidence === "number" ? `${Math.round(v.confidence * 100)}%` : "-"}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn ghost"
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ← Prev
          </button>
          <div className="badge">
            Page {page} of {totalPages}
          </div>
          <button
            className="btn ghost"
            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span className="badge">Rows:</span>
          <select
            className="input"
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            aria-label="Rows per page"
            style={{ width: 100 }}
          >
            {[5, 10, 20, 50].map(sz => <option key={sz} value={sz}>{sz}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
