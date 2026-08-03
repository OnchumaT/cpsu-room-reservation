// main.js — the composition root. This is the ONLY file that constructs
// concrete objects, wires them together, and kicks the app off; every
// other file only ever depends on abstractions (ports) or receives its
// dependencies injected here. Nothing else in the codebase does this.

import { createContainer } from './shared/di/container.js';

import { closeModal } from './presentation/components/Modal.js';
import { createSidebar } from './presentation/components/Sidebar.js';
import { createTopbar } from './presentation/components/Topbar.js';
import { createBookingDetailModal } from './presentation/components/BookingDetailModal.js';
import { createCalendar } from './presentation/components/Calendar.js';

import { Router } from './presentation/router/Router.js';

import { createLoginView } from './presentation/views/LoginView.js';
import { createDashboardView } from './presentation/views/DashboardView.js';
import { createRoomsView } from './presentation/views/RoomsView.js';
import { createBookingView } from './presentation/views/BookingView.js';
import { createTemplatesView } from './presentation/views/TemplatesView.js';
import { createHistoryView } from './presentation/views/HistoryView.js';
import { createApprovalsView } from './presentation/views/ApprovalsView.js';
import { createApprovalSettingsView } from './presentation/views/ApprovalSettingsView.js';
import { createFacilityQueueView } from './presentation/views/FacilityQueueView.js';
import { createNotificationsView } from './presentation/views/NotificationsView.js';
import { createProfileView } from './presentation/views/ProfileView.js';
import { createUsersView } from './presentation/views/UsersView.js';
import { createAnalyticsView } from './presentation/views/AnalyticsView.js';
import { createReportsView } from './presentation/views/ReportsView.js';
import { createSettingsView } from './presentation/views/SettingsView.js';
import { createManageRoomsView } from './presentation/views/ManageRoomsView.js';

import { showToast } from './presentation/components/Toast.js';

const { appState, apiClient, authClient, repositories, useCases } = createContainer();

// ── shared UI shell ──────────────────────────────────────────────────
const sidebar = createSidebar({ appState });
const topbar = createTopbar({ appState, onLogout: handleLogout });
const bookingDetailModal = createBookingDetailModal({ bookingRepository: repositories.bookingRepository, appState });
const calendar = createCalendar({ bookingRepository: repositories.bookingRepository, appState, bookingDetailModal });

const loginView = createLoginView({ authClient, onLoginSuccess: handleLoginSuccess });

function onAfterRender(page) {
  sidebar.render();
  if (page === 'dashboard') {
    setTimeout(() => { calendar.renderGrid(); calendar.renderDayDetail(); }, 10);
  }
  if (page === 'book') {
    setTimeout(() => { bookingView.checkRoomAvail(); bookingView.syncFormVisuals(); }, 10);
  }
}
// Router is constructed against a `views` object it will read from at
// navigate-time — populated below once every view (including Templates,
// which itself depends on the Router) has been built.
const views = {};
const router = new Router({ appState, views, onAfterRender });

const dashboardView = createDashboardView({
  appState,
  bookingRepository: repositories.bookingRepository,
  templateRepository: repositories.templateRepository,
  dashboardRepository: repositories.dashboardRepository,
});
const roomsView = createRoomsView({
  appState,
  roomRepository: repositories.roomRepository,
  searchRoomsUseCase: useCases.searchRoomsUseCase,
});
const bookingView = createBookingView({
  appState,
  roomRepository: repositories.roomRepository,
  createBookingUseCase: useCases.createBookingUseCase,
  checkRoomAvailabilityUseCase: useCases.checkRoomAvailabilityUseCase,
});
const templatesView = createTemplatesView({
  appState,
  roomRepository: repositories.roomRepository,
  templateRepository: repositories.templateRepository,
  saveTemplateUseCase: useCases.saveTemplateUseCase,
  applyTemplateUseCase: useCases.applyTemplateUseCase,
  updateTemplateUseCase: useCases.updateTemplateUseCase,
  duplicateTemplateUseCase: useCases.duplicateTemplateUseCase,
  deleteTemplateUseCase: useCases.deleteTemplateUseCase,
  router,
});
const historyView = createHistoryView({
  appState,
  bookingRepository: repositories.bookingRepository,
  bookingDetailModal,
  editBookingUseCase: useCases.editBookingUseCase,
  cancelBookingUseCase: useCases.cancelBookingUseCase,
  approveRejectBookingUseCase: useCases.approveRejectBookingUseCase,
  router,
});
const approvalsView = createApprovalsView({
  bookingRepository: repositories.bookingRepository,
  approveRejectBookingUseCase: useCases.approveRejectBookingUseCase,
  router,
});
const approvalSettingsView = createApprovalSettingsView({
  appState,
  setApprovalModeUseCase: useCases.setApprovalModeUseCase,
  settingsRepository: repositories.settingsRepository,
  router,
});
const facilityQueueView = createFacilityQueueView({
  facilityRequestRepository: repositories.facilityRequestRepository,
  updateFacilityRequestStatusUseCase: useCases.updateFacilityRequestStatusUseCase,
  router,
});
const notificationsView = createNotificationsView({
  appState,
  notificationRepository: repositories.notificationRepository,
  updateNotificationUseCase: useCases.updateNotificationUseCase,
  approveRejectBookingUseCase: useCases.approveRejectBookingUseCase,
  bookingDetailModal,
  router,
});
const profileView = createProfileView({ appState });
const usersView = createUsersView({
  userRepository: repositories.userRepository,
  createUserUseCase: useCases.createUserUseCase,
  updateUserUseCase: useCases.updateUserUseCase,
  toggleUserStatusUseCase: useCases.toggleUserStatusUseCase,
  router,
});
const analyticsView = createAnalyticsView({ analyticsRepository: repositories.analyticsRepository });
const reportsView = createReportsView();
const settingsView = createSettingsView();
const manageRoomsView = createManageRoomsView({
  roomRepository: repositories.roomRepository,
  createRoomUseCase: useCases.createRoomUseCase,
  updateRoomUseCase: useCases.updateRoomUseCase,
  toggleRoomStatusUseCase: useCases.toggleRoomStatusUseCase,
  deleteRoomUseCase: useCases.deleteRoomUseCase,
  router,
});

