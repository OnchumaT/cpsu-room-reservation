import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';

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

/**
 * Creates a booking inside a single DB transaction (booking row + bundled
 * facility request when the requester asked for equipment/food + fan-out
 * notifications to every can_approve holder when manual approval applies
 * + audit log entry). The overlap check runs first, outside the
 * transaction, as a plain read against the (room_id, booking_date,
 * start_time, end_time) index.
 */
export class CreateBookingUseCase {
  constructor({ bookingRepository, bookingSettingRepository, userRepository, notificationRepository, auditLogRepository, facilityRequestRepository }) {
    this.bookingRepository = bookingRepository;
    this.bookingSettingRepository = bookingSettingRepository;
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
    this.facilityRequestRepository = facilityRequestRepository;
  }

  async execute({ actor, roomId, date, start, end, purpose, participants, note, participatingTeachers, facility }) {
    // A Google self-signup with no role assigned yet — see
    // AuthService.loginWithGoogle. Blocked here as defense-in-depth; the
    // frontend nav already hides booking entirely for this role.
    if (actor.role === 'pending') {
      throw AppError.forbidden('บัญชีนี้ยังรอการอนุมัติจากแอดมิน ยังไม่สามารถจองห้องได้');
    }
    if (!roomId || !date || !start || !end || !purpose) {
      throw AppError.badRequest('roomId, date, start, end and purpose are required');
    }
    if (start >= end) throw AppError.badRequest('start time must be before end time');

    const setting = await this.bookingSettingRepository.get();
    const daysAhead = daysFromToday(date);
    if (daysAhead > setting.maxAdvanceDays) {
      throw AppError.badRequest(`Bookings can only be made up to ${setting.maxAdvanceDays} days in advance`);
    }

    // Facility requests may only be filed by teachers (including anyone
    // holding a can_approve management position, e.g. a head/vice-head who
    // still books rooms and requests equipment like any other teacher) —
    // enforced here too (not just at the route), since the route check
    // alone can't be trusted as the only line of defense.
    const wantsFacility = facility && hasFacilityItems(facility);
    if (wantsFacility && actor.role !== 'teacher' && !(await this.userRepository.canApprove(actor.id))) {
      throw AppError.forbidden('Only teachers can request facilities when booking');
    }

    const conflict = setting.preventOverlapBooking
      ? await this.bookingRepository.findConflict({ roomId, date, start, end })
      : null;
    if (conflict) {
      throw AppError.conflict('This room is already booked for an overlapping time slot', { conflict });
    }

    const approvalMode = setting.approvalMode;
    const status = approvalMode === 'auto' ? 'approved' : 'pending';
    const approvers = status === 'pending' ? await this.userRepository.getApprovers() : [];

    const { booking, facilityRequest } = await prisma.$transaction(async (tx) => {
      const created = await this.bookingRepository.create(
        {
          userId: actor.id, roomId, role: actor.role, date, start, end, purpose,
          participants, note, participatingTeachers,
          equipment: facility?.equipment, food: facility?.food, facilityNote: facility?.facilityNote,
          status, approvalType: approvalMode,
        },
        tx,
      );

      let createdFacilityRequest = null;
      if (wantsFacility) {
        createdFacilityRequest = await this.facilityRequestRepository.create(
          created.id, { equipment: facility.equipment, food: facility.food, note: facility.facilityNote }, tx,
        );
        await this.notificationRepository.addForAudience('staff', {
          iconKey: 'tool', iconBg: '#EEF0FF',
          title: `${actor.name.split(' ')[0]} ขอสิ่งอำนวยความสะดวกเพิ่มเติม พร้อมการจองใหม่`,
          subtitle: `ห้อง ${created.room} · ${date} · ${start}-${end}\n${[...createdFacilityRequest.equip, ...createdFacilityRequest.food].join(' · ')}`,
          status: 'รอ', statusBg: '#FEF3C7', statusColor: '#92400e',
          actions: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }],
          bookingId: created.id, kind: 'facility-request',
        }, tx);
      }

      if (status === 'pending' && approvers.length) {
        await this.notificationRepository.addForAudience('approvers', {
          iconKey: 'cal', iconBg: '#FEF3C7',
          title: `${actor.name.split(' ')[0]} ขอจองห้อง ${created.room}`,
          subtitle: `${date} · ${start}-${end} · ${purpose}`,
          status: 'รออนุมัติ', statusBg: '#FEF3C7', statusColor: '#92400e',
          actions: [{ l: 'อนุมัติ', c: 'g', f: 'approve' }, { l: 'ปฏิเสธ', c: 'r', f: 'reject' }],
          bookingId: created.id, kind: 'booking',
        }, tx);
      }

      await this.auditLogRepository.create(
        { userId: actor.id, action: 'booking.create', details: { bookingId: created.id, roomId, date, start, end, status } },
        tx,
      );

      return { booking: created, facilityRequest: createdFacilityRequest };
    });

    return { success: true, booking, facilityRequest, autoApproved: status === 'approved' };
  }
}
