/* Dashboard Screen - Ocean Professional layout */
//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-003
// User Story: As an authenticated user, I can upload inputs and view results, with clear placeholders for compliance features.
// Acceptance Criteria:
// - Upload area (zip, branding PNG, guidelines)
// - Results/flags center, preview on side
// - Download fixed zip button
// - Audit/e-sign placeholders
// - Role-gated actions placeholder
// GxP Impact: YES - includes audit/e-sign placeholders and mentions role checks
// Risk Level: MEDIUM
// Validation Protocol: VP-FE-003
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import UploadPanel from '../components/UploadPanel';
import { formatApiError } from '../utils/errorHandling';
import ResultsTable from '../components/ResultsTable';
import usePollingJobStatus from '../hooks/usePollingJobStatus';
import PreviewPane from '../components/PreviewPane';
import { getJson } from '../api/client';
import DownloadBar from '../components/DownloadBar';

/**
 * PUBLIC_INTERFACE
 * Dashboard
 * Purpose: Main application screen for uploads and results presentation.
 * GxP Critical: Yes (UI control points for audit/e-sign placeholders)
 * Parameters:
 *  - user: { id?: string, email?: string, role?: string }
 * Returns: JSX.Element
 * Throws: None
 * Audit: Placeholder events for upload and download actions; actual audit logging to be implemented in backend and real auth integration.
 */
