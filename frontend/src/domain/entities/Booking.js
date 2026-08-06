import { TimeRange } from '../policies/TimeRange.js';

// Booking — pure business rules about a single reservation. No DOM, no I/O.

export const BOOKING_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

let sequence = 0;

export class Booking {
  constructor({
    id, room, user, userId, title, date, time, status, role, participants, note,
    participatingTeachers, equipment, food, facilityNote,
    approvedByName, approvedAt, rejectReason, createdAt,
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
    this.equipment = equipment ?? {};
    this.food = food ?? [];
    this.facilityNote = facilityNote ?? '';
    this.approvedByName = approvedByName ?? null;
    this.approvedAt = approvedAt ?? null;
    this.rejectReason = rejectReason ?? '';
    this.createdAt = createdAt ?? null;
  }

  static nextId(existingCount) {
    sequence += 1;
    return `BK0${existingCount + 10 + sequence}`;
  }

  isPending() { return this.status === BOOKING_STATUS.PENDING; }
  isApproved() { return this.status === BOOKING_STATUS.APPROVED; }
  isRejected() { return this.status === BOOKING_STATUS.REJECTED; }
  isCancelled() { return this.status === BOOKING_STATUS.CANCELLED; }
  isActive() { return !this.isRejected() && !this.isCancelled(); }

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
