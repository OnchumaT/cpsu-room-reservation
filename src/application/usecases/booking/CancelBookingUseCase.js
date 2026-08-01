import { notifyBookingChange } from './notifyBookingChange.js';

const ACTOR_ROLE_LABEL = {
  staff: 'เจ้าหน้าที่', head: 'หัวหน้าภาควิชา', admin: 'ผู้ดูแลระบบ', teacher: 'อาจารย์', student: 'นักศึกษา',
};

// Only teacher/student bookings have a working notification inbox for this.
const OWNER_NOTIFIERS = {
  teacher: (repo, n) => repo.addTeacherNotification(n),
  student: (repo, n) => repo.addStudentNotification(n),
};

// Whoever cancels a booking (its owner, or Staff), Head and Staff both get
// an FYI notification of the cancellation. When someone OTHER than the
// booking's own owner cancels it (i.e. Staff cancelling on their behalf),
// the owner also gets notified, naming who cancelled it.
export class CancelBookingUseCase {
  constructor({ bookingRepository, notificationRepository }) {
    this.bookingRepository = bookingRepository;
    this.notificationRepository = notificationRepository;
  }

  execute({ bookingId, actorRole, actorName }) {
    const booking = this.bookingRepository.findById(bookingId);
    if (!booking) return { success: false };
    booking.cancel();
    notifyBookingChange({ notificationRepository: this.notificationRepository, booking, event: 'cancelled' });
    if (actorRole && actorRole !== booking.role) {
      this._notifyOwner(booking, actorRole, actorName);
    }
    return { success: true, booking };
  }

  _notifyOwner(booking, actorRole, actorName) {
    const notify = OWNER_NOTIFIERS[booking.role];
    if (!notify) return;
    const actorLabel = ACTOR_ROLE_LABEL[actorRole] || actorRole;
    notify(this.notificationRepository, {
      ic: 'no',
      ibg: '#fee2e2',
      msg: `การจองห้อง ${booking.room} ถูกยกเลิกโดย${actorLabel}${actorName ? ` (${actorName})` : ''}`,
      sub: `${booking.date} · ${booking.time} · ${booking.title}`,
      time: 'เมื่อสักครู่',
      unr: true,
    });
  }
}
