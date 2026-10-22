import { prisma } from '../../lib/prisma.js';
import { bookingMoment, thaiTodayStart } from '../../utils/bookingTime.js';

// Serialized into the frontend's shape: { key, name, unit, ic, total,
// damaged, inUse, avail, deleted } — `avail` (total - damaged - inUse) is
// derived here so the frontend never has to recompute it.
function serialize(row, inUse = 0) {
  if (!row) return null;
  return {
    key: row.key, name: row.name, unit: row.unit, ic: row.iconKey,
    total: row.total, damaged: row.damaged, inUse,
    avail: Math.max(0, row.total - row.damaged - inUse),
    deleted: row.deletedAt !== null,
  };
}

// Units are held from the moment a booking asks for them until that
// booking's end time passes — so bookings made before this was tracked
// count too. "เสร็จสิ้น" on the facility request only means Staff finished
// preparing the items (often before the event), not that they came back.
// Units return early when the booking is cancelled/rejected/expired/no-show
// or Staff closes the request as not_done (nothing was handed out).
async function countInUse(client = prisma) {
  const rows = await client.facilityRequest.findMany({
    where: {
      status: { in: ['pending', 'accepted', 'done'] },
      booking: { status: { in: ['pending', 'approved'] }, bookingDate: { gte: thaiTodayStart() } },
    },
    select: { equipment: true, booking: { select: { bookingDate: true, endTime: true } } },
  });
  const now = new Date();
  const inUse = {};
  for (const { equipment, booking } of rows) {
    if (bookingMoment(booking.bookingDate, booking.endTime) <= now) continue;
    for (const [key, qty] of Object.entries(equipment || {})) {
      const n = Number(qty);
      if (n > 0) inUse[key] = (inUse[key] || 0) + n;
    }
  }
  return inUse;
}

export class EquipmentRepository {
  // Includes soft-deleted items (flagged `deleted`) so old bookings can
  // still be labelled — callers building a picker filter them out.
  async getAll() {
    const [rows, inUse] = await Promise.all([
      prisma.equipment.findMany({ orderBy: { key: 'asc' } }),
      countInUse(),
    ]);
    return rows.map((row) => serialize(row, inUse[row.key] || 0));
  }

  async findByKey(key) {
    const [row, inUse] = await Promise.all([prisma.equipment.findUnique({ where: { key } }), countInUse()]);
    return serialize(row, inUse[key] || 0);
  }

  async findActiveByName(name) {
    const row = await prisma.equipment.findFirst({ where: { name, deletedAt: null } });
    return serialize(row);
  }

  async add({ key, name, unit, iconKey, total }) {
    const row = await prisma.equipment.create({ data: { key, name, unit, iconKey, total, damaged: 0 } });
    return serialize(row);
  }

  async update(key, { total, damaged }) {
    const data = {};
    if (total !== undefined) data.total = total;
    if (damaged !== undefined) data.damaged = damaged;
    const [row, inUse] = await Promise.all([prisma.equipment.update({ where: { key }, data }), countInUse()]);
    return serialize(row, inUse[key] || 0);
  }

  async softDelete(key) {
    await prisma.equipment.update({ where: { key }, data: { deletedAt: new Date() } });
  }
}
