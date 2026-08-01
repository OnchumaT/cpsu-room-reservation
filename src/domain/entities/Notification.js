// Notification — an actionable item shown to Staff (facility requests) or
// Head (booking approvals).

// kind distinguishes what "ดูเพิ่ม" (view more) should do: a
// 'facility-request' notification routes to the Facility Queue page,
// while any other kind with a bookingId opens the Booking Detail modal.
export const NOTIFICATION_KIND = Object.freeze({
  FACILITY_REQUEST: 'facility-request',
  BOOKING: 'booking',
});

export class Notification {
  constructor({ id, unr, icKey, ibg, title, sub, time, st, stBg, stC, acts, bookingId, kind }) {
    this.id = id;
    this.unr = unr;
    this.icKey = icKey;
    this.ibg = ibg;
    this.title = title;
    this.sub = sub;
    this.time = time;
    this.st = st;
    this.stBg = stBg;
    this.stC = stC;
    this.acts = acts ?? [];
    this.bookingId = bookingId;
    this.kind = kind ?? NOTIFICATION_KIND.BOOKING;
  }

  markRead() {
    this.unr = false;
  }

  applyAction(action) {
    if (action === 'approve') {
      this.st = 'อนุมัติแล้ว'; this.stBg = '#dcfce7'; this.stC = '#166534'; this.unr = false; this.acts = [];
    } else if (action === 'reject') {
      this.st = 'ปฏิเสธ'; this.stBg = '#fee2e2'; this.stC = '#991b1b'; this.unr = false; this.acts = [];
    } else if (action === 'accept') {
      this.st = 'รับงานแล้ว'; this.stBg = '#EEF0FF'; this.stC = '#38419D'; this.unr = false;
      this.acts = [{ l: 'เสร็จสิ้น', c: 'g', f: 'done' }];
    } else if (action === 'done') {
      this.st = 'จัดการแล้ว'; this.stBg = '#dcfce7'; this.stC = '#166534'; this.acts = [];
    }
  }
}
