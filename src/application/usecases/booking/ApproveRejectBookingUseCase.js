// Not yet called by any Phase-1 view (Approvals page is a follow-up
// migration item) — implemented now against the real repository so that
// follow-up view is a thin wiring exercise.
export class ApproveRejectBookingUseCase {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  approve(bookingId) {
    const booking = this.bookingRepository.findById(bookingId);
    if (!booking) return { success: false };
    booking.approve();
    return { success: true, booking };
  }

  reject(bookingId) {
    const booking = this.bookingRepository.findById(bookingId);
    if (!booking) return { success: false };
    booking.reject();
    return { success: true, booking };
  }

  approveAllPending() {
    const approved = this.bookingRepository.getAll().filter((b) => b.isPending());
    approved.forEach((b) => b.approve());
    return { success: true, approved };
  }
}
