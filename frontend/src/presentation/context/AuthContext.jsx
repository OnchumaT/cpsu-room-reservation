import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../infrastructure/api/ApiClient.js';
import { container } from '../../shared/di/container.js';

const AuthContext = createContext(null);

/** Owns the logged-in session: user/role/canApprove, plus login/logout that
 * every other context/view reads through useAuth() instead of a shared
 * mutable AppState object. */
export function AuthProvider({ authClient, children }) {
  const [user, setUser] = useState(null);
  const [canApprove, setCanApprove] = useState(false);
  // Level-scoped variants — a department (head/vice-head) approver only
  // sees/acts on stage-1 (status:'pending') bookings; a faculty/dean
  // approver only sees/acts on stage-2 (status:'pending_faculty') ones.
  // `canApprove` above stays level-agnostic, for checks (nav visibility,
  // booking-facility eligibility) that don't care which stage.
  const [canApproveDepartment, setCanApproveDepartment] = useState(false);
  const [canApproveFaculty, setCanApproveFaculty] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  const applySession = useCallback(({ user, managementPositions }) => {
    setUser(user);
    setCanApprove(managementPositions.some((p) => p.canApprove));
    setCanApproveDepartment(managementPositions.some((p) => p.canApprove && p.level === 'department'));
    setCanApproveFaculty(managementPositions.some((p) => p.canApprove && p.level === 'faculty'));
    // Best-effort, not awaited: populates roomColors.js's registry as soon
    // as a session exists, so per-room colors are ready even if some
    // future routing change means Dashboard (which already refreshes
    // rooms itself) isn't the first thing rendered after login.
    container.repositories.roomRepository.refresh().catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const session = await authClient.fetchMe();
          applySession(session);
        } catch {
          authClient.logout();
        }
      }
      setIsBooting(false);
    })();
  }, [authClient, applySession]);

  const login = useCallback(async ({ email, password }) => {
    const session = await authClient.login({ email, password });
    applySession(session);
  }, [authClient, applySession]);

  const loginWithGoogle = useCallback(async ({ idToken }) => {
    const session = await authClient.loginWithGoogle({ idToken });
    applySession(session);
  }, [authClient, applySession]);

  const logout = useCallback(() => {
    authClient.logout();
    setUser(null);
    setCanApprove(false);
    setCanApproveDepartment(false);
    setCanApproveFaculty(false);
  }, [authClient]);

  const value = {
    user,
    role: user?.role ?? null,
    canApprove,
    canApproveDepartment,
    canApproveFaculty,
    isAuthenticated: Boolean(user),
    isBooting,
    login,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
