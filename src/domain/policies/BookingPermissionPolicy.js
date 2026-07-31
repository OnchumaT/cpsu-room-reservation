// BookingPermissionPolicy — which roles may create bookings, and which
// additionally get the "request facilities/equipment" panel on the form.

const ROLES_THAT_CAN_BOOK = new Set(['teacher', 'student', 'head']);
const ROLES_THAT_CAN_REQUEST_FACILITIES = new Set(['teacher', 'head']);

export class BookingPermissionPolicy {
  static canBookRooms(role) {
    return ROLES_THAT_CAN_BOOK.has(role);
  }

  static canRequestFacilities(role) {
    return ROLES_THAT_CAN_REQUEST_FACILITIES.has(role);
  }
}
