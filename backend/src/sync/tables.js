import { maskBooking } from './mask.js';

// Parent tables before children, so a sync can insert in this order without
// violating foreign keys. `_prisma_migrations`, `audit_logs` and
// `notifications` are intentionally excluded.
export const SYNC_TABLES = [
  { key: 'management_positions', delegate: 'managementPosition' },
  { key: 'users', delegate: 'user', ignoreFields: ['password'], prepare: (row, ctx) => ({ ...row, password: ctx.unusablePasswordHash }) },
  { key: 'user_management_positions', delegate: 'userManagementPosition' },
  { key: 'rooms', delegate: 'room' },
  { key: 'holidays', delegate: 'holiday' },
  { key: 'booking_settings', delegate: 'bookingSetting' },
  { key: 'bookings', delegate: 'booking', mask: maskBooking },
  { key: 'facility_requests', delegate: 'facilityRequest' },
  { key: 'templates', delegate: 'template' },
];