views.dashboard = dashboardView;
views.rooms = roomsView;
views.book = bookingView;
views.templates = templatesView;
views.history = historyView;
views.reservations = historyView;
views.allbookings = historyView;
views.approvals = approvalsView;
views.approvalsettings = approvalSettingsView;
views.facilityqueue = facilityQueueView;
views.notifications = notificationsView;
views.profile = profileView;
views.users = usersView;
views.analytics = analyticsView;
views.reports = reportsView;
views.settings = settingsView;
views.managerooms = manageRoomsView;

// ── the single global surface every inline onclick="" in the rendered
// HTML calls into (see the migration plan: rewriting hundreds of
// call sites to addEventListener-based delegation was out of scope for
// this pass, so `App` is the one deliberate, namespaced exception to
// "no globals") ──────────────────────────────────────────────────────
window.App = {
  navigate: (page) => router.navigate(page),
  closeModal,
  toggleSidebar: () => sidebar.toggleCollapsed(),
  showAccountMenu: () => topbar.showAccountMenu(),
  login: () => loginView.login(),
  loginWithGoogle: () => loginView.loginWithGoogle(),
  logout: () => topbar.logout(),

  selectDay: (dateStr) => calendar.selectDay(dateStr),
  prevMonth: () => calendar.goToPrevMonth(),
  nextMonth: () => calendar.goToNextMonth(),
  goToday: () => calendar.goToToday(),
  showBookingDetail: (bookingId) => calendar.showBookingDetail(bookingId),
  printRoomNotice: (bookingId) => bookingDetailModal.printRoomNotice(bookingId),
  printBookingReceipt: (bookingId) => bookingDetailModal.printBookingReceipt(bookingId),

  filterRooms: (query) => roomsView.filterByQuery(query),
  filterRoomsByStatus: (status, btn) => roomsView.filterByStatus(status, btn),
  showRoomDetail: (roomId) => roomsView.showRoomDetail(roomId),

  changeBookingEquipmentQty: (key, delta) => bookingView.changeBookingEquipmentQty(key, delta),
  addBookingFood: () => bookingView.addBookingFood(),
  removeBookingFood: (index) => bookingView.removeBookingFood(index),
  onPurposeChange: (value) => bookingView.onPurposeChange(value),
  checkRoomAvail: () => bookingView.checkRoomAvail(),
  refreshRoomOptions: () => bookingView.refreshRoomOptions(),
  submitBooking: () => bookingView.submitBooking(),

  bookFromTemplate: (templateId) => templatesView.bookFromTemplate(templateId),
  duplicateTemplate: (templateId) => templatesView.duplicateTemplate(templateId),
  deleteTemplate: (templateId) => templatesView.deleteTemplate(templateId),
  promptSaveTemplate: () => templatesView.promptSaveTemplate(),
  saveTemplateFromSnapshot: () => templatesView.saveTemplateFromSnapshot(),
  showRenameTemplate: (templateId) => templatesView.showRenameTemplate(templateId),
  saveRenameTemplate: (templateId) => templatesView.saveRenameTemplate(templateId),
  showEditTemplate: (templateId) => templatesView.showEditTemplate(templateId),
  changeTemplateEquipmentQty: (key, delta) => templatesView.changeTemplateEquipmentQty(key, delta),
  addTemplateFood: () => templatesView.addTemplateFood(),
  removeTemplateFood: (index) => templatesView.removeTemplateFood(index),
  saveTemplateEdit: (templateId) => templatesView.saveTemplateEdit(templateId),

  toast: (message, type) => showToast(message, type),

  setHistoryFilter: (status, btn) => historyView.setFilter(status, btn),
  editHistoryBooking: (bookingId) => historyView.editBooking(bookingId),
  changeHistoryEditQty: (key, delta) => historyView.changeEditQty(key, delta),
  addHistoryEditFood: () => historyView.addEditFood(),
  removeHistoryEditFood: (index) => historyView.removeEditFood(index),
  saveHistoryEdit: (bookingId) => historyView.saveEdit(bookingId),
  cancelHistoryBooking: (bookingId) => historyView.cancelBooking(bookingId),
  approveHistoryBooking: (bookingId) => historyView.approveBooking(bookingId),
  rejectHistoryBooking: (bookingId) => historyView.rejectBooking(bookingId),

  approvePendingBooking: (bookingId) => approvalsView.approve(bookingId),
  rejectPendingBooking: (bookingId) => approvalsView.reject(bookingId),

  setApprovalMode: (mode) => approvalSettingsView.setMode(mode),

  showFacilityDetail: (requestId) => facilityQueueView.showDetail(requestId),
  acceptFacilityRequest: (requestId) => facilityQueueView.accept(requestId),
  completeFacilityRequest: (requestId) => facilityQueueView.complete(requestId),

  applyNotificationAction: (notificationId, action) => notificationsView.applyAction(notificationId, action),

  saveProfile: () => profileView.save(),

  showAddUser: () => usersView.showAddModal(),
  addUser: () => usersView.add(),
  showEditUser: (userId) => usersView.showEditModal(userId),
  saveUser: (userId) => usersView.save(userId),
  toggleUserStatus: (userId) => usersView.toggleStatus(userId),

  saveSettings: () => settingsView.save(),

  showAddRoom: () => manageRoomsView.showAddModal(),
  addRoom: () => manageRoomsView.add(),
  showEditRoom: (roomId) => manageRoomsView.showEditModal(roomId),
  saveRoom: (roomId) => manageRoomsView.save(roomId),
  toggleRoomStatus: (roomId) => manageRoomsView.toggleStatus(roomId),
  deleteRoom: (roomId) => manageRoomsView.remove(roomId),
};

