import crypto from 'node:crypto';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../utils/AppError.js';
import { isOutOfHours } from '../../../domain/policies/OfficeHoursPolicy.js';
import { assertSlotAligned } from '../../../domain/policies/TimeSlotPolicy.js';
import { isValidParticipants } from '../../../domain/policies/ParticipantsPolicy.js';
import { formatDateSpan } from '../../../utils/dateFormat.js';
import { bookingDates, spanDays, MAX_BOOKING_DAYS } from '../../../domain/policies/MultiDayBookingPolicy.js';

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
 * Creates a booking (or, for a start–end date range, one booking per day
 * sharing a groupId) inside a single DB transaction (booking row + bundled
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

  async execute({ actor, roomId, date, endDate, skipNonWorkingDays, start, end, purpose, participants, note, participatingTeachers, bookingForStudents, facility, roomResponsible }) {
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

    // Multi-day: the same room and time on every date from `date` to
    // `endDate` — one row per day, tied together by a groupId (see
    // MultiDayBookingPolicy). No endDate (or endDate === date) is the
    // ordinary single-day booking.
    const lastDate = endDate || date;
    if (lastDate < date) throw AppError.badRequest('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
    if (spanDays(date, lastDate) > MAX_BOOKING_DAYS) {
      throw AppError.badRequest(`จองต่อเนื่องได้ไม่เกิน ${MAX_BOOKING_DAYS} วัน`);
    }

    const setting = await this.bookingSettingRepository.get();
    if (daysFromToday(lastDate) > setting.maxAdvanceDays) {
      throw AppError.badRequest(`Bookings can only be made up to ${setting.maxAdvanceDays} days in advance`);
    }

    const holidayDates = await this.holidayRepository.datesInRange(date, lastDate);
    const dates = bookingDates({ date, endDate: lastDate, skipNonWorkingDays: Boolean(skipNonWorkingDays), holidayDates });
    if (!dates.length) throw AppError.badRequest('ช่วงวันที่เลือกไม่มีวันทำการ');
    const isMultiDay = dates.length > 1;
    const groupId = isMultiDay ? crypto.randomUUID() : null;
    const span = formatDateSpan(dates);

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
    // window on a weekday) always stays pending: the Dean must permit it
    // first (Staff records that — RecordFacultyResultUseCase), and only then
    // may a head/vice-head approve it, even in auto mode — see OfficeHoursPolicy.
    // Decided per day: a multi-day booking can mix in-hours and out-of-hours days.
    const holidaySet = new Set(holidayDates);
    const days = dates.map((d) => ({ date: d, outOfHours: isOutOfHours({ date: d, start, end, isHoliday: holidaySet.has(d) }) }));
    const anyOutOfHours = days.some((d) => d.outOfHours);
    const responsibleName = roomResponsible?.name?.trim() || null;
    const responsiblePhone = roomResponsible?.phone?.trim() || null;
    if (anyOutOfHours && (!responsibleName || !responsiblePhone)) {
      throw AppError.badRequest('การจองนอกเวลาทำการต้องระบุผู้รับผิดชอบเปิด-ปิดห้องและเบอร์ติดต่อ');
    }

    const approvalMode = setting.approvalMode;
    // A department head/vice-head is the one who would approve this anyway, so
    // their own in-hours bookings are approved on the spot and recorded as
    // approved by themselves (out-of-hours ones are, once the Dean permits).
    // Everyone else follows the department's approval mode.
    const isDepartmentApprover = await this.userRepository.canApproveAtLevel(actor.id, 'department');
    const statusFor = (outOfHours) => (!outOfHours && (isDepartmentApprover || approvalMode === 'auto') ? 'approved' : 'pending');
    // Out-of-hours: approvers hear about it only once the Dean has permitted it.
    const inHoursPending = days.filter((d) => !d.outOfHours && statusFor(false) === 'pending');
    const approvers = inHoursPending.length ? await this.userRepository.getApprovers({ level: 'department' }) : [];

    // Recorded outside the transaction: the room row is locked inside it, and a write that
    // references that room from another connection would wait on that lock.
    let clashDate = date;
    const { bookings, facilityRequest } = await prisma.$transaction(async (tx) => {
      // Serializes concurrent bookings for the same room so the overlap check
      // below can't race with another request that is also inserting.
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${roomId} FOR UPDATE`;
      // Every day must be free — a multi-day booking is made all or nothing.
      for (const day of days) {
        clashDate = day.date;
        const conflict = setting.preventOverlapBooking
          ? await this.bookingRepository.findConflict({ roomId, date: day.date, start, end }, tx)
          : null;
        if (conflict) {
          throw AppError.conflict('This room is already booked for an overlapping time slot', { conflict });
        }
        const classSession = (await this.timetableRepository.sessionConflicts({ roomId, date: day.date, start, end }))[0];
        if (classSession) throw AppError.conflict('ห้องนี้มีคาบเรียนในช่วงเวลานี้', { conflict: null, classSession, date: day.date });
      }

      const created = [];
      for (const day of days) {
        const status = statusFor(day.outOfHours);
        created.push(await this.bookingRepository.create(
          {
            userId: actor.id, roomId, role: actor.role, date: day.date, start, end, purpose,
            participants, note, participatingTeachers,
            bookingForStudents: wantsBookingForStudents ? bookingForStudents : [],
            equipment: facility?.equipment, food: facility?.food, facilityNote: facility?.facilityNote,
            status, approvalType: approvalMode, isOutOfHours: day.outOfHours,
            ...(status === 'approved' && isDepartmentApprover ? { approvedBy: actor.id, approvedAt: new Date() } : {}),
            roomResponsibleType: responsibleType,
            roomResponsibleName: responsibleName,
            roomResponsiblePhone: responsiblePhone,
            groupId,
          },
          tx,
        ));
      }
      const first = created[0];
      // Notification cards link to one day; for a multi-day booking acting on
      // that day (approve/reject/cancel) acts on the whole set.
      const firstOf = (list) => created.find((b) => list.some((d) => d.date === b.date));

      // Staff set the room up on each day, so every day gets its own request
      // in their queue — announced with a single card.
      let createdFacilityRequest = null;
      if (wantsFacility) {
        for (const b of created) {
          const fr = await this.facilityRequestRepository.create(
            b.id, { equipment: facility.equipment, food: facility.food, note: facility.facilityNote }, tx,
          );
          createdFacilityRequest ??= fr;
        }
        await this.notificationRepository.addForAudience('staff', {
          iconKey: 'tool', iconBg: '#EEF0FF',
          title: `${actor.name.split(' ')[0]} ขอสิ่งอำนวยความสะดวกเพิ่มเติม พร้อมการจองใหม่`,
          subtitle: `ห้อง ${first.room} · ${span} · ${start}-${end}\n${[...createdFacilityRequest.equip, ...createdFacilityRequest.food].join(' · ')}`,
          status: 'รอ', statusBg: '#FEF3C7', statusColor: '#92400e',
          actions: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }],
          bookingId: first.id, kind: 'facility-request',
        }, tx);
      }

      if (inHoursPending.length && approvers.length) {
        await this.notificationRepository.addForAudience('approvers', {
          iconKey: 'cal', iconBg: '#FEF3C7',
          title: `${actor.name.split(' ')[0]} ขอจองห้อง ${first.room}`,
          subtitle: `${formatDateSpan(inHoursPending.map((d) => d.date))} · ${start}-${end} · ${purpose}`,
          status: 'รออนุมัติ', statusBg: '#FEF3C7', statusColor: '#92400e',
          actions: [{ l: 'อนุมัติ', c: 'g', f: 'approve' }, { l: 'ปฏิเสธ', c: 'r', f: 'reject' }],
          bookingId: firstOf(inHoursPending).id, kind: 'booking',
        }, tx);
      }

      if (anyOutOfHours) {
        const outDays = days.filter((d) => d.outOfHours);
        await this.notificationRepository.addForAudience('staff', {
          iconKey: 'file', iconBg: '#FEF3C7',
          title: `การจองห้อง ${first.room} นอกเวลาราชการ รอคณบดีอนุญาต`,
          subtitle: `${actor.name} · ${formatDateSpan(outDays.map((d) => d.date))} · ${start}-${end} · ${purpose} · โปรดพิมพ์บันทึกข้อความขออนุญาตคณบดี แล้วบันทึกผล`,
          status: 'รอคณบดี', statusBg: '#FEF3C7', statusColor: '#92400e',
          bookingId: firstOf(outDays).id, kind: 'booking',
        }, tx);
      }

      await this.auditLogRepository.create(
        {
          userId: actor.id, action: 'booking.create',
          details: {
            bookingId: first.id, roomId, date, start, end, status: first.status, outOfHours: first.isOutOfHours,
            ...(isMultiDay ? { groupId, bookingIds: created.map((b) => b.id), dates } : {}),
          },
        },
        tx,
      );

      return { bookings: created, facilityRequest: createdFacilityRequest };
    }).catch(async (err) => {
      if (err?.details?.conflict) {
        await this.clashAttemptRepository.record({ userId: actor.id, roomId, date: clashDate, start, end }).catch(() => {});
      }
      throw err;
    });

    return {
      success: true, booking: bookings[0], bookings, facilityRequest,
      autoApproved: bookings.every((b) => b.status === 'approved'),
    };
  }
}
