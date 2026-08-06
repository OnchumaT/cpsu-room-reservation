// One-off: assigns a guaranteed-distinct colorHue to any room that
// predates this feature and still has colorHue = NULL (the 5 curated
// rooms are expected to stay NULL forever — they use a hand-picked color
// keyed by id instead, see frontend/src/shared/roomColors.js). Safe to
// run multiple times — a no-op once every room has a hue or is curated.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { pickRoomHue } from '../src/application/usecases/rooms/CreateRoomUseCase.js';

const prisma = new PrismaClient();
const CURATED_ROOM_IDS = new Set(['1637', '1638', '1639', '1640', '1641']);

async function main() {
  const rooms = await prisma.room.findMany({ orderBy: { createdAt: 'asc' } });
  const assignedHues = rooms.map((r) => r.colorHue).filter((h) => h != null);
  const toBackfill = rooms.filter((r) => r.colorHue == null && !CURATED_ROOM_IDS.has(r.id));

  for (const room of toBackfill) {
    const colorHue = pickRoomHue(assignedHues);
    assignedHues.push(colorHue);
    await prisma.room.update({ where: { id: room.id }, data: { colorHue } });
    console.log(`  ${room.id} -> hue ${colorHue}`);
  }

  console.log(`${toBackfill.length} rooms backfilled.`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
