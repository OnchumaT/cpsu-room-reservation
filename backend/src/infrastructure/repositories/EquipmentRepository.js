import { prisma } from '../../lib/prisma.js';

// Serialized into the frontend's shape: { key, name, unit, ic, total,
// damaged, avail } — `avail` (total - damaged) is derived here so the
// frontend never has to recompute it.
function serialize(row) {
  if (!row) return null;
  return {
    key: row.key, name: row.name, unit: row.unit, ic: row.iconKey,
    total: row.total, damaged: row.damaged, avail: row.total - row.damaged,
  };
}

export class EquipmentRepository {
  async getAll() {
    const rows = await prisma.equipment.findMany({ orderBy: { key: 'asc' } });
    return rows.map(serialize);
  }

  async findByKey(key) {
    const row = await prisma.equipment.findUnique({ where: { key } });
    return serialize(row);
  }

  async update(key, { total, damaged }) {
    const data = {};
    if (total !== undefined) data.total = total;
    if (damaged !== undefined) data.damaged = damaged;
    const row = await prisma.equipment.update({ where: { key }, data });
    return serialize(row);
  }
}
