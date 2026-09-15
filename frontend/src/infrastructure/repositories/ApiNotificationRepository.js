import { Notification } from '../../domain/entities/Notification.js';

// Restructured from the frontend prototype's 5 separate role-inbox
// methods (getStaffNotifications/getHeadNotifications/...): the backend
// broadcasts per-audience too, but a real logged-in user only ever has
// ONE role, so there's only ever "my inbox" (own role) plus, for anyone
// holding a can_approve management position, the shared "approvers"
// inbox — fetched separately since not everyone is allowed to see it.
export function createNotificationRepository({ apiClient }) {
  let ownCache = [];
  let approverCache = [];

  async function refresh() {
    const { notifications } = await apiClient.get('/notifications');
    ownCache = notifications.map((n) => new Notification(n));
    return ownCache;
  }

  async function refreshApproverInbox() {
    const { notifications } = await apiClient.get('/notifications', { scope: 'approvers' });
    approverCache = notifications.map((n) => new Notification(n));
    return approverCache;
  }

  function getAll() {
    return ownCache;
  }

  function getApproverInbox() {
    return approverCache;
  }

  function findById(id) {
    return [...ownCache, ...approverCache].find((n) => String(n.id) === String(id));
  }

  async function applyAction(id, action) {
    const { notification } = await apiClient.post(`/notifications/${id}/action`, { action });
    const entity = new Notification(notification);
    const patch = (list) => list.map((n) => (String(n.id) === String(id) ? entity : n));
    ownCache = patch(ownCache);
    approverCache = patch(approverCache);
    return entity;
  }

  return { refresh, refreshApproverInbox, getAll, getApproverInbox, findById, applyAction };
}
