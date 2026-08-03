/**
 * Reports any bookings already occupying a room on a given date, so the
 * booking form can show a same-day warning before the user even submits.
 */
export class CheckRoomAvailabilityUseCase {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  async execute({ roomId, date }) {
    if (!roomId || !date) return { bookedTimes: [] };
    const bookings = await this.bookingRepository.getAll({ roomId, date });
    const active = bookings.filter((b) => ['pending', 'approved'].includes(b.status));
    return { bookedTimes: active.map((b) => b.time) };
  }
}
