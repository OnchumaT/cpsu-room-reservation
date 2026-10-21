import { prisma } from '../../lib/prisma.js';

const ACTIVE_STATUSES_BLOCKING_OVERLAP = ['pending', 'approved'];

// Gap kept clear on both sides of every existing booking so staff have time
// to walk over and check the room is in order before the next one starts.
// Applied to the *existing* booking's window rather than the incoming
// request, so it holds regardless of which booking was made first.
const ROOM_TURNAROUND_BUFFER = '00:10:00';

const USER_SELECT = { id: true, name: true, email: true, role: true };

const INCLUDE = {
  user: { select: USER_SELECT },
  room: true,
  approver: { select: USER_SELECT },
};

// HH:MM (or HH:MM:SS) <-> the epoch-dated Date object Prisma uses for a
// native MySQL TIME column.
export const toTimeValue = (hhmm) => new Date(`1970-01-01T${hhmm.length === 5 ? `${hhmm}:00` : hhmm}.000Z`);
export const fromTimeValue = (date) => date.toISOString().slice(11, 16);

const toDateOnly = (d) => new Date(d).toISOString().slice(0, 10);

// Serialized straight into the frontend's Booking entity constructor
// shape ({ id, room, user, title, date, time, status, role, participants,
// note, participatingTeachers, equipment, food, facilityNote }), plus a
// few backend-internal extras (userId, roomId, approvalType, ...) that
// `new Booking(json)` simply ignores but route/use-case code still needs
// (e.g. comparing userId against the authenticated actor for ownership).
function serialize(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    room: String(row.roomId),
    roomName: row.room?.name ?? null,
    user: row.user?.name ?? null,
    title: row.purpose,
    date: toDateOnly(row.bookingDate),
    time: `${fromTimeValue(row.startTime)}-${fromTimeValue(row.endTime)}`,
    status: row.status,
    role: row.role,
    participants: row.participants,
    note: row.note ?? '',
    participatingTeachers: row.participatingTeachers ?? [],
    bookingForStudents: row.bookingForStudents ?? [],
    equipment: row.equipment ?? {},
    food: row.food ?? [],
    facilityNote: row.facilityNote ?? '',
    userId: row.userId,
    roomId: row.roomId,
    approvalType: row.approvalType,
    approvedBy: row.approvedBy,
    approvedByName: row.approver?.name ?? null,
    approvedAt: row.approvedAt,
    rejectReason: row.rejectReason,
    isOutOfHours: row.isOutOfHours,
    // Dean's permission for an out-of-hours booking, as recorded by Staff
    // (By = that Staff member) — see RecordFacultyResultUseCase.
    facultyApprovedBy: row.facultyApprovedBy,
    facultyApprovedAt: row.facultyApprovedAt,
    checkedInAt: row.checkedInAt,
    roomResponsibleType: row.roomResponsibleType,
    roomResponsibleName: row.roomResponsibleName,
    roomResponsiblePhone: row.roomResponsiblePhone,
    createdAt: row.createdAt,
  };
}

export class BookingRepository {
  /**
   * The overlap check the spec asks for — a direct, index-backed query
   * (roomId, bookingDate, startTime, endTime) rather than fetching every
   * booking for the room and filtering in JS.
   *
   * Both sides of the range comparison are wrapped in TIME(...). Without
   * it, MySQL compares a TIME column against our epoch-1970-dated bound
   * parameter by converting the TIME column to a DATETIME using *today's*
   * date — so e.g. "08:00:00" becomes "2026-08-02 08:00:00", which is
   * never < "1970-01-01 10:30:00" no matter the time of day. TIME(...)
   * forces a pure time-of-day comparison on both sides, sidestepping that
   * date-coercion entirely (verified directly against MySQL). The
   * `findFirst({ where: { lt, gt } })` query-builder form hits the exact
   * same issue, which is why this uses $queryRaw instead.
   */
  async findConflict({ roomId, date, start, end, excludeBookingId = null }, client = prisma) {
    const matches = await client.$queryRaw`
      SELECT id FROM bookings
      WHERE room_id = ${roomId}
        AND id <> ${excludeBookingId ?? 0}
        AND booking_date = ${new Date(date)}
        AND status IN (${ACTIVE_STATUSES_BLOCKING_OVERLAP[0]}, ${ACTIVE_STATUSES_BLOCKING_OVERLAP[1]})
        AND TIME(SUBTIME(start_time, ${ROOM_TURNAROUND_BUFFER})) < TIME(${toTimeValue(end)})
        AND TIME(ADDTIME(end_time, ${ROOM_TURNAROUND_BUFFER})) > TIME(${toTimeValue(start)})
      LIMIT 1
    `;
    if (!matches.length) return null;
    const row = await client.booking.findUnique({ where: { id: matches[0].id }, include: INCLUDE });
    return serialize(row);
  }

