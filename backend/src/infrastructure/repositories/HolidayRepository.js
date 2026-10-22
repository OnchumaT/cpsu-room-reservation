import { prisma } from '../../lib/prisma.js';

const toDateOnly = (d) => new Date(d).toISOString().slice(0, 10);

function serialize(row) {
  if (!row) return null;
  return { id: row.id, date: toDateOnly(row.date), name: row.name };
}

export class HolidayRepository {
  async getAll() {
    const rows = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    return rows.map(serialize);
  }

  /** @param {string} dateStr 'YYYY-MM-DD' — used by OfficeHoursPolicy via CreateBookingUseCase. */
  async findByDate(dateStr) {
    const row = await prisma.holiday.findUnique({ where: { date: new Date(dateStr) } });
    return serialize(row);
  }

  /** Holiday dates ('YYYY-MM-DD') from `start` to `end` inclusive — for multi-day bookings. */
  async datesInRange(start, end) {
    const rows = await prisma.holiday.findMany({ where: { date: { gte: new Date(start), lte: new Date(end) } }, select: { date: true } });
    return rows.map((r) => toDateOnly(r.date));
  }

  async add({ date, name }) {
    const row = await prisma.holiday.create({ data: { date: new Date(date), name } });
    return serialize(row);
  }

  /** Many at once (CSV import) — dates already on file are skipped, not errors. Returns how many were added. */
  async addMany(rows) {
    const result = await prisma.holiday.createMany({
      data: rows.map(({ date, name }) => ({ date: new Date(date), name })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async remove(id) {
    await prisma.holiday.delete({ where: { id: Number(id) } });
  }
}
