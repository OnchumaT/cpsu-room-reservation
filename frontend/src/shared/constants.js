// Cross-cutting, dependency-free constants used by any layer.

export const MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
export const THAI_MONTH_ABBR = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
export const DAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

// Per-role avatar styling + Thai display label. The old ROLE_INFO also
// held a fake demo name per role (for the RoleSwitcher) — the sidebar/
// topbar now read the real name off appState.user instead.
export const ROLE_INFO = {
  teacher: { avBg: '#EEF0FF', avC: '#38419D', label: 'อาจารย์' },
  student: { avBg: '#DBEAFE', avC: '#1e40af', label: 'นักศึกษา' },
  staff: { avBg: '#dcfce7', avC: '#166534', label: 'เจ้าหน้าที่' },
  admin: { avBg: '#FEF3C7', avC: '#92400e', label: 'ผู้ดูแลระบบ' },
};

// Base per-role menu — no more 'head' entry: approval authority is a
// management position (appState.canApprove), independent of role, so any
// role's menu can gain the approver items below.
export const MENUS = {
  teacher: [{ sec: 'หลัก' }, { key: 'dashboard', label: 'แดชบอร์ด', ic: 'home' }, { key: 'rooms', label: 'ค้นหาห้อง', ic: 'bldg' }, { key: 'book', label: 'จองห้อง', ic: 'cal' }, { key: 'templates', label: 'เทมเพลตการจอง', ic: 'bookmark' }, { key: 'history', label: 'ประวัติการจอง', ic: 'list' }, { sec: 'อื่นๆ' }, { key: 'notifications', label: 'การแจ้งเตือน', ic: 'bell' }, { key: 'profile', label: 'โปรไฟล์', ic: 'user' }],
  student: [{ sec: 'หลัก' }, { key: 'dashboard', label: 'แดชบอร์ด', ic: 'home' }, { key: 'rooms', label: 'ค้นหาห้อง', ic: 'bldg' }, { key: 'book', label: 'จองห้อง', ic: 'cal' }, { key: 'templates', label: 'เทมเพลตการจอง', ic: 'bookmark' }, { key: 'history', label: 'ประวัติการจอง', ic: 'list' }, { sec: 'อื่นๆ' }, { key: 'notifications', label: 'การแจ้งเตือน', ic: 'bell' }, { key: 'profile', label: 'โปรไฟล์', ic: 'user' }],
  staff: [{ sec: 'หลัก' }, { key: 'dashboard', label: 'แดชบอร์ด', ic: 'home' }, { key: 'reservations', label: 'จัดการการจอง', ic: 'list' }, { sec: 'คำขอ' }, { key: 'facilityqueue', label: 'คำขอสิ่งอำนวยความสะดวก', ic: 'box' }, { sec: 'อื่นๆ' }, { key: 'notifications', label: 'การแจ้งเตือน', ic: 'bell' }, { key: 'reports', label: 'รายงาน', ic: 'chart' }],
  admin: [{ sec: 'หลัก' }, { key: 'dashboard', label: 'แดชบอร์ด', ic: 'home' }, { sec: 'จัดการ' }, { key: 'users', label: 'จัดการผู้ใช้', ic: 'users' }, { key: 'managerooms', label: 'จัดการห้อง', ic: 'bldg' }, { key: 'allbookings', label: 'การจองทั้งหมด', ic: 'list' }, { sec: 'วิเคราะห์' }, { key: 'analytics', label: 'วิเคราะห์ข้อมูล', ic: 'chart' }, { key: 'reports', label: 'รายงาน', ic: 'file' }, { sec: 'ระบบ' }, { key: 'settings', label: 'ตั้งค่าระบบ', ic: 'gear' }, { key: 'notifications', label: 'การแจ้งเตือน', ic: 'bell' }],
};

// Spliced into whichever role's menu when appState.canApprove is true.
export const APPROVER_MENU_ITEMS = [
  { sec: 'อนุมัติ' },
  { key: 'approvals', label: 'คิวอนุมัติ', ic: 'check' },
  { key: 'approvalsettings', label: 'ตั้งค่าการอนุมัติ', ic: 'gear' },
];

