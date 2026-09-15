// BookingPermissionPolicy — which roles may create bookings, and which
// additionally get the "request facilities/equipment" panel on the form.
//
// Approval authority (formerly the 'head' role in this prototype) is now
// a management position, not a role — callers that need to also allow
// approvers to book rooms combine this with appState.canApprove
// themselves, since a position isn't something a pure role-check can see.
// Facility requests follow the same rule: a head/vice-head still books
// (and requests equipment for) rooms like any other teacher, so
// canRequestFacilities also takes canApprove into account.

const ROLES_THAT_CAN_BOOK = new Set(['teacher']);
const ROLES_THAT_CAN_REQUEST_FACILITIES = new Set(['teacher']);

export class BookingPermissionPolicy {
  static canBookRooms(role) {
    return ROLES_THAT_CAN_BOOK.has(role);
  }

  static canRequestFacilities(role, canApprove = false) {
    return ROLES_THAT_CAN_REQUEST_FACILITIES.has(role) || canApprove;
  }
}
