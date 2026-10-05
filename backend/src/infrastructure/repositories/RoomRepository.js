import { prisma } from '../../lib/prisma.js';

// Serialized straight into the frontend's Room entity constructor shape
// ({ id, name, cap, status, floor, colorHue, equipment }) — see the schema
// comment for why the DB columns (capacity) are named natively while the
// API shape uses the frontend's abbreviations.
function serialize(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, cap: row.capacity, status: row.status,
    floor: row.floor, colorHue: row.colorHue, equipment: row.equipment,
  };
}

export class RoomRepository {
  async getAll({ query, status, activeOnly } = {}) {
    const where = {};
    if (activeOnly) where.isActive = true;
    if (status && status !== 'all') where.status = status;
    if (query) where.OR = [{ name: { contains: query } }, { id: { contains: query } }];
    const rows = await prisma.room.findMany({ where, orderBy: { id: 'asc' } });
    return rows.map(serialize);
  }

  async findById(id) {
    const row = await prisma.room.findUnique({ where: { id } });
    return serialize(row);
  }

  async count({ status, activeOnly } = {}) {
    const where = {};
    if (activeOnly) where.isActive = true;
    if (status) where.status = status;
    return prisma.room.count({ where });
  }

  async add({ id, name, cap, status, floor, colorHue, equipment }) {
    const row = await prisma.room.create({
      data: { id, name, capacity: cap, status, floor, colorHue, equipment },
    });
    return serialize(row);
  }

  async update(id, changes) {
    const data = {};
    if (changes.name !== undefined) data.name = changes.name;
    if (changes.cap !== undefined) data.capacity = changes.cap;
    if (changes.status !== undefined) data.status = changes.status;
    if (changes.floor !== undefined) data.floor = changes.floor;
    if (changes.equipment !== undefined) data.equipment = changes.equipment;
    const row = await prisma.room.update({ where: { id }, data });
    return serialize(row);
  }

  async countReferences(id) {
    const [bookings, templates, classSchedules] = await Promise.all([
      prisma.booking.count({ where: { roomId: id } }),
      prisma.template.count({ where: { roomId: id } }),
      prisma.classSchedule.count({ where: { roomId: id } }),
    ]);
    return { bookings, templates, classSchedules };
  }

  async remove(id) {
    await prisma.room.delete({ where: { id } });
  }
}
