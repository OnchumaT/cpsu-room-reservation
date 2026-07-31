import { IRoomRepository } from '../../application/ports/IRoomRepository.js';
import { Room } from '../../domain/entities/Room.js';
import { ROOMS_SEED } from '../seed/rooms.seed.js';

export class InMemoryRoomRepository extends IRoomRepository {
  constructor(seed = ROOMS_SEED) {
    super();
    this._rooms = seed.map((r) => new Room(r));
  }

  getAll() {
    return this._rooms;
  }

  findById(id) {
    return this._rooms.find((r) => r.id === id);
  }

  add(room) {
    this._rooms.push(room);
  }

  update(id, changes) {
    const room = this.findById(id);
    if (room) room.updateDetails(changes);
  }

  remove(id) {
    const index = this._rooms.findIndex((r) => r.id === id);
    if (index > -1) this._rooms.splice(index, 1);
  }
}
