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
  const [isBooting, setIsBooting] = useState(true);

  const applySession = useCallback(({ user, managementPositions }) => {
    setUser(user);
    // Only department-level positions (head/vice-head) approve in this system —
    // the Dean (faculty level) never logs in to approve; staff just print the
    // memo for them. So a faculty position doesn't count here.
    setCanApprove(managementPositions.some((p) => p.canApprove && p.level === 'department'));
    // Best-effort, not awaited: populates roomColors.js's registry as soon
    // as a session exists, so per-room colors are ready even if some
    // future routing change means Dashboard (which already refreshes
    // rooms itself) isn't the first thing rendered after login.
    container.repositories.roomRepository.refresh().catch(() => {});
    // Same idea for equipment names, which booking details/receipts read
    // synchronously from the cache.
    container.repositories.equipmentRepository.refresh().catch(() => {});
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
  }, [authClient]);

  const value = {
    user,
    role: user?.role ?? null,
    canApprove,
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
