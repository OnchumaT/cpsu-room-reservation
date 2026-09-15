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

  async add({ date, name }) {
    const row = await prisma.holiday.create({ data: { date: new Date(date), name } });
    return serialize(row);
  }

  async remove(id) {
    await prisma.holiday.delete({ where: { id: Number(id) } });
  }
}
