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

views.dashboard = dashboardView.render;
views.rooms = roomsView.render;
views.book = bookingView.render;
views.templates = templatesView.render;

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
};

// ── boot ─────────────────────────────────────────────────────────────
sidebar.render();
topbar.render();
router.navigate('dashboard');
setTimeout(() => showToast('ห้อง 1640 ว่างแล้ว พร้อมให้จอง', 'i'), 4000);
