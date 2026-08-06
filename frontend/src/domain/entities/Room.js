// Room — pure business rules about a physical room. No DOM, no I/O.

export const ROOM_STATUS = Object.freeze({
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  PENDING: 'pending',
});

export const DEFAULT_ROOM_EQUIPMENT = Object.freeze({
  projector: 1, whiteboard: 1, ac: 2, mic: 1, tv: 1, plug: 6, sound: 1,
});

export class Room {
  constructor({ id, name, cap, status, floor, colorHue, equipment }) {
    this.id = id;
    this.name = name;
    this.cap = cap;
    this.status = status;
    this.floor = floor;
    this.colorHue = colorHue;
    this.equipment = equipment || null;
  }

  isAvailable() {
    return this.status === ROOM_STATUS.AVAILABLE;
  }

  isOccupied() {
    return this.status === ROOM_STATUS.OCCUPIED;
  }

  isBookable() {
    return this.status !== ROOM_STATUS.OCCUPIED;
  }

  getEquipment() {
    return this.equipment || DEFAULT_ROOM_EQUIPMENT;
  }

  matchesSearch(query) {
    if (!query) return true;
    return this.name.includes(query) || this.id.includes(query);
  }

  updateDetails(changes) {
    Object.assign(this, changes);
  }

  toggleStatus() {
    this.status = this.isAvailable() ? ROOM_STATUS.OCCUPIED : ROOM_STATUS.AVAILABLE;
  }
}
