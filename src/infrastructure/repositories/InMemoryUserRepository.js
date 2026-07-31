import { IUserRepository } from '../../application/ports/IUserRepository.js';
import { USERS_SEED } from '../seed/users.seed.js';

// Consumed by the Users use-cases/view in the follow-up migration phase.
export class InMemoryUserRepository extends IUserRepository {
  constructor(seed = USERS_SEED) {
    super();
    this._users = seed.map((u) => ({ ...u }));
  }

  getAll() {
    return this._users;
  }

  findById(id) {
    return this._users.find((u) => u.id === id);
  }

  add(user) {
    this._users.push(user);
  }

  update(id, changes) {
    const user = this.findById(id);
    if (user) Object.assign(user, changes);
  }
}
