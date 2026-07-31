// AppState — replaces the old global `state` object. Still a single
// mutable bag (this is a small session-only demo, not a full app with
// undo/redo needs), but now it's an explicit class with named accessors
// instead of an anonymous object any file could reshape.

export class AppState {
  constructor() {
    this.role = 'teacher';
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