  /** Room ids with a pending/approved booking overlapping this date+range — same overlap rule as findConflict, just not scoped to one room. */
  async findConflictingRoomIds({ date, start, end }) {
    const rows = await prisma.$queryRaw`
      SELECT DISTINCT room_id FROM bookings
      WHERE booking_date = ${new Date(date)}
        AND status IN (${ACTIVE_STATUSES_BLOCKING_OVERLAP[0]}, ${ACTIVE_STATUSES_BLOCKING_OVERLAP[1]})
        AND TIME(SUBTIME(start_time, ${ROOM_TURNAROUND_BUFFER})) < TIME(${toTimeValue(end)})
        AND TIME(ADDTIME(end_time, ${ROOM_TURNAROUND_BUFFER})) > TIME(${toTimeValue(start)})
    `;
    return rows.map((r) => r.room_id);
  }

  async getAll({ roomId, userId, date, status, role } = {}) {
    const where = {};
    if (roomId) where.roomId = roomId;
    if (userId) where.userId = Number(userId);
    if (date) where.bookingDate = new Date(date);
    if (status) where.status = status;
    if (role) where.role = role;
    const rows = await prisma.booking.findMany({ where, include: INCLUDE, orderBy: { bookingDate: 'desc' } });
    return rows.map(serialize);
  }

  async findById(id, client = prisma) {
    const row = await client.booking.findUnique({ where: { id: Number(id) }, include: INCLUDE });
    return serialize(row);
  }

  async getPending() {
    const rows = await prisma.booking.findMany({ where: { status: 'pending' }, include: INCLUDE });
    return rows.map(serialize);
  }

