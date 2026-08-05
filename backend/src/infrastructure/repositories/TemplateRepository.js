import { prisma } from '../../lib/prisma.js';

// Serialized into the frontend's Template entity shape:
// { id, name, room, purpose, participants, note, equipment, food, facilityNote }
function serialize(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    room: String(row.roomId),
    purpose: row.purpose,
    participants: row.participants,
    note: row.note ?? '',
    equipment: row.equipment ?? {},
    food: row.food ?? [],
    facilityNote: row.facilityNote ?? '',
    participatingTeachers: row.participatingTeachers ?? [],
  };
}

// Scoped per-user (see the schema comment) — every method takes the
// caller's userId and only ever touches their own templates.
export class TemplateRepository {
  async getAllForUser(userId) {
    const rows = await prisma.template.findMany({ where: { userId: Number(userId) }, orderBy: { createdAt: 'desc' } });
    return rows.map(serialize);
  }

  async findByIdForUser(userId, id) {
    const row = await prisma.template.findFirst({ where: { userId: Number(userId), id: Number(id) } });
    return serialize(row);
  }

  async addForUser(userId, { room, name, purpose, participants, note, equipment, food, facilityNote, participatingTeachers }) {
    const row = await prisma.template.create({
      data: {
        userId: Number(userId), roomId: room, name, purpose,
        participants: participants ? Number(participants) : 10, note, equipment: equipment ?? {}, food: food ?? [], facilityNote,
        participatingTeachers: participatingTeachers ?? [],
      },
    });
    return serialize(row);
  }

  async update(id, changes) {
    const data = {};
    if (changes.name !== undefined) data.name = changes.name;
    if (changes.room !== undefined) data.roomId = changes.room;
    if (changes.purpose !== undefined) data.purpose = changes.purpose;
    if (changes.participants !== undefined) data.participants = Number(changes.participants);
    if (changes.note !== undefined) data.note = changes.note;
    if (changes.equipment !== undefined) data.equipment = changes.equipment;
    if (changes.food !== undefined) data.food = changes.food;
    if (changes.facilityNote !== undefined) data.facilityNote = changes.facilityNote;
    if (changes.participatingTeachers !== undefined) data.participatingTeachers = changes.participatingTeachers;
    const row = await prisma.template.update({ where: { id: Number(id) }, data });
    return serialize(row);
  }

  async removeForUser(userId, id) {
    await prisma.template.deleteMany({ where: { userId: Number(userId), id: Number(id) } });
  }
}
