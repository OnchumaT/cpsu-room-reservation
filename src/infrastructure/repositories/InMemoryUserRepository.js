import { IUserRepository } from '../../application/ports/IUserRepository.js';
import { User } from '../../domain/entities/User.js';
import { USERS_SEED } from '../seed/users.seed.js';

export class InMemoryUserRepository extends IUserRepository {
  constructor(seed = USERS_SEED) {
    super();
    this._users = seed.map((u) => new User(u));
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
