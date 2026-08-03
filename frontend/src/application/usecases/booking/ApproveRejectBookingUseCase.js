/** Thin async wrapper — requires the caller to hold a can_approve
 * management position; the backend rejects with 403 otherwise. */
export class ApproveRejectBookingUseCase {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  async approve(bookingId) {
    const booking = await this.bookingRepository.approve(bookingId);
    return { success: true, booking };
  }

  async reject(bookingId, reason) {
    const booking = await this.bookingRepository.reject(bookingId, reason);
    return { success: true, booking };
  }
}
