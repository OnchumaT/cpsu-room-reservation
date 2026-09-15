// page-key -> component map, replacing the old Router class. AppShellContext
// owns the current `page` key; App.jsx looks it up here and renders it.
// `reservations`/`allbookings` alias `history`, same as the vanilla app.

import { DashboardView } from '../views/DashboardView.jsx';
import { RoomsView } from '../views/RoomsView.jsx';
import { BookingView } from '../views/BookingView.jsx';
import { TemplatesView } from '../views/TemplatesView.jsx';
import { HistoryView } from '../views/HistoryView.jsx';
import { ApprovalsView } from '../views/ApprovalsView.jsx';
import { ApprovalHistoryView } from '../views/ApprovalHistoryView.jsx';
import { ApprovalSettingsView } from '../views/ApprovalSettingsView.jsx';
import { FacilityQueueView } from '../views/FacilityQueueView.jsx';
import { NotificationsView } from '../views/NotificationsView.jsx';
import { ProfileView } from '../views/ProfileView.jsx';
import { UsersView } from '../views/UsersView.jsx';
import { AnalyticsView } from '../views/AnalyticsView.jsx';
import { SettingsView } from '../views/SettingsView.jsx';
import { ManageRoomsView } from '../views/ManageRoomsView.jsx';
import { ManageHolidaysView } from '../views/ManageHolidaysView.jsx';

export const PAGES = {
  dashboard: DashboardView,
  rooms: RoomsView,
  book: BookingView,
  templates: TemplatesView,
  history: HistoryView,
  reservations: HistoryView,
  allbookings: HistoryView,
  approvals: ApprovalsView,
  approvalhistory: ApprovalHistoryView,
  approvalsettings: ApprovalSettingsView,
  facilityqueue: FacilityQueueView,
  notifications: NotificationsView,
  profile: ProfileView,
  users: UsersView,
  analytics: AnalyticsView,
  settings: SettingsView,
  managerooms: ManageRoomsView,
  manageholidays: ManageHolidaysView,
};
