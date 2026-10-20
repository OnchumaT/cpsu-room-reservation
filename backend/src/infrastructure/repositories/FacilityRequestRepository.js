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
    // Older rows say "ข้าวผัด ×4"; shown as "ข้าวผัด จำนวน 4" like new ones.
    food: (row.food ?? []).map((f) => String(f).replace(/\s*×\s*(\d+)\s*$/, ' จำนวน $1')),
    note: row.note ?? '',
    submitted: row.createdAt,
    st: row.status,
  };
}

// A request still open (pending/accepted) whose booking was cancelled,
// rejected or expired has nothing left to prepare — left out of the queue
// and its counts. Closed ones stay visible as history.
const HIDE_ORPHANED_OPEN = {
  NOT: { status: { in: ['pending', 'accepted'] }, booking: { status: { notIn: ['pending', 'approved'] } } },
};

export class FacilityRequestRepository {
  async getAll({ status } = {}) {
    const where = { ...HIDE_ORPHANED_OPEN };
    if (status) where.status = status;
    // Soonest booking first, not newest-submitted first — a request filed
    // months ahead for an event happening tomorrow needs to surface above
    // one filed yesterday for an event next month, so Staff can always
    // tell what to prepare next just by scanning top-down.
    const rows = await prisma.facilityRequest.findMany({
      where, include: INCLUDE,
      orderBy: [{ booking: { bookingDate: 'asc' } }, { booking: { startTime: 'asc' } }],
    });
    return rows.map(serialize);
  }

  async findById(id) {
    const row = await prisma.facilityRequest.findUnique({ where: { id: Number(id) }, include: INCLUDE });
    return serialize(row);
  }

  async count({ status, userId } = {}) {
    const where = { ...HIDE_ORPHANED_OPEN };
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

  /**
   * Candidates for jobs/facilityRequestReminderJob.js's day-before check —
   * still pending, not yet reminded, tied to an approved booking happening
   * tomorrow. Returns raw rows (booking/user included) rather than
   * serialize()'d ones — this is for internal job use, not an API response.
   */
  async findApproachingUnreminded() {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000 - 1);
    return prisma.facilityRequest.findMany({
      where: {
        status: 'pending',
        staffReminderSentAt: null,
        booking: { status: 'approved', bookingDate: { gte: tomorrowStart, lte: tomorrowEnd } },
      },
      include: { booking: { include: { user: { select: { name: true } } } } },
    });
  }

  async markStaffReminderSent(id) {
    return prisma.facilityRequest.update({ where: { id: Number(id) }, data: { staffReminderSentAt: new Date() } });
  }
}
