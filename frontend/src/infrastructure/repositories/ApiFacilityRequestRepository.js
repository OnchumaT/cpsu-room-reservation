import { FacilityRequest } from '../../domain/entities/FacilityRequest.js';

export function createFacilityRequestRepository({ apiClient }) {
  let cache = [];

  async function refresh({ status } = {}) {
    const { facilityRequests } = await apiClient.get('/facility-requests', { status });
    cache = facilityRequests.map((r) => new FacilityRequest(r));
    return cache;
  }

  function getAll() {
    return cache;
  }

  function findById(id) {
    return cache.find((r) => r.id === id);
  }

  async function accept(id) {
    const { facilityRequest } = await apiClient.post(`/facility-requests/${id}/accept`);
    const entity = new FacilityRequest(facilityRequest);
    cache = cache.map((r) => (r.id === id ? entity : r));
    return entity;
  }

  async function markDone(id) {
    const { facilityRequest } = await apiClient.post(`/facility-requests/${id}/done`);
    const entity = new FacilityRequest(facilityRequest);
    cache = cache.map((r) => (r.id === id ? entity : r));
    return entity;
  }

  async function markNotDone(id) {
    const { facilityRequest } = await apiClient.post(`/facility-requests/${id}/not-done`);
    const entity = new FacilityRequest(facilityRequest);
    cache = cache.map((r) => (r.id === id ? entity : r));
    return entity;
  }

  return { refresh, getAll, findById, accept, markDone, markNotDone };
}
