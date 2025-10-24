//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-009
// User Story: As a developer, I want centralized validation for upload inputs.
// Acceptance Criteria:
// - Functions to check file types and size limits
// - Export validateUploadPayload to cross-check all fields with descriptive messages
// GxP Impact: YES - Prevents invalid data submission, enforcing data integrity
// Risk Level: LOW
// Validation Protocol: VP-FE-009
// ============================================================================

/**
 * Max sizes (bytes). Keep conservative defaults; can be adjusted via env if needed later.
 *  - Zip: 200MB
 *  - Branding PNG: 10MB
 *  - Guidelines: 10MB
 */
const LIMITS = {
  zip: 200 * 1024 * 1024,
  branding: 10 * 1024 * 1024,
  guidelines: 10 * 1024 * 1024,
};

const TYPE_MATCHERS = {
  zip: (f) => {
    const nameOk = /\.zip$/i.test(f.name || "");
    const mimeOk =
      f.type === "application/zip" ||
      f.type === "application/x-zip-compressed" ||
      f.type === "multipart/x-zip";
    return nameOk || mimeOk;
  },
  branding: (f) => f.type === "image/png" || /\.png$/i.test(f.name || ""),
  guidelines: (f) =>
    f.type === "application/pdf" ||
    f.type === "text/plain" ||
    /\.pdf$/i.test(f.name || "") ||
    /\.txt$/i.test(f.name || ""),
};

/**
 * PUBLIC_INTERFACE
 * validateFileType
 * Purpose: Check if a File matches expected type by extension and/or MIME type.
 * Parameters:
 *  - kind: 'zip' | 'branding' | 'guidelines'
 *  - file: File
 * Returns: { ok: boolean, message?: string }
 */
export function validateFileType(kind, file) {
  if (!file) return { ok: false, message: `File (${kind}) missing.` };
  const matcher = TYPE_MATCHERS[kind];
  if (!matcher) return { ok: false, message: `Unsupported kind: ${kind}` };
  const ok = matcher(file);
  return ok ? { ok: true } : { ok: false, message: `Invalid ${kind} file type.` };
}

/**
 * PUBLIC_INTERFACE
 * validateFileSize
 * Purpose: Check file size against configured limit.
 * Parameters:
 *  - kind: 'zip' | 'branding' | 'guidelines'
 *  - file: File
 * Returns: { ok: boolean, message?: string }
 */
export function validateFileSize(kind, file) {
  if (!file) return { ok: false, message: `File (${kind}) missing.` };
  const max = LIMITS[kind] ?? (10 * 1024 * 1024);
  if (typeof file.size !== "number") return { ok: true };
  if (file.size > max) return { ok: false, message: `${kind} exceeds size limit (${Math.round(max / (1024 * 1024))}MB).` };
  return { ok: true };
}

/**
 * PUBLIC_INTERFACE
 * validateUploadPayload
 * Purpose: Cross-field validation for the upload payload.
 * GxP Critical: Yes - ensures presence and conformance of all required files
 * Parameters:
 *  - payload: { zip: File|null, branding: File|null, guidelines: File|null }
 * Returns: { ok: boolean, message?: string }
 */
export function validateUploadPayload(payload) {
  if (!payload?.zip || !payload?.branding || !payload?.guidelines) {
    return { ok: false, message: "All files are required: zip, branding PNG, guidelines." };
  }

  // Type checks
  const tZip = validateFileType("zip", payload.zip); if (!tZip.ok) return tZip;
  const tBrand = validateFileType("branding", payload.branding); if (!tBrand.ok) return tBrand;
  const tGuide = validateFileType("guidelines", payload.guidelines); if (!tGuide.ok) return tGuide;

  // Size checks
  const sZip = validateFileSize("zip", payload.zip); if (!sZip.ok) return sZip;
  const sBrand = validateFileSize("branding", payload.branding); if (!sBrand.ok) return sBrand;
  const sGuide = validateFileSize("guidelines", payload.guidelines); if (!sGuide.ok) return sGuide;

  // Cross-field rules (example: guidelines must not be the same file as branding; name-based)
  if (payload.branding?.name && payload.guidelines?.name && payload.branding.name === payload.guidelines.name) {
    return { ok: false, message: "Branding and guidelines must be different files." };
  }

  return { ok: true };
}

export default {
  validateFileType,
  validateFileSize,
  validateUploadPayload,
};
