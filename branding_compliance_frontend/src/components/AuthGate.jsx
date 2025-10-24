import React from "react";
import { useAuth } from "../context/AuthContext";

/**
 * ============================================================================
 * REQUIREMENT TRACEABILITY
 * ============================================================================
 * Requirement ID: REQ-FE-022
 * User Story: As an application, I need a reusable role-based gate to protect UI actions.
 * Acceptance Criteria:
 * - Accept allowed roles; render children if user has any
 * - Otherwise show fallback (or null)
 * GxP Impact: YES - Enforces role-based access controls
 * Risk Level: LOW
 * Validation Protocol: VP-FE-022
 * ============================================================================
 */

/**
 * PUBLIC_INTERFACE
 * AuthGate
 * Purpose: Role-based UI gate to control access to children content.
 * GxP Critical: Yes
 * Parameters:
 *  - roles: Array<'viewer'|'operator'|'admin'>
 *  - fallback?: React.ReactNode
 *  - children: React.ReactNode
 * Returns: JSX.Element|null
 */
export default function AuthGate({ roles = [], fallback = null, children }) {
  const { isAuthenticated, role } = useAuth();
  const allowed = isAuthenticated && (roles.length === 0 || roles.includes(role));
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
