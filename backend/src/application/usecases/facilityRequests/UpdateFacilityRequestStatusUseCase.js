import { AppError } from '../../../utils/AppError.js';

// Requester-facing FYI shown when Staff accepts or finishes their request
// (only Teacher has a working notification inbox for this, matching the
// original design — students/admins don't file facility requests).
const EVENT_META = {
  accepted: { iconKey: 'tool', iconBg: '#EEF0FF', verb: 'ถูกรับคำขอแล้ว', detail: (r) => `เจ้าหน้าที่กำลังเตรียม ${[...r.equip, ...r.food].join(' · ')}` },
  done: { iconKey: 'ok', iconBg: '#dcfce7', verb: 'จัดการเรียบร้อยแล้ว', detail: (r) => `ห้อง ${r.room} · ${r.date} · ${r.time}` },
};

export class UpdateFacilityRequestStatusUseCase {
  constructor({ facilityRequestRepository, notificationRepository }) {
    this.facilityRequestRepository = facilityRequestRepository;
    this.notificationRepository = notificationRepository;
  }

  async accept(id) {
    return this._transition(id, 'accepted', 'accepted');
  }

  async markDone(id) {
    return this._transition(id, 'done', 'done');
  }

  async _transition(id, status, event) {
    const request = await this.facilityRequestRepository.findById(id);
    if (!request) throw AppError.notFound('Facility request not found');
    const updated = await this.facilityRequestRepository.updateStatus(id, status);
    const meta = EVENT_META[event];
    await this.notificationRepository.addForUser(updated.userId, {
      iconKey: meta.iconKey, iconBg: meta.iconBg,
      title: `คำขอสิ่งอำนวยความสะดวกเพิ่มเติม ${updated.id} ${meta.verb}`,
      subtitle: meta.detail(updated),
      bookingId: updated.bkId, kind: 'facility-request',
    });
    return { success: true, facilityRequest: updated };
  }
}
