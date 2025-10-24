/* React Router configuration and App layout wrapper */
//
// ============================================================================
// REQUIREMENT TRACEABILITY
// ============================================================================
// Requirement ID: REQ-FE-002
// User Story: As a user, I can navigate between login and dashboard pages within a consistent layout.
// Acceptance Criteria:
// - Routes: / (redirect to /dashboard if logged in else /login), /login, /dashboard
// - Top nav with brand and theme toggle
// - Role and auth placeholders
// GxP Impact: YES - includes placeholders for access control and audit/e-sign triggers
// Risk Level: LOW
// Validation Protocol: VP-FE-002
// ============================================================================

import React, { useMemo, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Dashboard from './screens/Dashboard';
import Login from './screens/Login';
import { applyTheme, getInitialTheme, setTheme } from './theme';
import { useAuth, AuthProvider } from './context/AuthContext';
import { AuditProvider } from './context/AuditContext';

// PUBLIC_INTERFACE
export function AppRouter() {
  const [themeMode, setThemeMode] = useState(getInitialTheme());
  const auth = useAuth();
  const location = useLocation();

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    setTheme(next);
  };

  const navRight = useMemo(() => {
    return (
      <div className="row" style={{ alignItems: 'center' }}>
        <button className="btn ghost" onClick={toggleTheme} aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}>
          {themeMode === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        {auth.isAuthenticated ? (
          <>
            <span className="badge important">Role: {auth.role}</span>
            <button className="btn secondary" onClick={auth.logout}>Logout</button>
          </>
        ) : (
          <Link to="/login" className="btn secondary">Login</Link>
        )}
      </div>
    );
  }, [themeMode, auth]);

  return (
    <div className="ocn-app">
      <nav className="ocn-nav">
        <div className="ocn-nav-inner">
          <Link to="/" className="brand" aria-label="Branding Compliance Home">
            <div className="brand-badge" />
            Branding Compliance
          </Link>
          <div className="row" style={{ gap: 10 }}>
            <Link to="/dashboard" className="btn ghost">Dashboard</Link>
            {auth.isAuthenticated && auth.role === 'admin' ? (
              <button className="btn ghost" aria-label="Admin Actions (role-gated)">Admin</button>
            ) : (
              <span className="badge">Admin (role-gated)</span>
            )}
            {navRight}
          </div>
        </div>
      </nav>

      <main className="ocn-main">
        <Routes>
          <Route path="/" element={<Navigate to={auth.isAuthenticated ? '/dashboard' : '/login'} replace />} />
          <Route path="/login" element={<Login onLogin={auth.login} redirectTo={location.state?.from ?? '/dashboard'} />} />
          <Route path="/dashboard" element={
            auth.isAuthenticated ? (
              <Dashboard user={auth.user} />
            ) : (
              <Navigate to="/login" state={{ from: '/dashboard' }} replace />
            )
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>© {new Date().getFullYear()} Branding Compliance</span>
          <span className="badge">Build: Ocean Professional</span>
        </div>
      </footer>
    </div>
  );
}

// PUBLIC_INTERFACE
export function RouterRoot() {
  return (
    <AuthProvider>
      <AuditProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuditProvider>
    </AuthProvider>
  );
}
