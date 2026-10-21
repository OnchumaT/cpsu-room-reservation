import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';
import { isOutOfHours } from '../../../domain/policies/OfficeHoursPolicy.js';
import { assertSlotAligned } from '../../../domain/policies/TimeSlotPolicy.js';
import { isValidParticipants } from '../../../domain/policies/ParticipantsPolicy.js';
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

/**
 * Creates a booking inside a single DB transaction (booking row + bundled
 * facility request when the requester asked for equipment/food + fan-out
 * notifications to every can_approve holder when manual approval applies
 * + audit log entry). The overlap check runs first, outside the
 * transaction, as a plain read against the (room_id, booking_date,
 * start_time, end_time) index.
 */
export class CreateBookingUseCase {
  constructor({ bookingRepository, bookingSettingRepository, userRepository, notificationRepository, auditLogRepository, facilityRequestRepository, holidayRepository, timetableRepository, clashAttemptRepository }) {
    this.clashAttemptRepository = clashAttemptRepository;
    this.timetableRepository = timetableRepository;
    this.bookingRepository = bookingRepository;
    this.bookingSettingRepository = bookingSettingRepository;
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
    this.auditLogRepository = auditLogRepository;
    this.facilityRequestRepository = facilityRequestRepository;
    this.holidayRepository = holidayRepository;
  }

