// AppState — single mutable session bag. `user`/`role`/`canApprove` are
// populated from the real backend session (login response / GET
// /auth/me), replacing the old RoleSwitcher's fake role-switching.

export class AppState {
  constructor() {
    this.user = null; // the logged-in User entity, or null before login resolves
    this.role = null; // convenience mirror of user.role
    this.canApprove = false; // holds a can_approve management position (backend RBAC), independent of role
    this.page = 'dashboard';
    this.sidebarCollapsed = false;
    const now = new Date();
    this.calendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.selectedDate = null;
    this.filterStatus = 'all';
    this.approvalMode = 'manual';

    // booking-form scratch state (equipment/food panel)
    this.bookFoodItems = [];
    this.bookEqQty = { mic: 0, wb: 0, ext: 0, hdmi: 0 };

    // cross-view handoffs
    this.lastBookingSnapshot = null; // consumed by "save as template"
    this.templateToApply = null; // consumed by the booking form on next render
  }

  setSession({ user, canApprove }) {
    this.user = user;
    this.role = user.role;
    this.canApprove = canApprove;
  }

  clearSession() {
    this.user = null;
    this.role = null;
    this.canApprove = false;
  }

  resetBookingScratch() {
    this.bookFoodItems = [];
    this.bookEqQty = { mic: 0, wb: 0, ext: 0, hdmi: 0 };
  }

  /** consume-once handoff: reads and clears in one call */
  takeTemplateToApply() {
    const tpl = this.templateToApply;
    this.templateToApply = null;
    return tpl;
  }
}
