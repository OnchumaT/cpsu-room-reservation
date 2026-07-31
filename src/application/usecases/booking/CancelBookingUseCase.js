// Not yet called by any Phase-1 view (History's cancel button is a
// follow-up migration item) — implemented now against the real
// repository so that follow-up view is a thin wiring exercise.
export class CancelBookingUseCase {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  execute({ bookingId }) {
    const booking = this.bookingRepository.findById(bookingId);
    if (!booking) return { success: false };
    booking.cancel();
    return { success: true, booking };
  }
}
