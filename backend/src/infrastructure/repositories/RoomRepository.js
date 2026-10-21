import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';

const INCLUDE_BUILDING = { building: true };

// Serialized straight into the frontend's Room entity constructor shape
// ({ id, name, cap, status, floor, colorHue, equipment, building }) — see
// the schema comment for why the DB columns (capacity) are named natively
// while the API shape uses the frontend's abbreviations. `building` is the
// joined row (or null, if the room isn't assigned to one yet), not just
// the raw buildingId, so the frontend can show its name without a
// separate lookup.
function serialize(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, cap: row.capacity, status: row.status,
    floor: row.floor, colorHue: row.colorHue, equipment: row.equipment,
    building: row.building ? { id: row.building.id, name: row.building.name } : null,
  };
}

export class RoomRepository {
  async getAll({ query, status, activeOnly, buildingId } = {}) {
    const where = {};
    if (activeOnly) where.isActive = true;
    if (status && status !== 'all') where.status = status;
    if (buildingId && buildingId !== 'all') where.buildingId = Number(buildingId);
    if (query) where.OR = [{ name: { contains: query } }, { id: { contains: query } }];
    const rows = await prisma.room.findMany({ where, include: INCLUDE_BUILDING, orderBy: { id: 'asc' } });
    return rows.map(serialize);
  }

  async findById(id) {
    const row = await prisma.room.findUnique({ where: { id }, include: INCLUDE_BUILDING });
    return serialize(row);
  }

  /** The secret in the room's check-in QR code — created the first time it's asked for. */
  async getCheckInToken(id) {
    const row = await prisma.room.findUnique({ where: { id }, select: { checkInToken: true } });
    if (!row) return null;
    if (row.checkInToken) return row.checkInToken;
    const token = crypto.randomBytes(12).toString('hex');
    await prisma.room.update({ where: { id }, data: { checkInToken: token } });
    return token;
  }

  async checkInTokenMatches(id, token) {
    if (!token) return false;
    const row = await prisma.room.findUnique({ where: { id }, select: { checkInToken: true } });
    return Boolean(row?.checkInToken) && row.checkInToken === String(token);
  }

  async count({ status, activeOnly } = {}) {
    const where = {};
    if (activeOnly) where.isActive = true;
    if (status) where.status = status;
    return prisma.room.count({ where });
  }

  async add({ id, name, cap, status, floor, colorHue, equipment, buildingId }) {
    const row = await prisma.room.create({
      data: { id, name, capacity: cap, status, floor, colorHue, equipment, buildingId: buildingId ?? null },
      include: INCLUDE_BUILDING,
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
    if (changes.buildingId !== undefined) data.buildingId = changes.buildingId;
    const row = await prisma.room.update({ where: { id }, data, include: INCLUDE_BUILDING });
    return serialize(row);
  }

  async countReferences(id) {
    const [bookings, templates, classSchedules, clashAttempts] = await Promise.all([
      prisma.booking.count({ where: { roomId: id } }),
      prisma.template.count({ where: { roomId: id } }),
      prisma.classSchedule.count({ where: { roomId: id } }),
      prisma.clashAttempt.count({ where: { roomId: id } }),
    ]);
    return { bookings, templates, classSchedules, clashAttempts };
  }

  async remove(id) {
    await prisma.room.delete({ where: { id } });
  }
}
