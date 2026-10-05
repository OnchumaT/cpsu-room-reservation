/** Reports any bookings already occupying a room on a given date, so the
 * booking form can show a same-day warning before the user even submits. */
export class CheckRoomAvailabilityUseCase {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  /** @param {{room:string, date:string}} input */
  async execute({ room, date }) {
    if (!room || !date) return { bookedTimes: [] };
    return this.bookingRepository.checkAvailability({ room, date });
  }
}