export const ROOM_COLORS = {
  '1637': { bg: '#DBEAFE', text: '#1e3a8a', bar: '#3b82f6' },
  '1638': { bg: '#D1FAE5', text: '#065f46', bar: '#10b981' },
  '1639': { bg: '#FEF3C7', text: '#92400e', bar: '#f59e0b' },
  '1640': { bg: '#F3E8FF', text: '#6b21a8', bar: '#a855f7' },
  '1641': { bg: '#FFE4E6', text: '#9f1239', bar: '#f43f5e' },
};

// page-title lookup used by the Router
export const PAGE_TITLES = {
  dashboard: 'แดชบอร์ด', rooms: 'ค้นหาห้อง', book: 'จองห้อง', history: 'ประวัติการจอง',
  notifications: 'การแจ้งเตือน', profile: 'โปรไฟล์', approvals: 'คิวอนุมัติ', reservations: 'จัดการการจอง',
  managerooms: 'จัดการห้อง', facilityqueue: 'คำขอสิ่งอำนวยความสะดวก', reports: 'รายงาน', users: 'จัดการผู้ใช้',
  allbookings: 'การจองทั้งหมด', analytics: 'วิเคราะห์ข้อมูล', settings: 'ตั้งค่าระบบ',
  approvalsettings: 'ตั้งค่าการอนุมัติ', templates: 'เทมเพลตการจอง',
};

export const TIME_SLOTS_START = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'];
export const TIME_SLOTS_END = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00'];

export const PARTICIPATING_TEACHERS = ['ผศ.ดร.สิรักข์ แก้วจำนงค์','ผศ.โอภาส วงษ์ทวีทรัพย์','อ.ดร.ภูริวัจน์ วรวิชัยพัฒน์','รศ.ดร.ปานใจ ธารทัศนวงศ์','ผศ.ดร.กรัญญา สิทธิสงวน','ผศ.ดร.กฤษณะ สีพนมวัน','ผศ.ดร.คทา ประดิษฐวงศ์','ผศ.ดร.ณัฐโชติ พรหมฤทธิ์','ผศ.ดร.ทัศนวรรณ ศูนย์กลาง','ผศ.ดร.ปัญญนัท อ้นพงษ์','ผศ.ดร.รัชดาพร คณาวงษ์','ผศ.ดร.วีณาวดี ม่วงอ้น','ผศ.ดร.สัจจาภรณ์ ไวจรรยา','ผศ.ดร.สุนีย์ พงษ์พินิจภิญโญ','ผศ.ดร.อรวรรณ เชาวลิต','อ.ดร.ณัฐพงศ์ จิวมั่งมี','อ.ดร.บูชาภัทร ป้านศรี','อ.ดร.วัสรา รอดเหตุภัย','อ.ดร.เสาวลักษณ์ อร่ามพงศานุวัต','อ.เสฐลัทธ์ รอดเหตุภัย','อ.อภิเษก หงษ์วิทยากร'];

export const BOOKING_EQUIPMENT_OPTIONS = [
  { k: 'mic', nm: 'ไมโครโฟน', avail: '3 ตัว', ic: 'mic', max: 3 },
  { k: 'wb', nm: 'ไวท์บอร์ด', avail: '2 แผ่น', ic: 'wb', max: 2 },
  { k: 'ext', nm: 'ปลั๊กพ่วง', avail: '5 อัน', ic: 'plug', max: 5 },
  { k: 'hdmi', nm: 'สาย HDMI', avail: '4 เส้น', ic: 'hdmi', max: 4 },
];

export const BOOKING_PURPOSES = ['สอน/บรรยาย','ประชุมกลุ่ม','สอบ','ปฏิบัติการ'];
export const TEACHER_ONLY_PURPOSES = ['จัดสอบโครงงานปริญญานิพนธ์','จัดประชุม'];
export const OTHER_PURPOSE = 'อื่นๆ';
