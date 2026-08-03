import { Template } from '../../domain/entities/Template.js';

// Scoped server-side to the logged-in user (no role param needed
// client-side anymore — see backend/README.md for why per-user beats the
// prototype's per-role sharing).
export function createTemplateRepository({ apiClient }) {
  let cache = [];

  async function refresh() {
    const { templates } = await apiClient.get('/templates');
    cache = templates.map((t) => new Template(t));
    return cache;
  }

  function getAll() {
    return cache;
  }

  function findById(id) {
    return cache.find((t) => t.id === id);
  }

  async function save({ name, snapshot }) {
    const { template } = await apiClient.post('/templates', { name, snapshot });
    const entity = new Template(template);
    cache = [entity, ...cache];
    return entity;
  }

  async function apply(id) {
    const { draft } = await apiClient.post(`/templates/${id}/apply`);
    return draft;
  }

  async function update(id, changes) {
    const { template } = await apiClient.patch(`/templates/${id}`, changes);
    const entity = new Template(template);
    cache = cache.map((t) => (t.id === id ? entity : t));
    return entity;
  }

  async function duplicate(id) {
    const { template } = await apiClient.post(`/templates/${id}/duplicate`);
    const entity = new Template(template);
    cache = [entity, ...cache];
    return entity;
  }

  async function remove(id) {
    await apiClient.delete(`/templates/${id}`);
    cache = cache.filter((t) => t.id !== id);
  }

  return { refresh, getAll, findById, save, apply, update, duplicate, remove };
}
