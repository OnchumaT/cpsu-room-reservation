export class INotificationRepository {
  /** @returns {import('../../domain/entities/Notification.js').Notification[]} */
  getStaffNotifications() { throw new Error('not implemented'); }

  /** @returns {import('../../domain/entities/Notification.js').Notification[]} */
  getHeadNotifications() { throw new Error('not implemented'); }

  addStaffNotification(_notification) { throw new Error('not implemented'); }

  addHeadNotification(_notification) { throw new Error('not implemented'); }

  /** searches both lists by id, mirroring the old doSA() lookup */
  findById(_id) { throw new Error('not implemented'); }

  /** @returns {object[]} read-only summary items, no actions */
  getAdminNotifications() { throw new Error('not implemented'); }

  /** @returns {object[]} read-only summary items, no actions */
  getTeacherNotifications() { throw new Error('not implemented'); }

  /** @returns {object[]} read-only summary items, no actions */
  getStudentNotifications() { throw new Error('not implemented'); }

  addTeacherNotification(_notification) { throw new Error('not implemented'); }

  addStudentNotification(_notification) { throw new Error('not implemented'); }
}
