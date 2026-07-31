// IBookingRepository — the shape every booking data source must provide.
// Use-cases depend on this abstraction, never on a concrete implementation
// (Dependency Inversion). Today's only implementation is in-memory; a real
// backend would be a drop-in replacement.

export class IBookingRepository {
  /** @returns {import('../../domain/entities/Booking.js').Booking[]} */
  getAll() { throw new Error('not implemented'); }

  /** @returns {import('../../domain/entities/Booking.js').Booking|undefined} */
  findById(_id) { throw new Error('not implemented'); }

  add(_booking) { throw new Error('not implemented'); }

  count() { throw new Error('not implemented'); }
}
