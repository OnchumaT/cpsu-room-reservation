import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';

const hasFacilityItems = ({ equipment, food }) => (
  Object.values(equipment || {}).some((v) => v > 0) || (food || []).length > 0
);

/** Edits a pending booking's date/time/title/note (+ facility ask, teacher/approver-only). */
export class EditBookingUseCase {
  constructor({ bookingRepository, notificationRepository, userRepository }) {
    this.bookingRepository = bookingRepository;
    this.notificationRepository = notificationRepository;
    this.userRepository = userRepository;
  }

  async execute({ bookingId, actor, date, start, end, title, note, facility }) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');
    if (booking.userId !== actor.id) throw AppError.forbidden('You can only edit your own bookings');
    if (booking.status !== 'pending') throw AppError.badRequest('Only pending bookings can be edited');
    if (!date || !start || !end || !title) throw AppError.badRequest('date, start, end and title are required');
    if (start >= end) throw AppError.badRequest('start time must be before end time');

    const wantsFacility = facility && hasFacilityItems(facility)
      && (actor.role === 'teacher' || await this.userRepository.canApprove(actor.id));

    const updated = await prisma.$transaction(async (tx) => {
      const changes = { date, start, end, title, note };
      if (wantsFacility) {
        changes.equipment = facility.equipment;
        changes.food = facility.food;
        changes.facilityNote = facility.facilityNote;
      }
      const saved = await this.bookingRepository.update(bookingId, changes, tx);

      const base = {
        iconKey: 'cal', iconBg: '#EEF0FF',
        title: `${saved.user} แก้ไขการจอง ${saved.id}`,
        subtitle: `ห้อง ${saved.roomName ?? saved.room} · ${saved.date} · ${saved.time}`,
        status: 'แก้ไขแล้ว', statusBg: '#EEF0FF', statusColor: '#38419D',
        actions: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }],
        bookingId: saved.id, kind: 'booking',
      };
      await Promise.all([
        this.notificationRepository.addForAudience('approvers', base, tx),
        this.notificationRepository.addForAudience('staff', base, tx),
      ]);

      if (wantsFacility) {
        const equipList = Object.entries(facility.equipment || {}).filter(([, qty]) => qty > 0).map(([k, qty]) => `${k} ${qty}`);
        await this.notificationRepository.addForAudience('staff', {
          iconKey: 'tool', iconBg: '#EEF0FF',
          title: `${saved.user} แก้ไขคำขอสิ่งอำนวยความสะดวกเพิ่มเติม (${saved.id})`,
          subtitle: `ห้อง ${saved.roomName ?? saved.room} · ${saved.date} · ${saved.time}\n${[...equipList, ...(facility.food || [])].join(' · ')}`,
          status: 'รอ', statusBg: '#FEF3C7', statusColor: '#92400e',
          actions: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }],
          bookingId: saved.id, kind: 'facility-request',
        }, tx);
      }

      return saved;
    });

    return { success: true, booking: updated, notifiedStaff: wantsFacility };
  }
}
