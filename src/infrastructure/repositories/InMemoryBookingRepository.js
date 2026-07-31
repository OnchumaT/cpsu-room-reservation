import { IBookingRepository } from '../../application/ports/IBookingRepository.js';
import { Booking } from '../../domain/entities/Booking.js';
import { BOOKINGS_SEED } from '../seed/bookings.seed.js';

export class InMemoryBookingRepository extends IBookingRepository {
  constructor(seed = BOOKINGS_SEED) {
    super();
    this._bookings = seed.map((b) => new Booking(b));
  }

  getAll() {
    return this._bookings;
  }

  findById(id) {
    return this._bookings.find((b) => b.id === id);
  }

  add(booking) {
    this._bookings.push(booking);
  }

  count() {
    return this._bookings.length;
  }
}
