import { AppError } from '../../../utils/AppError.js';
import { VALID_ROLES } from '../../../utils/roles.js';

const ROLE_LABEL = { student: 'นักศึกษา', teacher: 'อาจารย์', staff: 'เจ้าหน้าที่', admin: 'ผู้ดูแลระบบ', pending: 'รออนุมัติ' };

export class UpdateUserUseCase {
  constructor({ userRepository, notificationRepository }) {
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
  }

  async execute({ userId, name, role }) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    if (role && !VALID_ROLES.has(role)) throw AppError.badRequest(`Invalid role: ${role}`);

    const nextName = name || user.name;
    const nextRole = role || user.role;
    const wasPending = user.role === 'pending';
    const nameChanged = nextName !== user.name;
    const roleChanged = nextRole !== user.role;

    const updated = await this.userRepository.update(userId, { name: nextName, role: nextRole });

    // Personal, not broadcast — only the edited user should see this (see
    // ApproveRejectBookingUseCase/CancelBookingUseCase for the same fix
    // applied to booking notifications earlier).
    if (wasPending && roleChanged) {
      await this.notificationRepository.addForUser(userId, {
        iconKey: 'ok', iconBg: '#dcfce7',
        title: 'บัญชีของคุณได้รับการอนุมัติแล้ว',
        subtitle: `บทบาท: ${ROLE_LABEL[nextRole] || nextRole}`,
      });
    } else if (nameChanged || roleChanged) {
      const changes = [];
      if (nameChanged) changes.push(`ชื่อเป็น "${nextName}"`);
      if (roleChanged) changes.push(`บทบาทเป็น "${ROLE_LABEL[nextRole] || nextRole}"`);
      await this.notificationRepository.addForUser(userId, {
        iconKey: 'user', iconBg: '#EEF0FF',
        title: 'ข้อมูลบัญชีของคุณถูกแก้ไขโดยผู้ดูแลระบบ',
        subtitle: `เปลี่ยน${changes.join(' และ ')}`,
      });
    }

    return { success: true, user: updated };
  }
}
