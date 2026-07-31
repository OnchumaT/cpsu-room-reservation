// Not yet called by any Phase-1 view (History's edit-booking modal is a
// follow-up migration item) — implemented now against the real
// repository so that follow-up view is a thin wiring exercise.
export class EditBookingUseCase {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  /** @param {{bookingId:string, date:string, start:string, end:string, title:string}} input */
  execute({ bookingId, date, start, end, title }) {
    const booking = this.bookingRepository.findById(bookingId);
    if (!booking) return { success: false, reason: 'not-found' };
    if (!date || !start || !end || !title) return { success: false, reason: 'missing-fields' };
    if (start >= end) return { success: false, reason: 'invalid-time-range' };

    booking.date = date;
    booking.time = `${start}–${end}`;
    booking.title = title;
    return { success: true, booking };
  }
}
