import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';
import { assertSlotAligned } from '../../../domain/policies/TimeSlotPolicy.js';
import { isOutOfHours } from '../../../domain/policies/OfficeHoursPolicy.js';
import { formatDateDMY } from '../../../utils/dateFormat.js';

const hasFacilityItems = ({ equipment, food }) => (
  Object.values(equipment || {}).some((v) => v > 0) || (food || []).length > 0
);

// Days between the server's local "today" and a plain "YYYY-MM-DD" booking
// date — computed via UTC-normalized midnights so DST/timezone offsets
// can't shift the count by a day.
function daysFromToday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - todayUTC) / 86400000);
}

/** Edits a pending booking's date/time/title/note (+ facility ask, teacher/approver-only). */
export class EditBookingUseCase {
  constructor({ bookingRepository, notificationRepository, userRepository, bookingSettingRepository, holidayRepository, timetableRepository }) {
    this.timetableRepository = timetableRepository;
    this.bookingRepository = bookingRepository;
    this.holidayRepository = holidayRepository;
    this.notificationRepository = notificationRepository;
    this.userRepository = userRepository;
    this.bookingSettingRepository = bookingSettingRepository;
  }

  async execute({ bookingId, actor, date, start, end, title, note, facility }) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking not found');
    if (booking.userId !== actor.id) throw AppError.forbidden('You can only edit your own bookings');
    if (booking.status !== 'pending') throw AppError.badRequest('Only pending bookings can be edited');
    if (!date || !start || !end || !title) throw AppError.badRequest('date, start, end and title are required');
    if (start >= end) throw AppError.badRequest('start time must be before end time');
    assertSlotAligned(start, end);

    const maxAdvanceDays = await this.bookingSettingRepository.getMaxAdvanceDays();
    if (daysFromToday(date) > maxAdvanceDays) {
      throw AppError.badRequest(`Bookings can only be made up to ${maxAdvanceDays} days in advance`);
    }

    const holiday = await this.holidayRepository.findByDate(date);
    const outOfHours = isOutOfHours({ date, start, end, isHoliday: Boolean(holiday) });
    if (outOfHours && (!booking.roomResponsibleName || !booking.roomResponsiblePhone)) {
      throw AppError.badRequest('การจองนอกเวลาทำการต้องระบุผู้รับผิดชอบเปิด-ปิดห้องและเบอร์ติดต่อ');
    }

    const wantsFacility = facility && hasFacilityItems(facility)
      && (actor.role === 'teacher' || await this.userRepository.canApprove(actor.id));

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${booking.room} FOR UPDATE`;
      const setting = await this.bookingSettingRepository.get();
      if (setting.preventOverlapBooking) {
        const conflict = await this.bookingRepository.findConflict({ roomId: booking.roomId, date, start, end, excludeBookingId: bookingId }, tx);
        if (conflict) throw AppError.conflict('This room is already booked for an overlapping time slot', { conflict });
      }
      const classSession = (await this.timetableRepository.sessionConflicts({ roomId: booking.roomId, date: date, start: start, end: end }))[0];
      if (classSession) throw AppError.conflict('ห้องนี้มีคาบเรียนในช่วงเวลานี้', { conflict: null, classSession });

      const changes = { date, start, end, title, note, isOutOfHours: outOfHours };
      if (wantsFacility) {
        changes.equipment = facility.equipment;
        changes.food = facility.food;
        changes.facilityNote = facility.facilityNote;
      }
      const saved = await this.bookingRepository.update(bookingId, changes, tx);

      const base = {
        iconKey: 'cal', iconBg: '#EEF0FF',
        title: `${saved.user} แก้ไขการจอง ${saved.id}`,
        subtitle: `ห้อง ${saved.room} · ${formatDateDMY(saved.date)} · ${saved.time}`,
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
          subtitle: `ห้อง ${saved.room} · ${formatDateDMY(saved.date)} · ${saved.time}\n${[...equipList, ...(facility.food || [])].join(' · ')}`,
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