  async execute({ actor, roomId, date, start, end, purpose, participants, note, participatingTeachers, bookingForStudents, facility, roomResponsible }) {
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
    if (!isValidParticipants(participants)) throw AppError.badRequest('participants must be a whole number of at least 1');
    assertSlotAligned(start, end);

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

    // "Booking on behalf of a student" is a teacher-only concept — the
    // booking still belongs to the teacher (role/userId above), this just
    // records who it's actually for.
    const wantsBookingForStudents = Array.isArray(bookingForStudents) && bookingForStudents.length > 0;
    if (wantsBookingForStudents && actor.role !== 'teacher' && !(await this.userRepository.canApprove(actor.id))) {
      throw AppError.forbidden('Only teachers can book on behalf of a student');
    }

    // Who opens/closes the room — the booker themselves, or someone else
    // (name+phone required in that case). Validated here, not the DB.
    const responsibleType = roomResponsible?.type === 'other' ? 'other' : 'self';
    if (responsibleType === 'other' && (!roomResponsible?.name?.trim() || !roomResponsible?.phone?.trim())) {
      throw AppError.badRequest('กรุณาระบุชื่อและเบอร์โทรของผู้เปิด-ปิดห้อง');
    }

    // Out-of-hours (Sat/Sun, a holiday, or any part outside 08:30-16:30
    // window on a weekday) stays pending for everyone but a head/vice-head:
    // the Dean must permit it first (Staff records that —
    // RecordFacultyResultUseCase), and only then may a head/vice-head approve
    // it, even in auto mode — see OfficeHoursPolicy.
    const holiday = await this.holidayRepository.findByDate(date);
    const outOfHours = isOutOfHours({ date, start, end, isHoliday: Boolean(holiday) });
    const responsibleName = roomResponsible?.name?.trim() || null;
    const responsiblePhone = roomResponsible?.phone?.trim() || null;
    if (outOfHours && (!responsibleName || !responsiblePhone)) {
      throw AppError.badRequest('การจองนอกเวลาทำการต้องระบุผู้รับผิดชอบเปิด-ปิดห้องและเบอร์ติดต่อ');
    }

    const approvalMode = setting.approvalMode;
    // A department head/vice-head is the one who would approve this anyway, so
    // their own bookings — in or out of hours — are approved on the spot and
    // recorded as approved by themselves; Staff only sends the Dean an FYI
    // memo for out-of-hours ones. Everyone else follows the department's
    // approval mode, and their out-of-hours bookings wait for the Dean.
    const isDepartmentApprover = await this.userRepository.canApproveAtLevel(actor.id, 'department');
    const status = isDepartmentApprover || (approvalMode === 'auto' && !outOfHours) ? 'approved' : 'pending';
    const selfApproved = isDepartmentApprover;
    // Out-of-hours: approvers hear about it only once the Dean has permitted it.
    const approvers = status === 'pending' && !outOfHours ? await this.userRepository.getApprovers({ level: 'department' }) : [];

    // Recorded outside the transaction: the room row is locked inside it, and a write that
    // references that room from another connection would wait on that lock.
    const { booking, facilityRequest } = await prisma.$transaction(async (tx) => {
      // Serializes concurrent bookings for the same room so the overlap check
      // below can't race with another request that is also inserting.
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${roomId} FOR UPDATE`;
      const conflict = setting.preventOverlapBooking
        ? await this.bookingRepository.findConflict({ roomId, date, start, end }, tx)
        : null;
      if (conflict) {
        throw AppError.conflict('This room is already booked for an overlapping time slot', { conflict });
      }
      const classSession = (await this.timetableRepository.sessionConflicts({ roomId: roomId, date: date, start: start, end: end }))[0];
      if (classSession) throw AppError.conflict('ห้องนี้มีคาบเรียนในช่วงเวลานี้', { conflict: null, classSession });

      const created = await this.bookingRepository.create(
        {
          userId: actor.id, roomId, role: actor.role, date, start, end, purpose,
          participants, note, participatingTeachers,
          bookingForStudents: wantsBookingForStudents ? bookingForStudents : [],
          equipment: facility?.equipment, food: facility?.food, facilityNote: facility?.facilityNote,
          status, approvalType: approvalMode, isOutOfHours: outOfHours,
          ...(selfApproved ? { approvedBy: actor.id, approvedAt: new Date() } : {}),
          roomResponsibleType: responsibleType,
          roomResponsibleName: responsibleName,
          roomResponsiblePhone: responsiblePhone,
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
          subtitle: `ห้อง ${created.room} · ${formatDateDMY(date)} · ${start}-${end}\n${[...createdFacilityRequest.equip, ...createdFacilityRequest.food].join(' · ')}`,
          status: 'รอ', statusBg: '#FEF3C7', statusColor: '#92400e',
          actions: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }],
          bookingId: created.id, kind: 'facility-request',
        }, tx);
      }

      if (status === 'pending' && approvers.length) {
        await this.notificationRepository.addForAudience('approvers', {
          iconKey: 'cal', iconBg: '#FEF3C7',
          title: `${actor.name.split(' ')[0]} ขอจองห้อง ${created.room}`,
          subtitle: `${formatDateDMY(date)} · ${start}-${end} · ${purpose}`,
          status: 'รออนุมัติ', statusBg: '#FEF3C7', statusColor: '#92400e',
          actions: [{ l: 'อนุมัติ', c: 'g', f: 'approve' }, { l: 'ปฏิเสธ', c: 'r', f: 'reject' }],
          bookingId: created.id, kind: 'booking',
        }, tx);
      }

      if (outOfHours && status === 'approved') {
        // Head/vice-head's own out-of-hours booking — already approved; the Dean is only informed.
        await this.notificationRepository.addForAudience('staff', {
          iconKey: 'file', iconBg: '#EEF0FF',
          title: `การจองห้อง ${created.room} นอกเวลาราชการ อนุมัติแล้ว (หัวหน้า/รองหัวหน้าภาค)`,
          subtitle: `${actor.name} · ${formatDateDMY(date)} · ${start}-${end} · ${purpose} · โปรดพิมพ์บันทึกข้อความแจ้งคณบดีทราบ`,
          bookingId: created.id, kind: 'booking',
        }, tx);
      } else if (outOfHours) {
        await this.notificationRepository.addForAudience('staff', {
          iconKey: 'file', iconBg: '#FEF3C7',
          title: `การจองห้อง ${created.room} นอกเวลาราชการ รอคณบดีอนุญาต`,
          subtitle: `${actor.name} · ${formatDateDMY(date)} · ${start}-${end} · ${purpose} · โปรดพิมพ์บันทึกข้อความขออนุญาตคณบดี แล้วบันทึกผล`,
          status: 'รอคณบดี', statusBg: '#FEF3C7', statusColor: '#92400e',
          bookingId: created.id, kind: 'booking',
        }, tx);
      }

      await this.auditLogRepository.create(
        { userId: actor.id, action: 'booking.create', details: { bookingId: created.id, roomId, date, start, end, status, outOfHours } },
        tx,
      );

      return { booking: created, facilityRequest: createdFacilityRequest };
    }).catch(async (err) => {
      if (err?.details?.conflict) {
        await this.clashAttemptRepository.record({ userId: actor.id, roomId, date, start, end }).catch(() => {});
      }
      throw err;
    });

    return { success: true, booking, facilityRequest, autoApproved: status === 'approved' };
  }
}
