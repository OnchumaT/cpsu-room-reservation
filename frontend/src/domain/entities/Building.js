// Building — an admin-managed building a Room can belong to. No business
// rules of its own beyond plain data — thin on purpose, like Room/Holiday.

export class Building {
  constructor({ id, name }) {
    this.id = id;
    this.name = name;
  }
}
