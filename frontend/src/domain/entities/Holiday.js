// Holiday — a single Thai public-holiday calendar entry (date + name),
// staff-managed. Used by OfficeHoursPolicy on the backend to decide
// whether a booking needs manual (department: head/vice-head) approval.
// No business rules of its own beyond plain data — thin on purpose, like Room.

export class Holiday {
  constructor({ id, date, name }) {
    this.id = id;
    this.date = date;
    this.name = name;
  }
}
