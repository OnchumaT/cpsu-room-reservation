// Requester-facing (only Teacher has its own read-only notification
// inbox today) FYI shown when Staff accepts or finishes their request.
const EVENT_META = {
  accepted: { ic: 'tool', ibg: '#EEF0FF', verb: 'ถูกรับคำขอแล้ว', detail: (r) => `เจ้าหน้าที่กำลังเตรียม ${[...r.equip, ...r.food].join(' · ')}` },
  done: { ic: 'ok', ibg: '#dcfce7', verb: 'จัดการเรียบร้อยแล้ว', detail: (r) => `ห้อง ${r.room} · ${r.date} · ${r.time}` },
};

export class UpdateFacilityRequestStatusUseCase {
  constructor({ facilityRequestRepository, bookingRepository, notificationRepository }) {
    this.facilityRequestRepository = facilityRequestRepository;
    this.bookingRepository = bookingRepository;
    this.notificationRepository = notificationRepository;
  }

  accept(id) {
    const request = this.facilityRequestRepository.findById(id);
    if (!request) return { success: false };
    request.accept();
    this._notifyRequester(request, 'accepted');
    return { success: true, request };
  }

  markDone(id) {
    const request = this.facilityRequestRepository.findById(id);
    if (!request) return { success: false };
    request.markDone();
    this._notifyRequester(request, 'done');
    return { success: true, request };
  }

  _notifyRequester(request, event) {
    const booking = this.bookingRepository.findById(request.bkId);
    if (!booking || booking.role !== 'teacher') return;
    const meta = EVENT_META[event];
    this.notificationRepository.addTeacherNotification({
      ic: meta.ic,
      ibg: meta.ibg,
      msg: `คำขอสิ่งอำนวยความสะดวกเพิ่มเติม ${request.id} ${meta.verb}`,
      sub: meta.detail(request),
      time: 'เมื่อสักครู่',
      unr: true,
    });
  }
}
