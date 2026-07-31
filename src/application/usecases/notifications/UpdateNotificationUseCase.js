/** Replaces the old doSA(id, fn) — applies an action to a Staff/Head notification. */
export class UpdateNotificationUseCase {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  execute({ notificationId, action }) {
    const notification = this.notificationRepository.findById(notificationId);
    if (!notification) return { success: false };
    notification.applyAction(action);
    return { success: true, notification };
  }
}
