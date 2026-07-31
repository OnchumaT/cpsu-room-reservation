import { Booking, BOOKING_STATUS } from '../../../domain/entities/Booking.js';
import { FacilityRequest } from '../../../domain/entities/FacilityRequest.js';
import { Notification } from '../../../domain/entities/Notification.js';
import { BookingConflictPolicy } from '../../../domain/policies/BookingConflictPolicy.js';
import { ApprovalPolicy } from '../../../domain/policies/ApprovalPolicy.js';

const FACILITY_EQUIPMENT_NAMES = { mic: 'ไมโครโฟน', wb: 'ไวท์บอร์ด', ext: 'ปลั๊กพ่วง', hdmi: 'สาย HDMI' };

/**
 * Creates a new booking: checks for conflicts, decides approval status,
 * and — when the requester also asked for equipment/food — files a
 * FacilityRequest and notifies Staff, or (when the booking itself needs
 * review) notifies Head. This is the use-case equivalent of the old
 * submitBook() function, minus all DOM/toast concerns.
 */
export class CreateBookingUseCase {
  constructor({ bookingRepository, facilityRequestRepository, notificationRepository }) {
    this.bookingRepository = bookingRepository;
    this.facilityRequestRepository = facilityRequestRepository;
    this.notificationRepository = notificationRepository;
  }

  /**
   * @param {{
   *   role:string, roleName:string, room:string, date:string, start:string, end:string,
   *   purpose:string, participants:number, note:string, approvalMode:string,
   *   facility?: {equipment: Record<string,number>, food: string[], facilityNote: string}
   * }} input
   */
  execute(input) {
    const { role, roleName, room, date, start, end, purpose, participants, note, approvalMode, facility } = input;

    const conflict = BookingConflictPolicy.findConflict(this.bookingRepository.getAll(), { room, date, start, end });
    if (conflict) {
      return { success: false, conflict };
    }

    const autoApproved = ApprovalPolicy.willAutoApprove({ role, approvalMode });
    const booking = new Booking({
      id: Booking.nextId(this.bookingRepository.count()),
      room,
      user: roleName,
      title: purpose,
      date,
      time: `${start}-${end}`,
      status: autoApproved ? BOOKING_STATUS.APPROVED : BOOKING_STATUS.PENDING,
      role,
      participants,
      note,
    });
    this.bookingRepository.add(booking);

    let facilityRequest = null;
    if (facility && this._hasFacilityItems(facility)) {
      facilityRequest = this._fileFacilityRequest({ roleName, room, date, start, end, facility });
    }
    if (!autoApproved) {
      this._notifyHead({ roleName, room, date, start, end, purpose });
    }

    return { success: true, booking, autoApproved, facilityRequest };
  }

  _hasFacilityItems({ equipment, food }) {
    return Object.values(equipment || {}).some((v) => v > 0) || (food || []).length > 0;
  }

  _fileFacilityRequest({ roleName, room, date, start, end, facility }) {
    const equipList = Object.entries(facility.equipment || {})
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => `${FACILITY_EQUIPMENT_NAMES[key] || key} ${qty} ชิ้น`);

    const request = new FacilityRequest({
      id: FacilityRequest.newId(this.facilityRequestRepository.count()),
      who: roleName,
      room,
      bkId: 'BK-NEW',
      date,
      time: `${start}-${end}`,
      equip: equipList,
      food: [...(facility.food || [])],
      note: facility.facilityNote || '',
      submitted: 'เมื่อสักครู่',
      st: 'pending',
    });
    this.facilityRequestRepository.add(request);

    this.notificationRepository.addStaffNotification(new Notification({
      id: Date.now(),
      unr: true,
      icKey: 'tool',
      ibg: '#EEF0FF',
      title: `${roleName.split(' ')[0]} ขอสิ่งอำนวยความสะดวกเพิ่มเติม พร้อมการจองใหม่`,
      sub: `ห้อง ${room} · ${date} · ${start}-${end}\n${[...equipList, ...(facility.food || [])].join(' · ')}`,
      time: 'เมื่อสักครู่',
      st: 'รอ',
      stBg: '#FEF3C7',
      stC: '#92400e',
      acts: [{ l: 'รับงาน', c: 'g', f: 'accept' }, { l: 'ดูเพิ่ม', c: '', f: 'detail' }],
    }));

    return request;
  }

  _notifyHead({ roleName, room, date, start, end, purpose }) {
    this.notificationRepository.addHeadNotification(new Notification({
      id: Date.now(),
      unr: true,
      icKey: 'cal',
      ibg: '#FEF3C7',
      title: `${roleName.split(' ')[0]} ขอจองห้อง ${room}`,
      sub: `${date} · ${start}-${end} · ${purpose}`,
      time: 'เมื่อสักครู่',
      st: 'รออนุมัติ',
      stBg: '#FEF3C7',
      stC: '#92400e',
      acts: [{ l: 'อนุมัติ', c: 'g', f: 'approve' }, { l: 'ปฏิเสธ', c: 'r', f: 'reject' }],
    }));
  }
}
