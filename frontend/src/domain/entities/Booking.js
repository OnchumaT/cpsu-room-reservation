import { TimeRange } from '../policies/TimeRange.js';

// Booking — pure business rules about a single reservation. No DOM, no I/O.

export const BOOKING_STATUS = Object.freeze({
  PENDING: 'pending',
  // Department stage (head/vice-head) approved an out-of-hours booking —
  // awaiting the second, faculty/dean stage. Only reached when
  // requiresFacultyApproval is true.
  PENDING_FACULTY: 'pending_faculty',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

let sequence = 0;

export class Booking {
  constructor({
    id, room, user, userId, title, date, time, status, role, participants, note,
    participatingTeachers, bookingForStudents, equipment, food, facilityNote,
    approvedByName, approvedAt, rejectReason, createdAt,
    requiresFacultyApproval, facultyApprovedByName, facultyApprovedAt,
    roomResponsibleType, roomResponsibleName, roomResponsiblePhone,
  }) {
    this.id = id;
    this.room = room;
    this.user = user;
    this.userId = userId;
    this.title = title;
    this.date = date;
    this.time = time;
    this.status = status;
    this.role = role;
    this.participants = participants;
    this.note = note;
    this.participatingTeachers = participatingTeachers ?? [];
    this.bookingForStudents = bookingForStudents ?? [];
    this.equipment = equipment ?? {};
    this.food = food ?? [];
    this.facilityNote = facilityNote ?? '';
    this.approvedByName = approvedByName ?? null;
    this.approvedAt = approvedAt ?? null;
    this.rejectReason = rejectReason ?? '';
    this.createdAt = createdAt ?? null;
    // Out-of-hours (Sat/Sun, a holiday, or start time outside 08:30-18:00 on a weekday) 2-stage approval —
    // see OfficeHoursPolicy on the backend.
    this.requiresFacultyApproval = requiresFacultyApproval ?? false;
    this.facultyApprovedByName = facultyApprovedByName ?? null;
    this.facultyApprovedAt = facultyApprovedAt ?? null;
    // Who opens/closes the room — the booker themselves, or someone else.
    this.roomResponsibleType = roomResponsibleType ?? 'self';
    this.roomResponsibleName = roomResponsibleName ?? null;
    this.roomResponsiblePhone = roomResponsiblePhone ?? null;
  }

  static nextId(existingCount) {
    sequence += 1;
    return `BK0${existingCount + 10 + sequence}`;
  }

  isPending() { return this.status === BOOKING_STATUS.PENDING; }
  isPendingFaculty() { return this.status === BOOKING_STATUS.PENDING_FACULTY; }
  /** Still awaiting a decision at either approval stage. */
  needsApproval() { return this.isPending() || this.isPendingFaculty(); }
  isApproved() { return this.status === BOOKING_STATUS.APPROVED; }
  isRejected() { return this.status === BOOKING_STATUS.REJECTED; }
  isCancelled() { return this.status === BOOKING_STATUS.CANCELLED; }
  isExpired() { return this.status === BOOKING_STATUS.EXPIRED; }
  isActive() { return !this.isRejected() && !this.isCancelled() && !this.isExpired(); }

  approve() { this.status = BOOKING_STATUS.APPROVED; }
  reject() { this.status = BOOKING_STATUS.REJECTED; }
  cancel() { this.status = BOOKING_STATUS.CANCELLED; }

  sameRoomAndDate(room, date) {
    return this.room === room && this.date === date;
  }

  overlapsWith(timeRange) {
    return TimeRange.fromLabel(this.time).overlaps(timeRange);
  }
}
