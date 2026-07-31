import { TimeRange } from './TimeRange.js';

// BookingConflictPolicy — decides whether a new booking request collides
// with an existing one. Pulled out of the old inline loop in submitBook().

export class BookingConflictPolicy {
  /**
   * @param {import('../entities/Booking.js').Booking[]} existingBookings
   * @param {{room:string, date:string, start:string, end:string}} request
   * @returns {import('../entities/Booking.js').Booking|null} the first conflicting booking, or null
   */
  static findConflict(existingBookings, { room, date, start, end }) {
    const requested = new TimeRange(start, end);
    return existingBookings.find((booking) => (
      booking.sameRoomAndDate(room, date)
      && booking.isActive()
      && booking.overlapsWith(requested)
    )) || null;
  }
}
