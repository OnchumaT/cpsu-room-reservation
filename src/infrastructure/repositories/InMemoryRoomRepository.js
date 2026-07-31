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
}
