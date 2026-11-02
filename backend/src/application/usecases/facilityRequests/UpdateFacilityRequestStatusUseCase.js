import { AppError } from '../../../utils/AppError.js';
import { formatDateDMY, formatDateSpan } from '../../../utils/dateFormat.js';

// Requester-facing FYI shown when Staff accepts or finishes their request
// (only Teacher has a working notification inbox for this, matching the
// original design — students/admins don't file facility requests).
const EVENT_META = {
  accepted: {
    iconKey: 'tool', iconBg: '#EEF0FF', verb: 'ถูกรับคำขอแล้ว',
    detail: (r) => `เจ้าหน้าที่กำลังเตรียม ${[...r.equip, ...r.food].join(' · ')}`,
    staffCard: { status: 'กำลังเตรียม', statusBg: '#EEF0FF', statusColor: '#38419D' },
  },
  done: {
    iconKey: 'ok', iconBg: '#dcfce7', verb: 'จัดการเรียบร้อยแล้ว',
    detail: (r) => `ห้อง ${r.room} · ${formatDateDMY(r.date)} · ${r.time}`,
    staffCard: { status: 'เสร็จสิ้น', statusBg: '#dcfce7', statusColor: '#166534' },
  },
  notDone: {
    iconKey: 'no', iconBg: '#fee2e2', verb: 'ไม่ได้จัดเตรียม',
    detail: (r) => `เจ้าหน้าที่ไม่ได้จัดเตรียม ${[...r.equip, ...r.food].join(' · ')} สำหรับห้อง ${r.room} · ${formatDateDMY(r.date)} · ${r.time}`,
    staffCard: { status: 'ไม่ได้ดำเนินการ', statusBg: '#fee2e2', statusColor: '#991b1b' },
  },
};

// Which statuses each action may start from. `done`/`not_done` are final —
// without this, a stale tab could press "รับคำขอ" on a closed request and
// quietly reopen it. Closing straight from `pending` is allowed because a
// request whose booking time has passed has nothing left to prepare.
const ALLOWED_FROM = {
  accepted: ['pending'],
  done: ['pending', 'accepted'],
  not_done: ['pending', 'accepted'],
};

export class UpdateFacilityRequestStatusUseCase {
  constructor({ facilityRequestRepository, notificationRepository }) {
    this.facilityRequestRepository = facilityRequestRepository;
    this.notificationRepository = notificationRepository;
  }

  /**
   * Accepting a multi-day booking's request accepts every day of it still
   * pending (one request per day — see FacilityRequestRepository), with one
   * notice to the requester. Done / not done stay per day: each day is
   * prepared on its own.
   */
  async accept(id) {
    const request = await this.facilityRequestRepository.findById(id);
    if (!request) throw AppError.notFound('Facility request not found');
    if (!request.groupId) return this._transition(id, 'accepted', 'accepted');
    const pending = (await this.facilityRequestRepository.findByGroup(request.groupId)).filter((r) => r.st === 'pending');
    if (!pending.length) throw AppError.conflict('คำขอนี้ถูกดำเนินการไปแล้ว กรุณารีเฟรชหน้า');
    const updated = [];
    for (const r of pending) {
      updated.push(await this._transition(r.id, 'accepted', 'accepted', { notifyRequester: false }));
    }
    const first = updated[0].facilityRequest;
    await this.notificationRepository.addForUser(first.userId, {
      iconKey: 'tool', iconBg: '#EEF0FF',
      title: `คำขอสิ่งอำนวยความสะดวกเพิ่มเติม ${first.id} ถูกรับคำขอแล้ว`,
      subtitle: `เจ้าหน้าที่จะเตรียม ${[...first.equip, ...first.food].join(' · ')} · ${formatDateSpan(updated.map((u) => u.facilityRequest.date))}`,
      bookingId: first.bkId, kind: 'facility-request',
    });
    return { success: true, facilityRequest: updated.find((u) => u.facilityRequest.id === String(id))?.facilityRequest || first, facilityRequests: updated.map((u) => u.facilityRequest) };
  }

  async markDone(id) {
    return this._transition(id, 'done', 'done');
  }

  async markNotDone(id) {
    return this._transition(id, 'not_done', 'notDone');
  }

  async _transition(id, status, event, { notifyRequester = true } = {}) {
    const request = await this.facilityRequestRepository.findById(id);
    if (!request) throw AppError.notFound('Facility request not found');
    if (!ALLOWED_FROM[status].includes(request.st)) {
      throw AppError.conflict('คำขอนี้ถูกดำเนินการไปแล้ว กรุณารีเฟรชหน้า');
    }
    const updated = await this.facilityRequestRepository.updateStatus(id, status);
    const meta = EVENT_META[event];
    // Clears the stale "รอ" card Staff saw when the request came in (or the
    // day-before reminder) — otherwise it sits forever claiming the request
    // is still pending even after it's been accepted/done.
    await this.notificationRepository.resolveNotificationsForAudience(
      'staff', updated.bkId, { ...meta.staffCard, unread: false, actions: [] }, undefined, 'facility_request',
    );
    if (notifyRequester) await this.notificationRepository.addForUser(updated.userId, {
      iconKey: meta.iconKey, iconBg: meta.iconBg,
      title: `คำขอสิ่งอำนวยความสะดวกเพิ่มเติม ${updated.id} ${meta.verb}`,
      subtitle: meta.detail(updated),
      bookingId: updated.bkId, kind: 'facility-request',
    });
    return { success: true, facilityRequest: updated };
  }
}
