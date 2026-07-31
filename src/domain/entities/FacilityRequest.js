// FacilityRequest — an equipment/food request attached to a booking,
// handled by Staff.

export const FACILITY_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DONE: 'done',
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
}
