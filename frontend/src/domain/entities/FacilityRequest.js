// FacilityRequest — an equipment/food request attached to a booking,
// handled by Staff.

export const FACILITY_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DONE: 'done',
  NOT_DONE: 'not_done',
});

export class FacilityRequest {
  constructor({ id, who, room, bkId, date, time, equip, food, note, submitted, st }) {
    this.id = id;
    this.who = who;
    this.room = room;
    this.bkId = bkId;
    this.date = date;
    this.time = time;
    this.equip = equip ?? [];
    this.food = food ?? [];
    this.note = note ?? '';
    this.submitted = submitted;
    this.st = st ?? FACILITY_REQUEST_STATUS.PENDING;
  }

  static newId(existingCount) {
    return `FR00${existingCount + 1}`;
  }

  accept() { this.st = FACILITY_REQUEST_STATUS.ACCEPTED; }
  markDone() { this.st = FACILITY_REQUEST_STATUS.DONE; }
  isPending() { return this.st === FACILITY_REQUEST_STATUS.PENDING; }
  isAccepted() { return this.st === FACILITY_REQUEST_STATUS.ACCEPTED; }
  isOpen() { return this.isPending() || this.isAccepted(); }

  /** Booking end as a real moment — date/time are Thai wall-clock (UTC+7). */
  endsAt() {
    const end = String(this.time || '').split('-')[1];
    return end ? new Date(`${this.date}T${end.padStart(5, '0')}:00+07:00`) : null;
  }

  /** Still open although the booking has already ended — nothing left to prepare, only to close. */
  isOverdue(now = new Date()) {
    const end = this.endsAt();
    return this.isOpen() && end !== null && end <= now;
  }
}
