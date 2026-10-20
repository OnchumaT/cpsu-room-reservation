import { prisma } from '../../../lib/prisma.js';
import { NotifyFreedSlotUseCase } from './NotifyFreedSlotUseCase.js';
import { AppError } from '../../../utils/AppError.js';
import { formatDateDMY } from '../../../utils/dateFormat.js';

export class CancelBookingUseCase {
  constructor({ bookingRepository, notificationRepository, auditLogRepository, clashAttemptRepository, timetableRepository, roomRepository }) {
    this.notifyFreedSlot = new NotifyFreedSlotUseCase({ clashAttemptRepository, bookingRepository, timetableRepository, notificationRepository, roomRepository });
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
      const cancelledCard = { status: 'ยกเลิก', statusBg: '#f3f4f6', statusColor: '#4b5563', unread: false, actions: [] };
      await this.notificationRepository.resolveApproverNotifications(saved.id, cancelledCard, tx);
      await this.notificationRepository.closeStaffCardsForBooking(saved.id, cancelledCard, tx);

      // Approvers and Staff both get an FYI, even the one of them who
      // performed the action, so both stay in sync on cancellations
      // either side didn't trigger themselves. Names who cancelled it (the
      // requester, or staff/admin on their behalf).
      const base = {
        iconKey: 'no', iconBg: '#F4F5FA',
        title: isOwner
          ? `${actor.name} ยกเลิกคำขอจองห้อง ${saved.room}`
          : `${actor.name} ยกเลิกการจองห้อง ${saved.room} ของ ${saved.user}`,
        subtitle: `${formatDateDMY(saved.date)} · ${saved.time} · ${saved.title}`,
        status: 'ยกเลิก', statusBg: '#f3f4f6', statusColor: '#4b5563',
        kind: 'booking',
      };
      await Promise.all([
        // Not linked to the booking: approvers who didn't decide it may not open a
        // cancelled booking (BookingVisibilityPolicy), and a linked card would be
        // redacted down to nothing — this text is all they need.
        this.notificationRepository.addForAudience('approvers', base, tx),
        this.notificationRepository.addForAudience('staff', { ...base, bookingId: saved.id }, tx),
      ]);

      if (!isOwner) {
        await this.notificationRepository.addForUser(saved.userId, {
          iconKey: 'no', iconBg: '#fee2e2',
          title: `การจองห้อง ${saved.room} ของคุณถูกยกเลิกโดย ${actor.name}`,
          subtitle: `${formatDateDMY(saved.date)} · ${saved.time} · ${saved.title}`,
          bookingId: saved.id, kind: 'booking',
        }, tx);
      }

      await this.auditLogRepository.create(
        { userId: actor.id, action: 'booking.cancel', details: { bookingId: saved.id } },
        tx,
      );
      return saved;
    });

    await this.notifyFreedSlot.execute({ roomId: updated.roomId, date: updated.date, time: updated.time })
      .catch((err) => console.error('[cancel] freed-slot notice failed:', err));

    return { success: true, booking: updated };
  }
}
