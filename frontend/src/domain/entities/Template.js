// Template — a reusable "reservation preset" a user saved from a past booking.
// Deliberately never carries a date or start/end time — the whole point is
// that those must be chosen fresh every time it's applied (prevents
// accidental duplicate bookings on the same slot).
import { formatFoodItem } from '../../shared/foodFormat.js';

export class Template {
  constructor({ id, name, room, purpose, participants, note, equipment, food, facilityNote, participatingTeachers }) {
    this.id = id;
    this.name = name;
    this.room = room;
    this.purpose = purpose;
    this.participants = participants ?? 10;
    this.note = note ?? '';
    this.equipment = equipment ?? {};
    this.food = (food ?? []).map(formatFoodItem);
    this.facilityNote = facilityNote ?? '';
    this.participatingTeachers = participatingTeachers ?? [];
  }

  static newId() {
    return `TPL${Date.now()}`;
  }

  /** Snapshot of a just-created booking's editable fields, suitable for saving as a Template. */
  static fromBookingSnapshot(snapshot) {
    return new Template({ id: Template.newId(), name: '', ...snapshot });
  }

  rename(name) {
    this.name = name;
  }

  duplicate() {
    return new Template({ ...this, id: Template.newId(), name: `${this.name} (สำเนา)` });
  }

  /** The prefill draft consumed by the booking form — everything except date/time. */
  toBookingDraft() {
    return {
      room: this.room,
      purpose: this.purpose,
      participants: this.participants,
      note: this.note,
      equipment: { ...this.equipment },
      food: [...this.food],
      facilityNote: this.facilityNote,
      participatingTeachers: [...this.participatingTeachers],
    };
  }

  hasFacilityItems() {
    return Object.values(this.equipment).some((v) => v > 0) || this.food.length > 0;
  }
}
