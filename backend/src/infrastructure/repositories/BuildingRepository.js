import { prisma } from '../../lib/prisma.js';

function serialize(row) {
  if (!row) return null;
  return { id: row.id, name: row.name };
}

export class BuildingRepository {
  async getAll() {
    const rows = await prisma.building.findMany({ orderBy: { name: 'asc' } });
    return rows.map(serialize);
  }

  async findById(id) {
    const row = await prisma.building.findUnique({ where: { id: Number(id) } });
    return serialize(row);
  }

  async findByName(name) {
    const row = await prisma.building.findUnique({ where: { name } });
    return serialize(row);
  }

  async add({ name }) {
    const row = await prisma.building.create({ data: { name } });
    return serialize(row);
  }

  /** Rooms still pointing at this building have their building_id cleared
   * (onDelete: SetNull in the schema) rather than failing the delete. */
  async remove(id) {
    await prisma.building.delete({ where: { id: Number(id) } });
  }
}