// ── auth gate ────────────────────────────────────────────────────────

function showLoginScreen() {
  document.getElementById('appShell').style.display = 'none';
  const el = document.getElementById('loginScreen');
  el.style.display = 'block';
  el.innerHTML = loginView.render();
}

async function showAppShell() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('loginScreen').innerHTML = '';
  document.getElementById('appShell').style.display = 'flex';
  sidebar.render();
  topbar.render();
  await router.navigate('dashboard');
  refreshNotificationBadge();
}

async function handleLoginSuccess({ user, managementPositions }) {
  appState.setSession({ user, canApprove: managementPositions.some((p) => p.canApprove) });
  await showAppShell();
}

function handleLogout() {
  authClient.logout();
  appState.clearSession();
  showLoginScreen();
}

/** Best-effort: populate the bell badge once after login/boot (not live-updating). */
async function refreshNotificationBadge() {
  try {
    const tasks = [repositories.notificationRepository.refresh()];
    if (appState.canApprove) tasks.push(repositories.notificationRepository.refreshApproverInbox());
    await Promise.all(tasks);
    const unread = [...repositories.notificationRepository.getAll(), ...repositories.notificationRepository.getApproverInbox()].filter((n) => n.unr).length;
    const dot = document.getElementById('nbDot');
    if (!dot) return;
    if (unread > 0) { dot.textContent = unread; dot.style.display = 'flex'; } else { dot.style.display = 'none'; }
  } catch {
    // best-effort only — a failed badge refresh shouldn't break the app
  }
}

// ── boot ─────────────────────────────────────────────────────────────
async function boot() {
  if (apiClient.isAuthenticated()) {
    try {
      const session = await authClient.fetchMe();
      appState.setSession({ user: session.user, canApprove: session.managementPositions.some((p) => p.canApprove) });
      await showAppShell();
      return;
    } catch {
      authClient.logout();
    }
  }
  showLoginScreen();
}

boot();
