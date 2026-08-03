/** Thin async wrapper — the backend owns the FYI notifications to
 * Approvers/Staff/owner. Returns { success, booking }. */
export class CancelBookingUseCase {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  async execute({ bookingId }) {
    const booking = await this.bookingRepository.cancel(bookingId);
    return { success: true, booking };
  }
}
