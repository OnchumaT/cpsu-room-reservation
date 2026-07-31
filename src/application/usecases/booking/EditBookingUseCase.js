import { Notification } from '../../../domain/entities/Notification.js';

const FACILITY_EQUIPMENT_NAMES = { mic: 'ไมโครโฟน', proj: 'โปรเจกเตอร์', wb: 'ไวท์บอร์ดเพิ่ม', ext: 'ปลั๊กพ่วง' };

/**
 * Edits an existing booking's date/time/title/note. When the requester is a
 * Teacher and also changed the equipment/food request attached to the
 * edit, Staff gets notified — mirrors the old saveEdit()'s STAFF_NOTIFS push.
 */
export class EditBookingUseCase {
  constructor({ bookingRepository, notificationRepository }) {
    this.bookingRepository = bookingRepository;
    this.notificationRepository = notificationRepository;
  }

  /** @param {{bookingId:string, date:string, start:string, end:string, title:string, note?:string, role?:string, facility?:{equipment:Record<string,number>, food:string[]}}} input */
  execute({ bookingId, date, start, end, title, note, role, facility }) {
    const booking = this.bookingRepository.findById(bookingId);
    if (!booking) return { success: false, reason: 'not-found' };
    if (!date || !start || !end || !title) return { success: false, reason: 'missing-fields' };
    if (start >= end) return { success: false, reason: 'invalid-time-range' };

    booking.date = date;
    booking.time = `${start}–${end}`;
    booking.title = title;
    if (note !== undefined) booking.note = note;

    let notifiedStaff = false;
    if (role === 'teacher' && facility && this._hasFacilityItems(facility)) {
      this._notifyStaff({ bookingId, booking, facility });
      notifiedStaff = true;
    }

    return { success: true, booking, notifiedStaff };
  }

  _hasFacilityItems({ equipment, food }) {
    return Object.values(equipment || {}).some((v) => v > 0) || (food || []).length > 0;
  }

  _notifyStaff({ bookingId, booking, facility }) {
    const equipList = Object.entries(facility.equipment || {})
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => `${FACILITY_EQUIPMENT_NAMES[key] || key} ${qty} ชิ้น`);
    const allItems = [...equipList, ...(facility.food || [])];

    this.notificationRepository.addStaffNotification(new Notification({
      id: Date.now(),
      unr: true,
      icKey: 'tool',
      ibg: '#EEF0FF',
      title: `${booking.user} แก้ไขคำขอสิ่งอำนวยความสะดวกเพิ่มเติม (${bookingId})`,
      sub: `ห้อง ${booking.room} · ${booking.date} · ${booking.time}\n${allItems.join(' · ')}`,
      time: 'เมื่อสักครู่',
      st: 'รอ',
      stBg: '#FEF3C7',
      stC: '#92400e',
      acts: [{ l: 'รับงาน', c: 'g', f: 'accept' }, { l: 'ดูเพิ่ม', c: '', f: 'detail' }],
    }));
  }
}
