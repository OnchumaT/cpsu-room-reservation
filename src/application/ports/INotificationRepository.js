export class INotificationRepository {
  /** @returns {import('../../domain/entities/Notification.js').Notification[]} */
  getStaffNotifications() { throw new Error('not implemented'); }

  /** @returns {import('../../domain/entities/Notification.js').Notification[]} */
  getHeadNotifications() { throw new Error('not implemented'); }

  addStaffNotification(_notification) { throw new Error('not implemented'); }

  addHeadNotification(_notification) { throw new Error('not implemented'); }

  /** searches both lists by id, mirroring the old doSA() lookup */
  findById(_id) { throw new Error('not implemented'); }
}
