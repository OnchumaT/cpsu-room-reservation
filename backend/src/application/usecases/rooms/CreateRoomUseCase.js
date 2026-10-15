import { AppError } from '../../../utils/AppError.js';

// The 5 original rooms' hand-curated colors (frontend/src/shared/roomColors.js's
// ROOM_COLORS), by hue — new rooms are kept visually distinct from these too,
// not just from each other.
const CURATED_HUES = [217, 160, 38, 271, 350];
const GOLDEN_ANGLE = 137.508;

function angularDist(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Golden-angle spacing gives well-distributed hues for any n without ever
// needing to know a total room count in advance. Separation requirement
// degrades (25°→...→5°) so this always terminates with *something*
// reasonable even once the room list is dense enough that no hue is a
// full 25° from everything already taken.
export function pickRoomHue(existingHues) {
  const taken = [...CURATED_HUES, ...existingHues];
  for (let minSep = 25; minSep >= 5; minSep -= 5) {
    for (let n = 0; n < 72; n += 1) {
      const candidate = (n * GOLDEN_ANGLE) % 360;
      if (taken.every((h) => angularDist(h, candidate) >= minSep)) return Math.round(candidate);
    }
  }
  return Math.round((existingHues.length * GOLDEN_ANGLE) % 360);
}

export function isValidCap(cap) {
  return Number.isInteger(Number(cap)) && Number(cap) >= 1;
}

export class CreateRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ id, cap, floor, status, buildingId }) {
    if (!id?.trim()) throw AppError.badRequest('Room id is required');
    if (cap != null && !isValidCap(cap)) throw AppError.badRequest('cap must be a whole number of at least 1');
    if (await this.roomRepository.findById(id)) throw AppError.conflict(`Room ${id} already exists`);
    const rooms = await this.roomRepository.getAll();
    const colorHue = pickRoomHue(rooms.map((r) => r.colorHue).filter((h) => h != null));
    const room = await this.roomRepository.add({
      id: id.trim(), name: `ห้อง ${id.trim()}`, cap: cap || 20, floor: floor || 6,
      status: status || 'available', colorHue, buildingId: buildingId ? Number(buildingId) : null,
    });
    return { success: true, room };
  }
}
