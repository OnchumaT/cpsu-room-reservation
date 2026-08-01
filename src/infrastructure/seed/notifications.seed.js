export const STAFF_NOTIFS_SEED = [
  { id: 1, unr: true, icKey: 'tool', ibg: '#EEF0FF', title: 'ผศ.ดร.สมชาย ขอสิ่งอำนวยความสะดวกเพิ่มเติม', sub: 'ห้อง 1637 · 2 มิ.ย. 09:00–12:00\nไมโครโฟน 2 ตัว · กาแฟร้อน 10 แก้ว', time: 'เมื่อสักครู่', st: 'รอ', stBg: '#FEF3C7', stC: '#92400e', acts: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }], bookingId: 'BK001', kind: 'facility-request' },
  { id: 2, unr: true, icKey: 'tool', ibg: '#EEF0FF', title: 'อ.วรรณา ขอสิ่งอำนวยความสะดวกเพิ่มเติม', sub: 'ห้อง 1639 · 3 มิ.ย.\nไวท์บอร์ดเพิ่ม 1 แผ่น · ข้าวกล่อง 8 กล่อง', time: '20 นาทีที่แล้ว', st: 'รอ', stBg: '#FEF3C7', stC: '#92400e', acts: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }], bookingId: 'BK003', kind: 'facility-request' },
];

export const HEAD_NOTIFS_SEED = [
  { id: 3, unr: true, icKey: 'cal', ibg: '#FEF3C7', title: 'อ.วรรณา สุขใจ ขอจองห้อง 1638', sub: '2 มิ.ย. 13:00–15:00 · ประชุมกลุ่ม', time: '5 นาทีที่แล้ว', st: 'รออนุมัติ', stBg: '#FEF3C7', stC: '#92400e', acts: [{ l: 'อนุมัติ', c: 'g', f: 'approve' }, { l: 'ปฏิเสธ', c: 'r', f: 'reject' }] },
  { id: 4, unr: false, icKey: 'check', ibg: '#dcfce7', title: 'ผศ.ดร.สมชาย จองห้อง 1637', sub: 'อนุมัติอัตโนมัติ · 2 มิ.ย. 09:00–12:00', time: '3 ชม.ที่แล้ว', st: 'สำเร็จ', stBg: '#dcfce7', stC: '#166534', acts: [] },
];

// Read-only summary notifications (no accept/approve/reject actions) shown to
// Admin, Teacher, and Student — mirrors the literal arrays from the old
// renderNotifs() branches.
export const ADMIN_NOTIFS_SEED = [
  { ic: 'users', ibg: '#EEF0FF', msg: 'มีผู้ใช้ใหม่ลงทะเบียน 3 คน รอการยืนยัน', sub: 'นักศึกษา 2 คน · อาจารย์ 1 คน', time: 'เมื่อสักครู่', unr: true },
  { ic: 'list', ibg: '#DBEAFE', msg: 'การจองทั้งหมดเดือนนี้: 48 รายการ', sub: 'อนุมัติแล้ว 38 · รอ 4 · ปฏิเสธ 6', time: 'อัปเดตล่าสุด 09:00 น.', unr: false },
  { ic: 'monitor', ibg: '#FEF3C7', msg: 'อุปกรณ์ชำรุดรายงานใหม่: ไมโครโฟน 1 ตัว', sub: 'ห้อง 1638 · โปรดตรวจสอบ', time: '1 ชม.ที่แล้ว', unr: true },
  { ic: 'chart', ibg: '#dcfce7', msg: 'รายงานประจำเดือนพร้อมดาวน์โหลดแล้ว', sub: 'มิถุนายน 2568 · สรุปการใช้งานทั้งหมด', time: '2 ชม.ที่แล้ว', unr: false },
  { ic: 'gear', ibg: '#F3E8FF', msg: 'ระบบอัปเดตสำเร็จ เวอร์ชัน 1.2.5', sub: 'ปรับปรุงประสิทธิภาพและแก้บัก', time: 'เมื่อวาน', unr: false },
];

export const TEACHER_NOTIFS_SEED = [
  { ic: 'ok', ibg: '#dcfce7', msg: 'การจองห้อง 1637 ได้รับการอนุมัติ', sub: '2 มิ.ย. 09:00–12:00 · สอนวิชา CS301', time: 'เมื่อสักครู่', unr: true, bookingId: 'BK001' },
  { ic: 'tool', ibg: '#EEF0FF', msg: 'คำขอสิ่งอำนวยความสะดวกเพิ่มเติม BK001 ถูกรับคำขอแล้ว', sub: 'เจ้าหน้าที่กำลังเตรียม ไมโครโฟน · กาแฟ', time: '10 นาทีที่แล้ว', unr: true, bookingId: 'BK001' },
  { ic: 'clock', ibg: '#FEF3C7', msg: 'ห้อง 1639 จะหมดเวลาใน 30 นาที', sub: 'กรุณาคืนห้องเมื่อใช้งานเสร็จ', time: '1 ชม.ที่แล้ว', unr: false },
  { ic: 'ok', ibg: '#dcfce7', msg: 'การจองห้อง 1637 ครั้งถัดไปพรุ่งนี้', sub: '5 มิ.ย. 09:00–12:00 · สอบปลายภาค CS301', time: '3 ชม.ที่แล้ว', unr: false, bookingId: 'BK004' },
];

export const STUDENT_NOTIFS_SEED = [
  { ic: 'clock', ibg: '#FEF3C7', msg: 'การจองห้อง 1638 รอการอนุมัติจากหัวหน้าภาควิชา', sub: '2 มิ.ย. 10:00–12:00 · ประชุมกลุ่มโปรเจกต์', time: '5 นาทีที่แล้ว', unr: true },
  { ic: 'ok', ibg: '#dcfce7', msg: 'การจองห้อง 1641 ได้รับการอนุมัติ', sub: '9 มิ.ย. 13:00–16:00 · โปรเจกต์ IT Club', time: 'เมื่อวาน', unr: false },
];