  /** For calendar views: every booking whose date falls in [start, end], optionally scoped to one room. */
  async getInRange({ start, end, roomId, excludeArchived = false }) {
    const where = { bookingDate: { gte: new Date(start), lte: new Date(end) } };
    if (roomId) where.roomId = roomId;
    if (excludeArchived) where.isArchived = false;
    const rows = await prisma.booking.findMany({
      where, include: INCLUDE, orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map(serialize);
  }

  async create({ userId, roomId, role, date, start, end, purpose, participants, note, participatingTeachers, bookingForStudents, equipment, food, facilityNote, status, approvalType, isOutOfHours, roomResponsibleType, roomResponsibleName, roomResponsiblePhone, approvedBy, approvedAt }, client = prisma) {
    const row = await client.booking.create({
      data: {
        userId: Number(userId), roomId, role, bookingDate: new Date(date),
        startTime: toTimeValue(start), endTime: toTimeValue(end), purpose,
        participants: participants ? Number(participants) : 10, note, participatingTeachers: participatingTeachers ?? [],
        bookingForStudents: bookingForStudents ?? [],
        equipment: equipment ?? {}, food: food ?? [], facilityNote,
        status, approvalType,
        isOutOfHours: isOutOfHours ?? false,
        roomResponsibleType: roomResponsibleType ?? 'self',
        roomResponsibleName: roomResponsibleName ?? null,
        roomResponsiblePhone: roomResponsiblePhone ?? null,
        ...(approvedBy ? { approvedBy: Number(approvedBy), approvedAt: approvedAt ?? new Date() } : {}),
      },
      include: INCLUDE,
    });
    return serialize(row);
  }

  async count({ status, userId, bookingDateFrom, bookingDateTo, createdFrom, decidedFrom, excludeArchived = false } = {}) {
    const where = {};
    if (status) where.status = Array.isArray(status) ? { in: status } : status;
    if (userId) where.userId = Number(userId);
    if (bookingDateFrom || bookingDateTo) {
      where.bookingDate = {};
      if (bookingDateFrom) where.bookingDate.gte = bookingDateFrom;
      if (bookingDateTo) where.bookingDate.lte = bookingDateTo;
    }
    if (createdFrom) where.createdAt = { gte: createdFrom };
    if (decidedFrom) where.approvedAt = { gte: decidedFrom };
    if (excludeArchived) where.isArchived = false;
    return prisma.booking.count({ where });
  }

  async update(id, changes, client = prisma) {
    const data = { ...changes };
    if (data.date !== undefined) { data.bookingDate = new Date(data.date); delete data.date; }
    if (data.start !== undefined) { data.startTime = toTimeValue(data.start); delete data.start; }
    if (data.end !== undefined) { data.endTime = toTimeValue(data.end); delete data.end; }
    if (data.title !== undefined) { data.purpose = data.title; delete data.title; }
    const row = await client.booking.update({ where: { id: Number(id) }, data, include: INCLUDE });
    return serialize(row);
  }

  /** Soft-archives bookings past the retention cutoff, leaving pending ones (however unlikely at that age) untouched. */
  async archiveOlderThan(cutoffDate) {
    const result = await prisma.booking.updateMany({
      where: { bookingDate: { lt: cutoffDate }, isArchived: false, status: { notIn: ['pending'] } },
      data: { isArchived: true, archivedAt: new Date() },
    });
    return result.count;
  }

  /**
   * Candidates for jobs/reminderJob.js's 30-minutes-before check — approved,
   * not yet reminded, starting today or tomorrow (covers a booking just
   * after midnight while the job's last tick was still "today"). Returns
   * raw rows (bookingDate/startTime as Date, room included) rather than
   * serialize()'d ones — this is for internal job use, not an API response.
   */
  async findUpcomingUnreminded() {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowEnd = new Date(todayStart.getTime() + 2 * 86400000 - 1);
    return prisma.booking.findMany({
      where: { status: 'approved', reminderSentAt: null, bookingDate: { gte: todayStart, lte: tomorrowEnd } },
      include: { room: true },
    });
  }

  /**
   * Today's approved bookings (in or out of office hours) nobody has checked
   * into yet — the no-show job (jobs/noShowJob.js) decides per row whether its
   * grace period has run out. Raw rows.
   */
  async findAwaitingCheckIn(todayStart) {
    return prisma.booking.findMany({
      where: { status: 'approved', checkedInAt: null, bookingDate: todayStart },
      include: { room: true, user: { select: { name: true } } },
    });
  }

  /** Today's approved bookings of one user in one room — check-in candidates. Raw rows. */
  async findTodayForCheckIn({ userId, roomId, todayStart }) {
    return prisma.booking.findMany({
      where: { userId: Number(userId), roomId, bookingDate: todayStart, status: { in: ['approved', 'no_show'] } },
      orderBy: { startTime: 'asc' },
    });
  }

  async markReminderSent(id) {
    return prisma.booking.update({ where: { id: Number(id) }, data: { reminderSentAt: new Date() } });
  }

  /**
   * Candidates for jobs/expireBookingsJob.js — still pending, but the
   * booking's date has fully passed (by calendar day), so there's no time
   * left for anyone to decide on it. Just the id — this is for internal
   * job use, not an API response, and the job only needs it to update().
   */
  async findOverduePending() {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return prisma.booking.findMany({ where: { status: 'pending', bookingDate: { lt: todayStart } }, select: { id: true } });
  }
}
