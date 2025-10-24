 /* Login Screen - Ocean Professional style */
//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-004
// User Story: As a user, I can sign in to access the dashboard.
// Acceptance Criteria:
// - Email and Role selection
// - Simple mock login handler
// - Redirect after login
// - Audit placeholder for login attempts
// GxP Impact: YES - audit placeholder for authentication
// Risk Level: LOW
// Validation Protocol: VP-FE-004
// ============================================================================

import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAudit } from '../context/AuditContext';
import { getBoolEnv } from '../utils/env';

/**
 * PUBLIC_INTERFACE
 * Login
 * Purpose: Simple login form to bootstrap navigation and demonstrate role-gating
 * GxP Critical: Yes (auth audit placeholder)
 * Parameters:
 *  - onLogin: function(user) - callback to set user session
 *  - redirectTo: string - path to navigate after login
 * Returns: JSX.Element
 */
export default function Login({ onLogin, redirectTo = '/dashboard' }) {
  const nav = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { enqueueAudit, flush } = useAudit();

  // Read demo flag via safe helper; default to true
  const isDemoAuth = useMemo(() => getBoolEnv('REACT_APP_DEMO_AUTH', true), []);

  // Fields for email/role mock flow
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');

  // Fields for demo username/password flow
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const redir = (location && location.state && location.state.from) ? location.state.from : (redirectTo || '/dashboard');

    try {
      let userObj = null;

      if (isDemoAuth) {
        // Demo mode: require username/password
        if (!username) {
          setErr('Please enter username.');
          return;
        }
        if ((password || '').length < 3) {
          setErr('Please enter a password (min 3 characters).');
          return;
        }
        const { user } = login({ username, password });
        userObj = user;
        enqueueAudit('LOGIN', { userId: user.id, context: { username, demo: true } });
      } else {
        // Non-demo: email + role selection (existing behavior)
        if (!email || !email.includes('@')) {
          setErr('Please enter a valid email.');
          return;
        }
        if ((password || '').length < 3) {
          setErr('Please enter a password (min 3 characters).');
          return;
        }
        const { user } = login({ email, role });
        userObj = user;
        enqueueAudit('LOGIN', { userId: user.id, context: { email, role, demo: false } });
      }

      // flush in background (non-blocking)
      setTimeout(() => {
        try { flush(); } catch {}
      }, 0);

      nav(redir, { replace: true });
    } catch (ex) {
      const msg = ex?.message || 'Login failed.';
      setErr(msg);
    }
  };

  return (
    <div className="col" style={{ alignItems: 'center', marginTop: 40 }}>
      <div className="card" style={{ padding: 22, width: 420, maxWidth: '90%' }}>
        <div className="col" style={{ alignItems: 'center', gap: 6 }}>
          <div className="brand-badge" />
          <h2 style={{ margin: '10px 0 0 0' }}>Welcome back</h2>
          <p style={{ color: 'var(--ocn-muted)', margin: 0 }}>Sign in to continue</p>
          {isDemoAuth && (
            <small className="badge" style={{ marginTop: 6 }}>
              Demo login: admin / password
            </small>
          )}
        </div>
        <form className="col" style={{ marginTop: 16 }} onSubmit={submit}>
          {isDemoAuth ? (
            <>
              <label className="section-title">Username</label>
              <input
                className="input"
                type="text"
                value={username}
                placeholder="admin"
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </>
          ) : (
            <>
              <label className="section-title">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </>
          )}

          <label className="section-title" style={{ marginTop: 8 }}>Password</label>
          <input
            className="input"
            type="password"
            value={password}
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {!isDemoAuth && (
            <>
              <label className="section-title" style={{ marginTop: 8 }}>Role</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="viewer">Viewer</option>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </>
          )}

          {err && <div className="badge error" style={{ marginTop: 8 }}>{err}</div>}
          <button className="btn" type="submit" style={{ marginTop: 12 }}>Sign In</button>
        </form>
      </div>
    </div>
  );
}
