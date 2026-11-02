import { prisma } from '../../lib/prisma.js';
import { fromTimeValue } from './BookingRepository.js';

// Names/units come from the equipment table (deleted items included, so
// old requests still read right) — `labels` is { key: { name, unit } }.
export function formatEquipmentList(equipment, labels = {}) {
  return Object.entries(equipment || {})
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => `${labels[key]?.name || key} ${qty} ${labels[key]?.unit || 'ชิ้น'}`);
}

async function equipmentLabels() {
  const rows = await prisma.equipment.findMany({ select: { key: true, name: true, unit: true } });
  return Object.fromEntries(rows.map((r) => [r.key, { name: r.name, unit: r.unit }]));
}

const toDateOnly = (d) => new Date(d).toISOString().slice(0, 10);

const INCLUDE = { booking: { include: { user: { select: { name: true } } } } };

// Serialized into the frontend's FacilityRequest entity shape:
// { id, who, room, bkId, date, time, equip, food, note, submitted, st }
function serialize(row, labels) {
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
    equip: formatEquipmentList(row.equipment, labels),
    // Older rows say "ข้าวผัด ×4"; shown as "ข้าวผัด จำนวน 4" like new ones.
    food: (row.food ?? []).map((f) => String(f).replace(/\s*×\s*(\d+)\s*$/, ' จำนวน $1')),
    note: row.note ?? '',
    submitted: row.createdAt,
    st: row.status,
    // Same as the booking's: every day of a multi-day booking has its own
    // request (Staff prepare each day), shown as one row in the queue.
    groupId: booking.groupId ?? null,
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
    const labels = await equipmentLabels();
    return rows.map((row) => serialize(row, labels));
  }

  async findById(id) {
    const row = await prisma.facilityRequest.findUnique({ where: { id: Number(id) }, include: INCLUDE });
    return serialize(row, await equipmentLabels());
  }

  /** A multi-day booking's requests count once — the queue shows them as one row. */
  async count({ status, userId } = {}) {
    const where = { ...HIDE_ORPHANED_OPEN };
    if (status) where.status = status;
    if (userId) where.booking = { userId: Number(userId) };
    const rows = await prisma.facilityRequest.findMany({ where, select: { id: true, booking: { select: { groupId: true } } } });
    return new Set(rows.map((r) => r.booking.groupId || `r${r.id}`)).size;
  }

  /** Every request of a multi-day booking (one per day), earliest day first. */
  async findByGroup(groupId) {
    if (!groupId) return [];
    const rows = await prisma.facilityRequest.findMany({
      where: { ...HIDE_ORPHANED_OPEN, booking: { groupId } },
      include: INCLUDE,
      orderBy: { booking: { bookingDate: 'asc' } },
    });
    const labels = await equipmentLabels();
    return rows.map((row) => serialize(row, labels));
  }

  async create(bookingId, { equipment, food, note }, client = prisma) {
    const row = await client.facilityRequest.create({
      data: { bookingId: Number(bookingId), equipment: equipment ?? {}, food: food ?? [], note, status: 'pending' },
      include: INCLUDE,
    });
    return serialize(row, await equipmentLabels());
  }

  async updateStatus(id, status) {
    const row = await prisma.facilityRequest.update({ where: { id: Number(id) }, data: { status }, include: INCLUDE });
    return serialize(row, await equipmentLabels());
  }

  /**
   * Candidates for jobs/facilityRequestReminderJob.js's day-before check —
   * still pending, not yet reminded, tied to a booking happening tomorrow
   * that is approved OR still awaiting approval (Staff may need to get the
   * items ready before the decision lands).
   * "Tomorrow" is the Thai calendar day (UTC+7) — bookingDate is stored as
   * UTC midnight of that date, and a plain UTC "today" would still be
   * yesterday between 00:00 and 07:00 Thai time.
   * Returns raw rows (booking/user included) rather than serialize()'d
   * ones — this is for internal job use, not an API response.
   */
  async findApproachingUnreminded() {
    const thaiNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const todayStart = new Date(Date.UTC(thaiNow.getUTCFullYear(), thaiNow.getUTCMonth(), thaiNow.getUTCDate()));
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000 - 1);
    return prisma.facilityRequest.findMany({
      where: {
        status: 'pending',
        staffReminderSentAt: null,
        booking: { status: { in: ['pending', 'approved'] }, bookingDate: { gte: tomorrowStart, lte: tomorrowEnd } },
      },
      include: { booking: { include: { user: { select: { name: true } } } } },
    });
  }

  async markStaffReminderSent(id) {
    return prisma.facilityRequest.update({ where: { id: Number(id) }, data: { staffReminderSentAt: new Date() } });
  }
}
