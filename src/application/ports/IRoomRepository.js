export class IRoomRepository {
  /** @returns {import('../../domain/entities/Room.js').Room[]} */
  getAll() { throw new Error('not implemented'); }

  /** @returns {import('../../domain/entities/Room.js').Room|undefined} */
  findById(_id) { throw new Error('not implemented'); }

  add(_room) { throw new Error('not implemented'); }

  update(_id, _changes) { throw new Error('not implemented'); }

  remove(_id) { throw new Error('not implemented'); }
}
