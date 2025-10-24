//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-001
// User Story: As a user, I want a modern, themed UI with routing so I can navigate between login and dashboard.
// Acceptance Criteria:
// - Ocean Professional theme variables applied globally
// - React Router configured with routes: /login and /dashboard
// - Theme toggling supported (light/dark), respecting CSS variables
// - Placeholders for audit/e-sign and role-gated actions
// GxP Impact: YES - UI includes placeholders for audit trails and e-sign prompts
// Risk Level: LOW
// Validation Protocol: VP-FE-001
// ============================================================================
//
// ============================================================================
// IMPORTS AND DEPENDENCIES
// ============================================================================
// None - utility and constants module
// ============================================================================

// PUBLIC_INTERFACE
export const OceanProfessionalPalette = {
  primary: '#3b82f6',   // blue-500
  secondary: '#64748b', // slate-500
  success: '#06b6d4',   // cyan-500
  error: '#EF4444',     // red-500
  background: '#f9fafb',// gray-50
  surface: '#ffffff',   // white
  text: '#111827',      // gray-900
  amber: '#f59e0b',     // amber-500 (for accents)
};

/**
 * PUBLIC_INTERFACE
 * applyTheme
 * Purpose: Applies CSS variables for the Ocean Professional theme to the document root.
 * GxP Critical: No (UI styling helper)
 * Parameters:
 *  - mode: 'light' | 'dark'
 * Returns: void
 * Throws: None
 * Audit: Not applicable for UI theming
 */
export function applyTheme(mode = 'light') {
  const root = document.documentElement;
  const isDark = mode === 'dark';

  // Base palette mapping to CSS variables
  const map = {
    '--ocn-bg': isDark ? '#0f172a' : OceanProfessionalPalette.background, // darker for dark mode
    '--ocn-surface': isDark ? '#111827' : OceanProfessionalPalette.surface,
    '--ocn-text': isDark ? '#f9fafb' : OceanProfessionalPalette.text,
    '--ocn-primary': OceanProfessionalPalette.primary,
    '--ocn-secondary': OceanProfessionalPalette.secondary,
    '--ocn-success': OceanProfessionalPalette.success,
    '--ocn-error': OceanProfessionalPalette.error,
    '--ocn-amber': OceanProfessionalPalette.amber,
    '--ocn-border': isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,24,39,0.08)',
    '--ocn-muted': isDark ? 'rgba(249,250,251,0.6)' : 'rgba(17,24,39,0.6)',
    '--ocn-shadow': isDark ? 'rgba(0,0,0,0.5)' : 'rgba(2,6,23,0.06)',
    '--ocn-grad-start': 'rgba(59,130,246,0.10)', // blue-500/10
    '--ocn-grad-end': isDark ? 'rgba(2,6,23,0.6)' : '#f9fafb',
  };

  Object.entries(map).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', mode);
}

/**
 * PUBLIC_INTERFACE
 * getInitialTheme
 * Purpose: Determine initial theme from localStorage or system preference.
 * GxP Critical: No
 * Parameters: none
 * Returns: 'light' | 'dark'
 * Throws: None
 * Audit: Not applicable
 */
export function getInitialTheme() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
  if (stored === 'light' || stored === 'dark') return stored;
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * PUBLIC_INTERFACE
 * setTheme
 * Purpose: Persist and apply theme
 * GxP Critical: No
 * Parameters: mode: 'light' | 'dark'
 * Returns: void
 */
export function setTheme(mode) {
  localStorage.setItem('theme', mode);
  applyTheme(mode);
}