export default function Dashboard({ user }) {
  // Upload file state (propagated into UploadPanel)
  const [files, setFiles] = useState({ zip: null, oldBrand: null, newBrand: null, guidelines: null, intendReplace: false });

  // Job info and preview selection
  const [job, setJob] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previews, setPreviews] = useState([]); // previews list cache
  const [notice, setNotice] = useState("");

  // Preview list meta
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [previewsError, setPreviewsError] = useState(null);

  // Polling hook state bound to job?.id
  const {
    status: jobStatus,
    isTerminal,
    violations,
    totalViolations,
    loading: pollLoading,
    error: pollError,
    page,
    pageSize,
    setPage,
    setPageSize,
    filter,
    setFilter,
    start: startPolling,
    stop: stopPolling,
    refreshNow,
  } = usePollingJobStatus(job?.id || null, { start: false, resultsPageSize: 10 });

  // Derived admin flag
  const canAdmin = user?.role === 'admin';

  const fetchPreviews = async (jid) => {
    if (!jid) return [];
    setPreviewsLoading(true);
    setPreviewsError(null);
    try {
      const list = await getJson(`/api/v1/jobs/${encodeURIComponent(jid)}/previews`, {
        retry: { attempts: 1, baseMs: 200, maxMs: 1200 }
      });
      const arr = Array.isArray(list?.previews) ? list.previews : (Array.isArray(list) ? list : []);
      setPreviews(arr);
      return arr;
    } catch (e) {
      setPreviewsError(e);
      return [];
    } finally {
      setPreviewsLoading(false);
    }
  };

  // Start handler from upload panel
  const onJobStarted = ({ jobId, status }) => {
    setJob({ id: jobId, status });
    setNotice(`Job started: ${jobId} • status: ${status}`);
    setPreview(null);
    setPreviews([]);
    // begin polling
    startPolling();
    // initial fetch of previews
    fetchPreviews(jobId);
  };

  // Keep job.status synced with hook status for UI text
  useEffect(() => {
    if (job?.id) {
      setJob((old) => ({ ...(old || {}), status: jobStatus || old?.status || 'pending' }));
    }
  }, [job?.id, jobStatus]);

  // Stop polling automatically if terminal
  useEffect(() => {
    if (isTerminal) {
      stopPolling();
    }
  }, [isTerminal, stopPolling]);

  // When job is running/completed, try to load previews once if empty
  useEffect(() => {
    (async () => {
      if (!job?.id) return;
      if ((jobStatus === 'running' || jobStatus === 'completed') && previews.length === 0 && !previewsLoading) {
        await fetchPreviews(job.id);
      }
    })();
  }, [job?.id, jobStatus, previews.length, previewsLoading]);

  // No-op: download is handled by DownloadBar with finalize + download flow

  const statusBadge = useMemo(() => {
    if (!job?.id) return null;
    const s = jobStatus || job.status || 'pending';
    const cls = s === 'failed' ? 'error' : s === 'completed' ? 'success' : 'important';
    return <div className={`badge ${cls}`}>Job {job.id} • {s}{pollLoading ? ' • updating…' : ''}</div>;
  }, [job, jobStatus, pollLoading]);

  return (
    <div className="col" style={{ gap: 18 }}>
      <UploadPanel value={files} onChange={setFiles} onStarted={onJobStarted} />

      {!!notice && (
        <div className="badge success" style={{ marginTop: -6 }}>
          {notice}
        </div>
      )}

      {statusBadge}
      {job?.id && (
        <>
          {previewsLoading && <div className="badge" style={{ marginTop: -6 }}>Loading previews…</div>}
          {!previewsLoading && previews?.length > 0 && (
            <div className="badge" style={{ marginTop: -6 }}>
              Previews available: {previews.length}
            </div>
          )}
          {!!previewsError && (
            <div className="badge error" style={{ marginTop: 8 }}>
              {formatApiError(previewsError)}
            </div>
          )}
        </>
      )}

      {!!pollError && (
        <div className="badge error" style={{ marginTop: 8 }}>
          {formatApiError(pollError)}
        </div>
      )}

      <div className="grid grid-3">
        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">Results & Flags</div>
          <div className="col" style={{ marginTop: 10 }}>
            {(!job?.id && violations.length === 0) && (
              <div className="badge">No results yet. Start a job to see flags.</div>
            )}

            {(job?.id) && (
              <ResultsTable
                violations={violations}
                total={totalViolations}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                filter={filter}
                onFilterChange={setFilter}
                onSelect={(v) => {
                  // Maintain selected violation and attempt to map to preview list
                  const match = previews.find(p => String(p.id) === String(v.id)) || null;
                  const base = match ? match : { id: v.id, url: '', note: v.issue };
                  // Surface old-brand flag/regions for PreviewPane to show contextual actions
                  const enriched = {
                    ...base,
                    detectedOldBrand: !!v.detectedOldBrand,
                    overlays: {
                      ...(base.overlays || {}),
                      boxes: [
                        ...((base.overlays && Array.isArray(base.overlays.boxes)) ? base.overlays.boxes : []),
                        ...(Array.isArray(v.detectedOldBrandRegions) ? v.detectedOldBrandRegions : []),
                      ],
                      detectedOldBrand: !!v.detectedOldBrand,
                    },
                  };
                  setPreview(enriched);
                }}
              />
            )}

            {canAdmin ? (
              <button className="btn secondary" style={{ marginTop: 12 }} onClick={() => refreshNow()}>
                Admin Bulk Action
              </button>
            ) : (
              <span className="badge" style={{ marginTop: 12 }}>Admin Bulk Action (role-gated)</span>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">Preview</div>
          <div className="col" style={{ marginTop: 10 }}>
            <PreviewPane
              jobId={job?.id || null}
              selected={preview}
              user={user}
              onPreviewsUpdated={(list) => {
                setPreviews(Array.isArray(list) ? list : []);
                // update selected preview reference if same id exists
                if (preview?.id) {
                  const found = (Array.isArray(list) ? list : []).find(p => String(p.id) === String(preview.id));
                  if (found) setPreview(found);
                }
              }}
              onApplied={() => {
                // notify success lightweight
                setNotice(`Fix applied to image ${preview?.id ?? ''}`);
              }}
              onError={(e) => {
                console.warn("PreviewPane error:", e);
              }}
            />
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">Finalize</div>
          <div className="col" style={{ marginTop: 10 }}>
            {job?.id ? (
              <DownloadBar
                jobId={job.id}
                status={jobStatus || job.status}
                user={user}
                onFinalized={() => {
                  // Surface a friendly notice on finalize
                  setNotice(`Finalized job ${job.id} for download.`);
                }}
                onError={(e) => {
                  console.warn("DownloadBar error:", e);
                }}
              />
            ) : (
              <span className="badge">Start a job to enable finalize & download.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
