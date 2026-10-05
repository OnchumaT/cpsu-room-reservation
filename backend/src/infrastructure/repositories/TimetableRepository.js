import { prisma } from '../../lib/prisma.js';
import { ROOM_TURNAROUND_MINUTES } from '../../domain/policies/TimeSlotPolicy.js';

const toTimeValue = (hhmm) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const timeOf = (date) => date.toISOString().slice(11, 16);
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const dateOnly = (d) => d.toISOString().slice(0, 10);

// Same rule as bookings: a session blocks the room until its end plus the turnaround, and the
// room is blocked from the session start minus the turnaround.
export function sessionBlocks(session, start, end) {
  return toMinutes(session.start) - ROOM_TURNAROUND_MINUTES < toMinutes(end)
    && toMinutes(session.end) + ROOM_TURNAROUND_MINUTES > toMinutes(start);
}

export class TimetableRepository {
  rooms() {
    return prisma.room.findMany({ select: { id: true, name: true }, orderBy: { id: 'asc' } });
  }

  async upsertSchedule(tx, { academicYear, semester, roomId, dayOfWeek, start, end, courseCode, section, importId }) {
    const where = {
      academicYear, semester, roomId, dayOfWeek,
      startTime: toTimeValue(start), endTime: toTimeValue(end), courseCode, section,
    };
    const existing = await tx.classSchedule.findFirst({ where, select: { id: true } });
    if (existing) {
      await tx.classSchedule.update({ where: { id: existing.id }, data: { importId } });
      return 'updated';
    }
    await tx.classSchedule.create({ data: { ...where, importId } });
    return 'added';
  }

  createImport(tx, data) {
    return tx.timetableImport.create({ data });
  }

  // Sessions in effect on a date: weekday matches and the date lies inside the import's term.
  // Imports without term dates never match, so they stay inert until dates are set.
  async sessionsForDate(dateStr) {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const rows = await prisma.classSchedule.findMany({
      where: {
        dayOfWeek: date.getUTCDay(),
        import: { termStartDate: { lte: date }, termEndDate: { gte: date } },
      },
      include: { room: { select: { name: true } }, import: { select: { academicYear: true, semester: true } } },
      orderBy: [{ roomId: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      roomName: r.room.name,
      start: timeOf(r.startTime),
      end: timeOf(r.endTime),
      courseCode: r.courseCode,
      section: r.section,
      academicYear: r.import.academicYear,
      semester: r.import.semester,
    }));
  }

  // Every session date within [start, end], one row per occurrence. Used by the month grid.
  async sessionsForRange(startStr, endStr) {
    const start = new Date(`${startStr}T00:00:00.000Z`);
    const end = new Date(`${endStr}T00:00:00.000Z`);
    const rows = await prisma.classSchedule.findMany({
      where: { import: { termStartDate: { lte: end }, termEndDate: { gte: start } } },
      include: { room: { select: { name: true } }, import: { select: { academicYear: true, semester: true, termStartDate: true, termEndDate: true } } },
      orderBy: [{ roomId: 'asc' }, { startTime: 'asc' }],
    });
    const out = [];
    for (const r of rows) {
      const from = Math.max(start.getTime(), r.import.termStartDate.getTime());
      const to = Math.min(end.getTime(), r.import.termEndDate.getTime());
      for (let t = from; t <= to; t += 86400000) {
        const day = new Date(t);
        if (day.getUTCDay() !== r.dayOfWeek) continue;
        out.push({
          id: r.id, date: dateOnly(day), roomId: r.roomId, roomName: r.room.name,
          start: timeOf(r.startTime), end: timeOf(r.endTime),
          courseCode: r.courseCode, section: r.section,
          academicYear: r.import.academicYear, semester: r.import.semester,
        });
      }
    }
    return out;
  }

  async sessionConflicts({ roomId, date, start, end }) {
    const sessions = await this.sessionsForDate(date);
    return sessions.filter((s) => (roomId == null || s.roomId === roomId) && sessionBlocks(s, start, end));
  }

  history(limit = 50) {
    return prisma.timetableImport.findMany({
      orderBy: { importedAt: 'desc' },
      take: limit,
      include: { importer: { select: { name: true } } },
    }).then((rows) => rows.map((r) => ({
      id: r.id,
      academicYear: r.academicYear,
      semester: r.semester,
      building: r.building,
      termStartDate: r.termStartDate ? dateOnly(r.termStartDate) : null,
      termEndDate: r.termEndDate ? dateOnly(r.termEndDate) : null,
      fileName: r.fileName,
      importedBy: r.importer.name,
      importedAt: r.importedAt,
      totalRows: r.totalRows,
      addedCount: r.addedCount,
      updatedCount: r.updatedCount,
    })));
  }

  transaction(fn) {
    return prisma.$transaction(fn, { timeout: 60000 });
  }
}
