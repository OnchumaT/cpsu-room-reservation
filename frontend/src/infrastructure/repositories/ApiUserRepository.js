import { User } from '../../domain/entities/User.js';
import { ApiError } from '../api/ApiClient.js';

export function createUserRepository({ apiClient }) {
  let cache = [];

  async function refresh() {
    const { users } = await apiClient.get('/users');
    cache = users.map((u) => new User(u));
    return cache;
  }

  function getAll() {
    return cache;
  }

  function findById(id) {
    return cache.find((u) => u.id === id);
  }

  async function add({ name, email, role, password }) {
    try {
      const { user } = await apiClient.post('/users', { name, email, role, password });
      const entity = new User(user);
      cache = [...cache, entity];
      return { success: true, user: entity };
    } catch (err) {
      if (err instanceof ApiError) return { success: false, reason: err.message };
      throw err;
    }
  }

  async function update(id, changes) {
    const { user } = await apiClient.patch(`/users/${id}`, changes);
    const entity = new User(user);
    cache = cache.map((u) => (u.id === id ? entity : u));
    return entity;
  }

  async function toggleStatus(id) {
    const { user } = await apiClient.patch(`/users/${id}/toggle`);
    const entity = new User(user);
    cache = cache.map((u) => (u.id === id ? entity : u));
    return entity;
  }

  async function remove(id) {
    await apiClient.delete(`/users/${id}`);
    cache = cache.filter((u) => u.id !== id);
  }

  return { refresh, getAll, findById, add, update, toggleStatus, remove };
}
