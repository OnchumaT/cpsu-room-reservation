/** Applies an action (approve/reject/accept/done) to a notification with acts. */
export class UpdateNotificationUseCase {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  async execute({ notificationId, action }) {
    const notification = await this.notificationRepository.applyAction(notificationId, action);
    return { success: true, notification };
  }
}
