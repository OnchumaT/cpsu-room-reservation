// User — pure business rules about a system account. No DOM, no I/O.

export class User {
  constructor({ id, name, email, role, status, joined }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.status = status;
    this.joined = joined;
  }

  isActive() {
    return this.status === 'active';
  }

  toggleStatus() {
    this.status = this.isActive() ? 'inactive' : 'active';
  }
}
