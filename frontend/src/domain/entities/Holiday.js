// Holiday — a single Thai public-holiday calendar entry (date + name),
// admin-managed. Used by OfficeHoursPolicy on the backend to decide
// whether a booking needs the 2-stage faculty/dean approval flow. No
// business rules of its own beyond plain data — thin on purpose, like Room.

export class Holiday {
  constructor({ id, date, name }) {
    this.id = id;
    this.date = date;
    this.name = name;
  }
}
