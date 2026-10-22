import { prisma } from '../../../lib/prisma.js';
import { NotifyFreedSlotUseCase } from './NotifyFreedSlotUseCase.js';
import { AppError } from '../../../utils/AppError.js';
import { formatDateSpan } from '../../../utils/dateFormat.js';
import { thaiTodayStart } from '../../../utils/bookingTime.js';

const CANCELLABLE = ['pending', 'approved'];

export class CancelBookingUseCase {
  constructor({ bookingRepository, notificationRepository, auditLogRepository, clashAttemptRepository, timetableRepository, roomRepository }) {
    this.notifyFreedSlot = new NotifyFreedSlotUseCase({ clashAttemptRepository, bookingRepository, timetableRepository, notificationRepository, roomRepository });
    this.bookingRepository = bookingRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
  }

  /**
   * `scope: 'group'` on a day of a multi-day booking cancels every day of it
   * that is still pending/approved and hasn't passed yet (plus this one);
   * the default cancels just this day.
   */
  async execute({ bookingId, actor, scope = 'single' }) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');
    if (!CANCELLABLE.includes(booking.status)) {
      throw AppError.badRequest(`Booking is already ${booking.status}`);
    }

    const isOwner = booking.userId === actor.id;
    const isManager = ['staff', 'admin'].includes(actor.role);
    if (!isOwner && !isManager) throw AppError.forbidden('You can only cancel your own bookings');

    const today = thaiTodayStart().toISOString().slice(0, 10);
    const targets = scope === 'group' && booking.groupId
      ? (await this.bookingRepository.findGroup(booking.groupId))
        .filter((b) => b.id === booking.id || (CANCELLABLE.includes(b.status) && b.date >= today))
      : [booking];

    const updated = await prisma.$transaction(async (tx) => {
      const cancelledCard = { status: 'ยกเลิก', statusBg: '#f3f4f6', statusColor: '#4b5563', unread: false, actions: [] };
      const saved = [];
      for (const target of targets) {
        const b = await this.bookingRepository.update(target.id, { status: 'cancelled' }, tx);
        // Clear the buttons on the original pending-approval notification so
        // approvers can't approve/reject a booking that's already cancelled.
        await this.notificationRepository.resolveApproverNotifications(b.id, cancelledCard, tx);
        await this.notificationRepository.closeStaffCardsForBooking(b.id, cancelledCard, tx);
        saved.push(b);
      }
      const first = saved[0];
      const when = `${formatDateSpan(saved.map((b) => b.date))} · ${first.time} · ${first.title}`;

      // Approvers and Staff both get an FYI, even the one of them who
      // performed the action, so both stay in sync on cancellations
      // either side didn't trigger themselves. Names who cancelled it (the
      // requester, or staff/admin on their behalf).
      const base = {
        iconKey: 'no', iconBg: '#F4F5FA',
        title: isOwner
          ? `${actor.name} ยกเลิกคำขอจองห้อง ${first.room}`
          : `${actor.name} ยกเลิกการจองห้อง ${first.room} ของ ${first.user}`,
        subtitle: when,
        status: 'ยกเลิก', statusBg: '#f3f4f6', statusColor: '#4b5563',
        kind: 'booking',
      };
      await Promise.all([
        // Not linked to the booking: approvers who didn't decide it may not open a
        // cancelled booking (BookingVisibilityPolicy), and a linked card would be
        // redacted down to nothing — this text is all they need.
        this.notificationRepository.addForAudience('approvers', base, tx),
        this.notificationRepository.addForAudience('staff', { ...base, bookingId: first.id }, tx),
      ]);

      if (!isOwner) {
        await this.notificationRepository.addForUser(first.userId, {
          iconKey: 'no', iconBg: '#fee2e2',
          title: `การจองห้อง ${first.room} ของคุณถูกยกเลิกโดย ${actor.name}`,
          subtitle: when,
          bookingId: first.id, kind: 'booking',
        }, tx);
      }

      await this.auditLogRepository.create(
        { userId: actor.id, action: 'booking.cancel', details: { bookingId: booking.id, ...(saved.length > 1 ? { bookingIds: saved.map((b) => b.id) } : {}) } },
        tx,
      );
      return saved;
    });

    for (const b of updated) {
      await this.notifyFreedSlot.execute({ roomId: b.roomId, date: b.date, time: b.time })
        .catch((err) => console.error('[cancel] freed-slot notice failed:', err));
    }

    return { success: true, booking: updated.find((b) => b.id === booking.id), bookings: updated };
  }
}
