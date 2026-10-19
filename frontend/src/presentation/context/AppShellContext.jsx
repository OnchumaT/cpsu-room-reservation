import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { container } from '../../shared/di/container.js';
import { useAuth } from './AuthContext.jsx';
import { startLiveEvents, LIVE_EVENT } from '../../infrastructure/api/LiveEvents.js';

const AppShellContext = createContext(null);

/** Cross-view UI/session-scoped state that doesn't belong to any single
 * view: current page, sidebar collapse, department approval mode, the
 * two one-shot handoffs between views (template-to-apply, booking snapshot
 * for "save as template"), and the bell badge's unread count — lives here
 * (rather than a page-local hook) specifically so NotificationsView can
 * push a refresh into it after marking things read, and Topbar (which
 * outlives any single page) sees the update immediately instead of only
 * on next login. */
export function AppShellProvider({ children }) {
  const { isAuthenticated, canApprove, role } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [approvalMode, setApprovalMode] = useState('manual');
  const [lastBookingSnapshot, setLastBookingSnapshot] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  // Badge on the sidebar's "คำขอสิ่งอำนวยความสะดวก" item — only Staff/admin
  // can even load this list (the API 403s anyone else), so it's pointless
  // to poll for other roles.
  const [facilityPendingCount, setFacilityPendingCount] = useState(0);
  // consume-once handoff: a ref, not state — nothing renders this value
  // directly, it's only ever read once on the booking form's mount.
  const templateToApplyRef = useRef(null);
  const bookingDateToApplyRef = useRef(null);
  const approvalFocusRef = useRef(null);
  const facilityFocusRef = useRef(null);

  const navigate = useCallback((nextPage) => setPage(nextPage), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), []);

  const setTemplateToApply = useCallback((tpl) => { templateToApplyRef.current = tpl; }, []);
  const takeTemplateToApply = useCallback(() => {
    const tpl = templateToApplyRef.current;
    templateToApplyRef.current = null;
    return tpl;
  }, []);
  const setBookingDateToApply = useCallback((date) => { bookingDateToApplyRef.current = date; }, []);
  const takeBookingDateToApply = useCallback(() => {
    const date = bookingDateToApplyRef.current;
    bookingDateToApplyRef.current = null;
    return date;
  }, []);
  const setApprovalFocus = useCallback((bookingId) => { approvalFocusRef.current = bookingId; }, []);
  const takeApprovalFocus = useCallback(() => {
    const bookingId = approvalFocusRef.current;
    approvalFocusRef.current = null;
    return bookingId;
  }, []);
  // Same hand-off for staff opening a facility-request notification: the queue
  // highlights and opens the request belonging to that booking.
  const setFacilityFocus = useCallback((bookingId) => { facilityFocusRef.current = bookingId; }, []);
  const takeFacilityFocus = useCallback(() => {
    const bookingId = facilityFocusRef.current;
    facilityFocusRef.current = null;
    return bookingId;
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) { setUnreadCount(0); return; }
    try {
      const { notificationRepository } = container.repositories;
      const tasks = [notificationRepository.refresh()];
      if (canApprove) tasks.push(notificationRepository.refreshApproverInbox());
      await Promise.all(tasks);
      const count = [...notificationRepository.getAll(), ...notificationRepository.getApproverInbox()].filter((n) => n.unr).length;
      setUnreadCount(count);
    } catch {
      // best-effort only — a failed badge refresh shouldn't break the app
    }
  }, [isAuthenticated, canApprove]);

  useEffect(() => { refreshUnreadCount(); }, [refreshUnreadCount]);

  // Fallback only — real-time updates arrive through the live-events stream below.
  // A slow poll still catches anything missed while the stream was reconnecting.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const id = setInterval(() => { if (!document.hidden) refreshUnreadCount(); }, 60000);
    return () => clearInterval(id);
  }, [isAuthenticated, refreshUnreadCount]);

  const refreshFacilityPendingCount = useCallback(async () => {
    if (!isAuthenticated || !['staff', 'admin'].includes(role)) { setFacilityPendingCount(0); return; }
    try {
      // Hits the API directly rather than facilityRequestRepository.refresh()
      // — that repository's cache is shared with FacilityQueueView (which
      // keeps ALL statuses cached for its tabs), so refreshing it here with
      // a status filter would silently truncate that view's list out from
      // under it whenever this poll and that page are both live.
      const { facilityRequests } = await container.apiClient.get('/facility-requests', { status: 'pending' });
      setFacilityPendingCount(facilityRequests.length);
    } catch {
      // best-effort only — a failed badge refresh shouldn't break the app
    }
  }, [isAuthenticated, role]);

  useEffect(() => { refreshFacilityPendingCount(); }, [refreshFacilityPendingCount]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const id = setInterval(() => { if (!document.hidden) refreshFacilityPendingCount(); }, 60000);
    return () => clearInterval(id);
  }, [isAuthenticated, refreshFacilityPendingCount]);

  // AppShellProvider outlives login/logout (it wraps AuthGate in App.jsx,
  // not the other way around), so `page` would otherwise still be whatever
  // view was open before a logout — always land back on the dashboard
  // whenever a session becomes authenticated (fresh login or boot-restore).
  useEffect(() => { if (isAuthenticated) setPage('dashboard'); }, [isAuthenticated]);

  // Real time: one stream per open tab. Each `changed` event (debounced, since one
  // action can write several things) refreshes the badges and tells every page
  // on screen to re-fetch (useRepository listens for LIVE_EVENT).
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let timer = null;
    const stop = startLiveEvents({
      getToken: () => container.apiClient.getToken(),
      onChange: () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          refreshUnreadCount();
          refreshFacilityPendingCount();
          window.dispatchEvent(new Event(LIVE_EVENT));
        }, 300);
      },
    });
    return () => { clearTimeout(timer); stop(); };
  }, [isAuthenticated, refreshUnreadCount, refreshFacilityPendingCount]);

  const value = {
    page,
    navigate,
    sidebarCollapsed,
    toggleSidebar,
    approvalMode,
    setApprovalMode,
    lastBookingSnapshot,
    setLastBookingSnapshot,
    setTemplateToApply,
    takeTemplateToApply,
    setBookingDateToApply,
    takeBookingDateToApply,
    setApprovalFocus,
    takeApprovalFocus,
    setFacilityFocus,
    takeFacilityFocus,
    unreadCount,
    refreshUnreadCount,
    facilityPendingCount,
    refreshFacilityPendingCount,
  };

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell must be used within AppShellProvider');
  return ctx;
}
