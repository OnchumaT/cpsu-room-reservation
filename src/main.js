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
import { createRoleSwitcher } from './presentation/components/RoleSwitcher.js';

import { Router } from './presentation/router/Router.js';

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

const { appState, repositories, useCases } = createContainer();

// ── shared UI shell ──────────────────────────────────────────────────
const sidebar = createSidebar({ appState });
const topbar = createTopbar({ appState });
const bookingDetailModal = createBookingDetailModal({ bookingRepository: repositories.bookingRepository });
const calendar = createCalendar({ bookingRepository: repositories.bookingRepository, appState, bookingDetailModal });

// ── views (Phase 1 of the migration — see the migration plan for the
// remaining pages, which currently show a "pending migration" placeholder
// via the Router's fallback) ────────────────────────────────────────────
const dashboardView = createDashboardView({
  appState,
  bookingRepository: repositories.bookingRepository,
  templateRepository: repositories.templateRepository,
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

// Router is constructed against a `views` object it will read from at
// navigate-time — populated below once every view (including Templates,
// which itself depends on the Router) has been built.
const views = {};
function onAfterRender(page) {
  sidebar.render();
  if (page === 'dashboard') {
    setTimeout(() => { calendar.renderGrid(); calendar.renderDayDetail(); }, 10);
  }
  if (page === 'book') {
    setTimeout(() => { bookingView.checkRoomAvail(); bookingView.syncFormVisuals(); }, 10);
  }
}
const router = new Router({ appState, views, onAfterRender });

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

// ── follow-up migration phase views (History/Approvals/.../ManageRooms) ─
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
const analyticsView = createAnalyticsView();
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

views.dashboard = dashboardView.render;
views.rooms = roomsView.render;
views.book = bookingView.render;
views.templates = templatesView.render;
views.history = historyView.render;
views.reservations = historyView.render;
views.allbookings = historyView.render;
views.approvals = approvalsView.render;
views.approvalsettings = approvalSettingsView.render;
views.facilityqueue = facilityQueueView.render;
views.notifications = notificationsView.render;
views.profile = profileView.render;
views.users = usersView.render;
views.analytics = analyticsView.render;
views.reports = reportsView.render;
views.settings = settingsView.render;
views.managerooms = manageRoomsView.render;

const roleSwitcher = createRoleSwitcher({ appState, sidebar, topbar, router });

// ── the single global surface every inline onclick="" in the rendered
// HTML calls into (see the migration plan: rewriting hundreds of
// call sites to addEventListener-based delegation was out of scope for
// this pass, so `App` is the one deliberate, namespaced exception to
// "no globals") ──────────────────────────────────────────────────────
window.App = {
  navigate: (page) => router.navigate(page),
  closeModal,
  toggleSidebar: () => sidebar.toggleCollapsed(),
  showRoleModal: () => roleSwitcher.showModal(),
  switchRole: (role) => roleSwitcher.switchRole(role),

  selectDay: (dateStr) => calendar.selectDay(dateStr),
  prevMonth: () => calendar.goToPrevMonth(),
  nextMonth: () => calendar.goToNextMonth(),
  goToday: () => calendar.goToToday(),
  showBookingDetail: (bookingId) => calendar.showBookingDetail(bookingId),
  printRoomNotice: (bookingId) => bookingDetailModal.printRoomNotice(bookingId),

  filterRooms: (query) => roomsView.filterByQuery(query),
  filterRoomsByStatus: (status, btn) => roomsView.filterByStatus(status, btn),
  showRoomDetail: (roomId) => roomsView.showRoomDetail(roomId),

  changeBookingEquipmentQty: (key, delta) => bookingView.changeBookingEquipmentQty(key, delta),
  addBookingFood: () => bookingView.addBookingFood(),
  removeBookingFood: (index) => bookingView.removeBookingFood(index),
  onPurposeChange: (value) => bookingView.onPurposeChange(value),
  checkRoomAvail: () => bookingView.checkRoomAvail(),
  submitBooking: () => bookingView.submitBooking(),
  printBookingPDF: (...args) => bookingView.printBookingPDF(...args),

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

  approveAllPending: () => approvalsView.approveAll(),
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

// ── boot ─────────────────────────────────────────────────────────────
sidebar.render();
topbar.render();
router.navigate('dashboard');
setTimeout(() => showToast('ห้อง 1640 ว่างแล้ว พร้อมให้จอง', 'i'), 4000);
