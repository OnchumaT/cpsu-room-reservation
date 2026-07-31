// Only teacher/student bookings ever reach Head for review (Head's own
// bookings always auto-approve per ApprovalPolicy), so the booking owner
// notified here is always one of those two roles.
const OWNER_NOTIFIERS = {
  teacher: (repo, n) => repo.addTeacherNotification(n),
  student: (repo, n) => repo.addStudentNotification(n),
};

export class ApproveRejectBookingUseCase {
  constructor({ bookingRepository, notificationRepository }) {
    this.bookingRepository = bookingRepository;
    this.notificationRepository = notificationRepository;
  }

  approve(bookingId) {
    const booking = this.bookingRepository.findById(bookingId);
    if (!booking) return { success: false };
    booking.approve();
    this._notifyOwner(booking, true);
    return { success: true, booking };
  }

  reject(bookingId) {
    const booking = this.bookingRepository.findById(bookingId);
    if (!booking) return { success: false };
    booking.reject();
    this._notifyOwner(booking, false);
    return { success: true, booking };
  }

  approveAllPending() {
    const approved = this.bookingRepository.getAll().filter((b) => b.isPending());
    approved.forEach((b) => {
      b.approve();
      this._notifyOwner(b, true);
    });
    return { success: true, approved };
  }

  _notifyOwner(booking, approved) {
    const notify = OWNER_NOTIFIERS[booking.role];
    if (!notify) return;
    notify(this.notificationRepository, {
      ic: approved ? 'ok' : 'no',
      ibg: approved ? '#dcfce7' : '#fee2e2',
      msg: `การจองห้อง ${booking.room} ${approved ? 'ได้รับการอนุมัติ' : 'ถูกปฏิเสธ'}`,
      sub: `${booking.date} · ${booking.time} · ${booking.title}`,
      time: 'เมื่อสักครู่',
      unr: true,
    });
  }
}
