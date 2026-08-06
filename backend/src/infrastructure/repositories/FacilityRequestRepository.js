import { prisma } from '../../lib/prisma.js';
import { fromTimeValue } from './BookingRepository.js';

// Matches the equipment keys the frontend's booking form collects
// (BOOKING_EQUIPMENT_OPTIONS in frontend/src/shared/constants.js).
const EQUIPMENT_NAMES = { mic: 'ไมโครโฟน', wb: 'ไวท์บอร์ด', ext: 'ปลั๊กพ่วง', hdmi: 'สาย HDMI' };
const EQUIPMENT_UNITS = { mic: 'ตัว', wb: 'แผ่น', ext: 'อัน', hdmi: 'เส้น' };

export function formatEquipmentList(equipment) {
  return Object.entries(equipment || {})
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => `${EQUIPMENT_NAMES[key] || key} ${qty} ${EQUIPMENT_UNITS[key] || 'ชิ้น'}`);
}

const toDateOnly = (d) => new Date(d).toISOString().slice(0, 10);

const INCLUDE = { booking: { include: { user: { select: { name: true } } } } };

// Serialized into the frontend's FacilityRequest entity shape:
// { id, who, room, bkId, date, time, equip, food, note, submitted, st }
function serialize(row) {
  if (!row) return null;
  const { booking } = row;
  return {
    id: String(row.id),
    who: booking.user?.name ?? null,
    userId: booking.userId,
    room: String(booking.roomId),
    bkId: String(booking.id),
    date: toDateOnly(booking.bookingDate),
    time: `${fromTimeValue(booking.startTime)}-${fromTimeValue(booking.endTime)}`,
    equip: formatEquipmentList(row.equipment),
    food: row.food ?? [],
    note: row.note ?? '',
    submitted: row.createdAt,
    st: row.status,
  };
}

export class FacilityRequestRepository {
  async getAll({ status } = {}) {
    const where = {};
    if (status) where.status = status;
    const rows = await prisma.facilityRequest.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' } });
    return rows.map(serialize);
  }

  async findById(id) {
    const row = await prisma.facilityRequest.findUnique({ where: { id: Number(id) }, include: INCLUDE });
    return serialize(row);
  }

  async count({ status, userId } = {}) {
    const where = {};
    if (status) where.status = status;
    if (userId) where.booking = { userId: Number(userId) };
    return prisma.facilityRequest.count({ where });
  }

  async create(bookingId, { equipment, food, note }, client = prisma) {
    const row = await client.facilityRequest.create({
      data: { bookingId: Number(bookingId), equipment: equipment ?? {}, food: food ?? [], note, status: 'pending' },
      include: INCLUDE,
    });
    return serialize(row);
  }

  async updateStatus(id, status) {
    const row = await prisma.facilityRequest.update({ where: { id: Number(id) }, data: { status }, include: INCLUDE });
    return serialize(row);
  }
}
