import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';

export class CancelBookingUseCase {
  constructor({ bookingRepository, notificationRepository, auditLogRepository }) {
    this.bookingRepository = bookingRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
  }

  async execute({ bookingId, actor }) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');
    if (!['pending', 'approved'].includes(booking.status)) {
      throw AppError.badRequest(`Booking is already ${booking.status}`);
    }

    const isOwner = booking.userId === actor.id;
    const isManager = ['staff', 'admin'].includes(actor.role);
    if (!isOwner && !isManager) throw AppError.forbidden('You can only cancel your own bookings');

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await this.bookingRepository.update(bookingId, { status: 'cancelled' }, tx);

      // Clear the buttons on the original pending-approval notification so
      // approvers can't approve/reject a booking that's already cancelled.
      await this.notificationRepository.resolveApproverNotifications(saved.id, {
        status: 'ยกเลิก', statusBg: '#f3f4f6', statusColor: '#4b5563', unread: false, actions: [],
      }, tx);

      // Approvers and Staff both get an FYI, even the one of them who
      // performed the action, so both stay in sync on cancellations
      // either side didn't trigger themselves.
      const base = {
        iconKey: 'no', iconBg: '#F4F5FA',
        title: `${saved.user} ยกเลิกการจอง ${saved.id}`,
        subtitle: `ห้อง ${saved.roomName ?? saved.room} · ${saved.date} · ${saved.time}`,
        bookingId: saved.id, kind: 'booking',
      };
      await Promise.all([
        this.notificationRepository.addForAudience('approvers', base, tx),
        this.notificationRepository.addForAudience('staff', base, tx),
      ]);

      if (!isOwner) {
        await this.notificationRepository.addForUser(saved.userId, {
          iconKey: 'no', iconBg: '#fee2e2',
          title: `การจองห้อง ${saved.roomName ?? saved.room} ของคุณถูกยกเลิกโดย ${actor.name}`,
          subtitle: `${saved.date} · ${saved.time} · ${saved.title}`,
          bookingId: saved.id, kind: 'booking',
        }, tx);
      }

      await this.auditLogRepository.create(
        { userId: actor.id, action: 'booking.cancel', details: { bookingId: saved.id } },
        tx,
      );
      return saved;
    });

    return { success: true, booking: updated };
  }
}
