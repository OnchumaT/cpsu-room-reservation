// Who may see the full details of a booking. Everyone else sees only that a
// room is taken for a time slot. Enforced on the server; the frontend hiding
// fields is not a substitute.
const FULL_VIEW_ROLES = new Set(['admin', 'staff']);
const OCCUPYING_STATUSES = new Set(['pending', 'approved']);

export const BookingVisibilityPolicy = {
  // An approver is related to a request while it awaits a decision (any approver
  // may decide it) and afterwards only if they made the decision.
  canViewFull({ viewer, canApprove, booking }) {
    if (FULL_VIEW_ROLES.has(viewer.role)) return true;
    if (String(booking.userId) === String(viewer.id)) return true;
    return Boolean(canApprove)
      && (booking.status === 'pending' || String(booking.approvedBy) === String(viewer.id));
  },

  // Lists and the calendar carry only bookings the viewer may see in full; nothing about others.
  fullOnly({ viewer, canApprove, booking }) {
    return BookingVisibilityPolicy.canViewFull({ viewer, canApprove, booking }) ? booking : null;
  },

  // Returns the booking as this viewer may see it, or null if they may not see it at all.
  viewFor({ viewer, canApprove, booking }) {
    if (BookingVisibilityPolicy.canViewFull({ viewer, canApprove, booking })) return booking;
    if (!OCCUPYING_STATUSES.has(booking.status)) return null;
    return {
      id: booking.id,
      room: booking.room,
      roomName: booking.roomName,
      date: booking.date,
      time: booking.time,
      status: 'occupied',
      redacted: true,
    };
  },

  // Notifications are stored with the requester's name and purpose in their text, so
  // anyone who may not see the booking gets the room and slot only.
  redactNotification(notification, booking) {
    return {
      ...notification,
      title: booking ? `การจองห้อง ${booking.room}` : 'การจองห้อง',
      sub: booking ? `${booking.date} · ${booking.time}` : '',
      st: 'ดำเนินการแล้ว',
      stBg: '#EEF0FF',
      stC: '#38419D',
      acts: [],
    };
  },
};
