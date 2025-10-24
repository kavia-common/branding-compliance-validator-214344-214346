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

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAudit } from '../context/AuditContext';

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
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const redir = (location && location.state && location.state.from) ? location.state.from : (redirectTo || '/dashboard');
    if (!email || !email.includes('@')) {
      setErr('Please enter a valid email.');
      return;
    }
    // Basic credential presence check (mock)
    if ((password || '').length < 3) {
      setErr('Please enter a password (min 3 characters).');
      return;
    }
    const { user } = login({ email, role });
    try {
      enqueueAudit('LOGIN', { userId: user.id, context: { email, role } });
      // flush in background (non-blocking)
      setTimeout(() => {
        try { flush(); } catch {}
      }, 0);
    } catch {}
    // ignore prop onLogin; context controls session now
    nav(redir, { replace: true });
  };

  return (
    <div className="col" style={{ alignItems: 'center', marginTop: 40 }}>
      <div className="card" style={{ padding: 22, width: 420, maxWidth: '90%' }}>
        <div className="col" style={{ alignItems: 'center', gap: 6 }}>
          <div className="brand-badge" />
          <h2 style={{ margin: '10px 0 0 0' }}>Welcome back</h2>
          <p style={{ color: 'var(--ocn-muted)', margin: 0 }}>Sign in to continue</p>
        </div>
        <form className="col" style={{ marginTop: 16 }} onSubmit={submit}>
          <label className="section-title">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="section-title" style={{ marginTop: 8 }}>Password</label>
          <input
            className="input"
            type="password"
            value={password}
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <label className="section-title" style={{ marginTop: 8 }}>Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
          </select>
          {err && <div className="badge error" style={{ marginTop: 8 }}>{err}</div>}
          <button className="btn" type="submit" style={{ marginTop: 12 }}>Sign In</button>
        </form>
      </div>
    </div>
  );
}
