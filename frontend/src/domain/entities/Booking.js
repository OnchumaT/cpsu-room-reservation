import { TimeRange } from '../policies/TimeRange.js';
import { formatFoodItem } from '../../shared/foodFormat.js';

// Booking — pure business rules about a single reservation. No DOM, no I/O.

export const BOOKING_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  NO_SHOW: 'no_show',
});

let sequence = 0;

export class Booking {
  constructor({
    id, room, user, userId, title, date, time, status, role, participants, note,
    participatingTeachers, bookingForStudents, equipment, food, facilityNote,
    approvedByName, approvedAt, rejectReason, createdAt, isOutOfHours, facultyApprovedAt, checkedInAt,
    roomResponsibleType, roomResponsibleName, roomResponsiblePhone, redacted, approvalType, groupId, groupDays,
    cateringAssignee, openerAssignee, checkedByName, checkedAt, signinSheetReceivedAt, signinSheetReceivedByName,
  }) {
    this.id = id;
    // Set by the server for viewers who may only see that the room is taken (see BookingVisibilityPolicy).
    this.redacted = redacted === true;
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
    this.food = (food ?? []).map(formatFoodItem);
    this.facilityNote = facilityNote ?? '';
    this.approvedByName = approvedByName ?? null;
    // 'auto' = approved by the system (approval mode), so no person is named.
    this.approvalType = approvalType ?? null;
    this.approvedAt = approvedAt ?? null;
    this.rejectReason = rejectReason ?? '';
    this.createdAt = createdAt ?? null;
    // Falls outside normal office hours (see the backend's OfficeHoursPolicy)
    // — needs the Dean's permission (recorded by Staff) before a head/
    // vice-head may approve it.
    this.isOutOfHours = isOutOfHours ?? false;
    this.facultyApprovedAt = facultyApprovedAt ?? null;
    // When someone checked in at the room via its QR code (or Staff did so for them).
    this.checkedInAt = checkedInAt ?? null;
    // Who opens/closes the room — the booker themselves, or someone else.
    this.roomResponsibleType = roomResponsibleType ?? 'self';
    this.roomResponsibleName = roomResponsibleName ?? null;
    this.roomResponsiblePhone = roomResponsiblePhone ?? null;
    // Multi-day booking: every day shares a groupId and is approved/rejected
    // (and optionally cancelled) as a set. groupDays ({ id, date, status, isOutOfHours }[])
    // only comes with a single-booking fetch (bookingRepository.fetchById).
    this.groupId = groupId ?? null;
    this.groupDays = groupDays ?? null;
    // A students' request, checked by Staff (paper form's "ผู้ตรวจสอบ").
    this.cateringAssignee = cateringAssignee ?? null;
    this.openerAssignee = openerAssignee ?? null;
    this.checkedByName = checkedByName ?? null;
    this.checkedAt = checkedAt ?? null;
    // Attendee sign-in sheet handed back after a catered students' event.
    this.signinSheetReceivedAt = signinSheetReceivedAt ?? null;
    this.signinSheetReceivedByName = signinSheetReceivedByName ?? null;
  }

  isForStudents() { return this.bookingForStudents.length > 0; }
  isCatered() { return this.food.length > 0; }

  static nextId(existingCount) {
    sequence += 1;
    return `BK0${existingCount + 10 + sequence}`;
  }

  isMultiDay() { return Boolean(this.groupId); }

  isPending() { return this.status === BOOKING_STATUS.PENDING; }
  isApproved() { return this.status === BOOKING_STATUS.APPROVED; }
  isRejected() { return this.status === BOOKING_STATUS.REJECTED; }
  isCancelled() { return this.status === BOOKING_STATUS.CANCELLED; }
  isExpired() { return this.status === BOOKING_STATUS.EXPIRED; }
  isNoShow() { return this.status === BOOKING_STATUS.NO_SHOW; }
  isActive() { return !this.isRejected() && !this.isCancelled() && !this.isExpired() && !this.isNoShow(); }
  /** Out-of-hours and still waiting for the Dean — approvers can't approve it yet. */
  awaitingDean() { return this.isOutOfHours && this.isPending() && !this.facultyApprovedAt; }

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
