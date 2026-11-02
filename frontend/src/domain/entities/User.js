// User — pure business rules about a system account. No DOM, no I/O.

export class User {
  constructor({ id, name, email, role, status, joined, positions, emailNotifications }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.status = status;
    this.joined = joined;
    // Management positions held, e.g. หัวหน้าภาควิชา — [{ id, positionName, canApprove }].
    this.positions = positions ?? [];
    // Wants notification emails (Profile page switch).
    this.emailNotifications = emailNotifications ?? true;
  }

  holdsPosition(positionId) {
    return this.positions.some((p) => p.id === positionId);
  }

  isActive() {
    return this.status === 'active';
  }

  toggleStatus() {
    this.status = this.isActive() ? 'inactive' : 'active';
  }
}
