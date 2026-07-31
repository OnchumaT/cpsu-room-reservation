/**
 * Reports any bookings already occupying a room on a given date, so the
 * booking form can show a same-day warning before the user even submits.
 * (Pulled out of the old checkRoomAvail().)
 */
export class CheckRoomAvailabilityUseCase {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  /** @param {{room:string, date:string}} input */
  execute({ room, date }) {
    if (!room || !date) return { bookedTimes: [] };
    const booked = this.bookingRepository.getAll().filter((b) => (
      b.room === room && b.date === date && b.isActive()
    ));
    return { bookedTimes: booked.map((b) => b.time) };
  }
}
