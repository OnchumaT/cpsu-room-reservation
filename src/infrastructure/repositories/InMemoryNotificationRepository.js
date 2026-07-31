import { INotificationRepository } from '../../application/ports/INotificationRepository.js';
import { Notification } from '../../domain/entities/Notification.js';
import { STAFF_NOTIFS_SEED, HEAD_NOTIFS_SEED } from '../seed/notifications.seed.js';

export class InMemoryNotificationRepository extends INotificationRepository {
  constructor(staffSeed = STAFF_NOTIFS_SEED, headSeed = HEAD_NOTIFS_SEED) {
    super();
    this._staff = staffSeed.map((n) => new Notification(n));
    this._head = headSeed.map((n) => new Notification(n));
  }

  getStaffNotifications() {
    return this._staff;
  }

  getHeadNotifications() {
    return this._head;
  }

  addStaffNotification(notification) {
    this._staff.unshift(notification);
  }

  addHeadNotification(notification) {
    this._head.unshift(notification);
  }

  findById(id) {
    return this._staff.find((n) => n.id === id) || this._head.find((n) => n.id === id);
  }
}
