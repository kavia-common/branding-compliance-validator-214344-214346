import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * ============================================================================
 * REQUIREMENT TRACEABILITY
 * ============================================================================
 * Requirement ID: REQ-FE-020
 * User Story: As a user, I need authentication with role-based access control and e-sign capture placeholders.
 * Acceptance Criteria:
 * - Provide AuthContext exposing user, token, roles, login/logout methods
 * - Persist session to localStorage
 * - Provide e-sign capture stub function to bind signatures to actions
 * - Public hooks and provider with documentation
 * GxP Impact: YES - central attribution info for audit trails (ALCOA+)
 * Risk Level: MEDIUM
 * Validation Protocol: VP-FE-020
 * ============================================================================
 */

/**
 * Shape of the user object stored in context
 * {
 *   id: string,
 *   email?: string,
 *   role: 'viewer' | 'operator' | 'admin' | 'approver',
 *   roles?: string[],
 *   name?: string
 * }
 */

const AuthContext = createContext(null);

/**
 * PUBLIC_INTERFACE
 * useAuth
 * Purpose: Hook to consume authentication context (user, roles, token, login/logout, esign).
 * GxP Critical: Yes - used for user attribution in audit trails.
 * Parameters: none
 * Returns: { user, isAuthenticated, role, roles, token, login, logout, captureESign }
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * PUBLIC_INTERFACE
 * AuthProvider
 * Purpose: Provide auth state and actions to the application.
 * GxP Critical: Yes - exposes user attribution and e-sign capture stubs.
 * Parameters:
 *  - children: React.ReactNode
 * Returns: JSX.Element
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("auth_token") || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) localStorage.setItem("auth_user", JSON.stringify(user));
      else localStorage.removeItem("auth_user");
    } catch {
      // ignore storage errors
    }
  }, [user]);

  useEffect(() => {
    try {
      if (token) localStorage.setItem("auth_token", token);
      else localStorage.removeItem("auth_token");
    } catch {
      // ignore storage errors
    }
  }, [token]);

  const isDemoAuth = String(process?.env?.REACT_APP_DEMO_AUTH ?? "true").toLowerCase() !== "false";

  /**
   * PUBLIC_INTERFACE
   * login
   * Purpose: Mock login that issues a pseudo JWT and stores user with role.
   * Also supports a demo credential flow when REACT_APP_DEMO_AUTH=true:
   *  - username 'admin' with password 'password' logs in with roles ['admin','approver','operator','viewer'].
   *  - user.id will be 'admin' and X-User-ID header will carry 'admin' via api client reading localStorage.
   * GxP Critical: Yes - sets session identity used across requests.
   * Parameters:
   *  - creds:
   *      For demo: { username: string, password: string }
   *      For mock email: { email: string, role?: 'viewer'|'operator'|'admin'|'approver', name?: string }
   * Returns: { user, token }
   * Audit: Emits console audit placeholder; real audit via AuditContext elsewhere.
   */
  const login = useCallback((creds) => {
    // Demo path if enabled and username/password provided
    if (isDemoAuth && creds && typeof creds.username === "string") {
      const username = String(creds.username || "").trim();
      const password = String(creds.password || "");
      if (username.toLowerCase() === "admin" && password === "password") {
        const roles = ["admin", "approver", "operator", "viewer"];
        const u = {
          id: "admin", // important for X-User-ID header via api client
          email: "admin@example.com",
          role: "admin",
          roles,
          name: "Administrator",
        };
        // Mock JWT token payload with roles; not secure - for demo only
        const payload = btoa(
          JSON.stringify({
            sub: u.id,
            email: u.email,
            role: u.role,
            roles,
            iat: Math.floor(Date.now() / 1000),
          })
        );
        const tok = `mock.${payload}.token`;
        setUser(u);
        setToken(tok);
        try {
          console.debug("AUDIT_PLACEHOLDER", {
            action: "LOGIN",
            userId: u.id,
            userEmail: u.email,
            role: u.role,
            roles,
            timestamp: new Date().toISOString(),
          });
        } catch {}
        return { user: u, token: tok };
      }
      // Non-matching demo credentials fall through to a generic error for the caller
      throw { name: "AuthError", message: "Invalid username or password." };
    }

    // Default mock email-based flow (pre-existing behavior)
    const u = {
      id: `u-${Date.now()}`,
      email: creds.email,
      role: creds.role || "viewer",
      roles: [creds.role || "viewer"],
      name: creds.name || creds.email?.split("@")?.[0] || "User",
    };
    // Mock JWT token payload with role; not secure - for demo only
    const payload = btoa(
      JSON.stringify({ sub: u.id, email: u.email, role: u.role, roles: u.roles, iat: Math.floor(Date.now() / 1000) })
    );
    const tok = `mock.${payload}.token`;
    setUser(u);
    setToken(tok);
    try {
      console.debug("AUDIT_PLACEHOLDER", {
        action: "LOGIN",
        userId: u.id,
        userEmail: u.email,
        role: u.role,
        roles: u.roles,
        timestamp: new Date().toISOString(),
      });
    } catch {}
    return { user: u, token: tok };
  }, [isDemoAuth]);

  /**
   * PUBLIC_INTERFACE
   * logout
   * Purpose: Clear current session.
   * GxP Critical: Yes - terminates attribution and updates audit trail.
   * Parameters: none
   * Returns: void
   */
  const logout = useCallback(() => {
    const prev = user;
    setUser(null);
    setToken(null);
    try {
      console.debug("AUDIT_PLACEHOLDER", {
        action: "LOGOUT",
        userId: prev?.id,
        userEmail: prev?.email,
        role: prev?.role,
        roles: prev?.roles,
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }, [user]);

  /**
   * PUBLIC_INTERFACE
   * captureESign
   * Purpose: Stub to capture e-signature for critical operations and return a signatureId.
   * GxP Critical: Yes - supports electronic signature binding (placeholder).
   * Parameters:
   *  - meta?: Record<string, any>  Context around what is being signed
   * Returns: Promise<{ signatureId: string }>
   */
  const captureESign = useCallback(
    async (meta) => {
      // Placeholder: in a real system, this would prompt user and verify credentials again
      const signatureId = `esign-${Date.now()}`;
      try {
        console.debug("AUDIT_PLACEHOLDER", {
          action: "ESIGN_CAPTURE",
          userId: user?.id,
          context: meta || {},
          signatureId,
          timestamp: new Date().toISOString(),
        });
      } catch {}
      return { signatureId };
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!user,
      role: user?.role || "viewer",
      roles: user?.roles || (user?.role ? [user.role] : []),
      login,
      logout,
      captureESign,
    }),
    [user, token, login, logout, captureESign]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
