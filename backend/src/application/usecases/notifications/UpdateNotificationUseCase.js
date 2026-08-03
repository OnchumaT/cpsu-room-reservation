import { AppError } from '../../../utils/AppError.js';

// Mirrors the frontend's Notification.applyAction — kept as a pure mapping
// here since the repository returns plain DTOs, not entity instances.
const ACTION_CHANGES = {
  approve: { status: 'อนุมัติแล้ว', statusBg: '#dcfce7', statusColor: '#166534', unread: false, actions: [] },
  reject: { status: 'ปฏิเสธ', statusBg: '#fee2e2', statusColor: '#991b1b', unread: false, actions: [] },
  accept: { status: 'รับงานแล้ว', statusBg: '#EEF0FF', statusColor: '#38419D', unread: false, actions: [{ l: 'เสร็จสิ้น', c: 'g', f: 'done' }] },
  done: { status: 'จัดการแล้ว', statusBg: '#dcfce7', statusColor: '#166534', actions: [] },
};

/** Applies an action (approve/reject/accept/done) to a notification with acts (Staff/approvers inboxes). */
export class UpdateNotificationUseCase {
  constructor({ notificationRepository }) {
    this.notificationRepository = notificationRepository;
  }

  async execute({ notificationId, action }) {
    const changes = ACTION_CHANGES[action];
    if (!changes) throw AppError.badRequest(`Unknown notification action: ${action}`);
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) throw AppError.notFound('Notification not found');
    const updated = await this.notificationRepository.update(notificationId, changes);
    return { success: true, notification: updated };
  }
}
