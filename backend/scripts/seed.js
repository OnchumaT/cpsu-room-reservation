// Seeds the database with a fuller demo dataset: management positions,
// ~27 users across every role (exactly 1 department head, 1 vice-head,
// 1 plain admin — per request — plus a pool of teachers/students/staff
// for variety), rooms, the department's default approval mode, and 100
// randomly-generated sample bookings (with conflict-avoidance, a mix of
// statuses, some carrying a facility request) plus matching audit logs
// and a bounded set of notifications so the inboxes stay realistic
// rather than flooded.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Passw0rd!';
const BOOKING_COUNT = 100;

const toTime = (hhmm) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const pad2 = (n) => String(n).padStart(2, '0');
const relDate = (daysFromToday) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const weightedPick = (weighted) => {
  const total = weighted.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [value, w] of weighted) {
    if ((r -= w) <= 0) return value;
  }
  return weighted[weighted.length - 1][0];
};

const POSITIONS = [
  { key: 'head', positionName: 'หัวหน้าภาควิชา', canApprove: true },
  { key: 'viceHead', positionName: 'รองหัวหน้าภาควิชา', canApprove: true },
  { key: 'programChair', positionName: 'ประธานหลักสูตร', canApprove: false },
];

// Exactly 1 head, 1 vice-head, 1 plain admin (as requested) — same emails
// as before so previously-shared login credentials keep working.
const CORE_USERS = [
  { key: 'head', name: 'รศ.ดร.สุรเดช ปัญญาวัฒน์', email: 'suradet.p@su.ac.th', role: 'admin', positions: ['head'] },
  { key: 'viceHead', name: 'อ.วรรณา สุขใจ', email: 'wanna.s@su.ac.th', role: 'teacher', positions: ['viceHead'] },
  { key: 'admin', name: 'นายอนุวัฒน์ ดีมาก', email: 'anuwat.d@su.ac.th', role: 'admin', positions: [] },
  { key: 'teacher01', name: 'ผศ.ดร.สมชาย วงศ์ดี', email: 'somchai.w@su.ac.th', role: 'teacher', positions: ['programChair'] },
  { key: 'staff01', name: 'น.ส.วิภา สมใจ', email: 'vipa.s@su.ac.th', role: 'staff', positions: [] },
  { key: 'staff02', name: 'นายสกล รักดี', email: 'sakol.r@su.ac.th', role: 'staff', positions: [] },
  { key: 'student01', name: 'นายพงศ์ธร มีสุข', email: 'pongthon.m@su.ac.th', role: 'student', positions: [] },
  { key: 'student02', name: 'น.ส.กมลชนก จริงจิต', email: 'kamonchok.j@su.ac.th', role: 'student', positions: [] },
];

// A pool of additional teachers/students/staff, generated with systematic
// emails, so there's enough variety of requesters to spread 100 bookings
// across without every booking coming from the same 2-3 people.
const EXTRA_TEACHER_NAMES = [
  'ผศ.ดร.สิรักข์ แก้วจำนงค์', 'ผศ.โอภาส วงษ์ทวีทรัพย์', 'อ.ดร.ภูริวัจน์ วรวิชัยพัฒน์', 'รศ.ดร.ปานใจ ธารทัศนวงศ์',
  'ผศ.ดร.กรัญญา สิทธิสงวน', 'ผศ.ดร.กฤษณะ สีพนมวัน', 'ผศ.ดร.คทา ประดิษฐวงศ์',
];
const EXTRA_STUDENT_NAMES = [
  'นายกิตติศักดิ์ แสงทอง', 'น.ส.ชนกานต์ ใจดี', 'นายธนวัฒน์ ศรีสุข', 'น.ส.ปาริชาต บุญมา', 'นายวรากร ทองคำ',
  'น.ส.ศศิธร รุ่งเรือง', 'นายอดิศร คงมั่น', 'น.ส.เบญจวรรณ พูนสุข', 'นายปิยะพงษ์ วงศ์สวัสดิ์', 'น.ส.รัตติกาล แก้วมณี',
];
const EXTRA_STAFF_NAMES = ['นายประสิทธิ์ ช่วยเหลือ', 'น.ส.อรุณี ตั้งใจ'];

const USERS = [
  ...CORE_USERS,
  ...EXTRA_TEACHER_NAMES.map((name, i) => ({ key: `teacher${pad2(i + 2)}`, name, email: `teacher${pad2(i + 2)}@su.ac.th`, role: 'teacher', positions: [] })),
  ...EXTRA_STUDENT_NAMES.map((name, i) => ({ key: `student${pad2(i + 3)}`, name, email: `student${pad2(i + 3)}@su.ac.th`, role: 'student', positions: [] })),
  ...EXTRA_STAFF_NAMES.map((name, i) => ({ key: `staff${pad2(i + 3)}`, name, email: `staff${pad2(i + 3)}@su.ac.th`, role: 'staff', positions: [] })),
];

const ROOMS = [
  { id: '1637', name: 'ห้อง 1637', capacity: 20, status: 'available', floor: 6, gradient: 'linear-gradient(135deg,#2A2262,#38419D)', equipment: { projector: 1, whiteboard: 1, ac: 2, mic: 1, tv: 1, plug: 6, sound: 1 } },
  { id: '1638', name: 'ห้อง 1638', capacity: 20, status: 'available', floor: 6, gradient: 'linear-gradient(135deg,#4A1B6D,#7C3ABD)', equipment: { projector: 1, whiteboard: 1, ac: 2, mic: 1, tv: 1, plug: 6, sound: 1 } },
  { id: '1639', name: 'ห้อง 1639', capacity: 30, status: 'available', floor: 6, gradient: 'linear-gradient(135deg,#0F4C75,#1B9AAA)', equipment: { projector: 1, whiteboard: 2, ac: 3, mic: 2, tv: 1, plug: 6, sound: 1 } },
  { id: '1640', name: 'ห้อง 1640', capacity: 15, status: 'pending', floor: 6, gradient: 'linear-gradient(135deg,#7A3B00,#D4820A)', equipment: { projector: 1, ac: 1, plug: 6 } },
  { id: '1641', name: 'ห้อง 1641', capacity: 20, status: 'available', floor: 6, gradient: 'linear-gradient(135deg,#0A3D1E,#1B7A3A)', equipment: { projector: 1, whiteboard: 1, ac: 2, plug: 6 } },
];

const GENERAL_PURPOSES = ['สอน/บรรยาย', 'ประชุมกลุ่ม', 'สอบ', 'ปฏิบัติการ'];
const TEACHER_ONLY_PURPOSES = ['จัดสอบโครงงานปริญญานิพนธ์', 'จัดประชุม'];
const START_HOURS = [8, 9, 10, 11, 13, 14, 15, 16];
const REJECT_REASONS = ['ห้องมีการซ่อมบำรุงช่วงเวลาดังกล่าว', 'ข้อมูลไม่ครบถ้วน กรุณาระบุวัตถุประสงค์ให้ชัดเจน', 'ชนกับกิจกรรมของภาควิชาที่มีความสำคัญกว่า', 'จำนวนผู้เข้าร่วมเกินความจุห้อง'];

async function main() {
  console.log('Clearing existing data...');
  // TRUNCATE (not deleteMany) so auto-increment ids restart at 1 on every
  // reseed — otherwise ids keep climbing across runs, which is confusing
  // when testing against hardcoded ids from the previous run.
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of ['audit_logs', 'notifications', 'facility_requests', 'templates', 'bookings', 'rooms', 'user_management_positions', 'users', 'management_positions', 'booking_settings']) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table}`);
  }
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

  console.log('Seeding management positions...');
  const positionIdByKey = new Map();
  for (const p of POSITIONS) {
    const created = await prisma.managementPosition.create({ data: { positionName: p.positionName, canApprove: p.canApprove } });
    positionIdByKey.set(p.key, created.id);
  }

  console.log(`Seeding ${USERS.length} users...`);
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const userIdByKey = new Map();
  for (const u of USERS) {
    const created = await prisma.user.create({ data: { name: u.name, email: u.email, role: u.role, password } });
    userIdByKey.set(u.key, created);
    for (const posKey of u.positions) {
      await prisma.userManagementPosition.create({ data: { userId: created.id, positionId: positionIdByKey.get(posKey) } });
    }
  }

  console.log('Seeding rooms...');
  for (const r of ROOMS) {
    await prisma.room.create({
      data: { id: r.id, name: r.name, capacity: r.capacity, status: r.status, floor: r.floor, gradient: r.gradient, equipment: r.equipment },
    });
  }

  console.log('Seeding booking settings...');
  await prisma.bookingSetting.create({ data: { approvalMode: 'manual', updatedBy: userIdByKey.get('head').id } });

  console.log(`Generating ${BOOKING_COUNT} sample bookings...`);
  // Anyone who can actually book: every teacher/student, plus the head
  // (role=admin, but allowed to book via the can_approve override — same
  // rule the real API enforces). The plain admin never books.
  const bookers = USERS.filter((u) => u.role === 'teacher' || u.role === 'student' || u.key === 'head');
  const approvers = [userIdByKey.get('head'), userIdByKey.get('viceHead')];

  const occupied = new Map(); // `${roomId}|${date}` -> [{start,end}]
  const overlaps = (a, b) => a.start < b.end && a.end > b.start;

  const createdBookings = [];
  let attempts = 0;
  while (createdBookings.length < BOOKING_COUNT && attempts < BOOKING_COUNT * 20) {
    attempts += 1;
    const bookerDef = pick(bookers);
    const booker = userIdByKey.get(bookerDef.key);
    const room = pick(ROOMS);
    const dateStr = relDate(Math.floor(Math.random() * 80) - 20); // -20..+59 days
    const startHour = pick(START_HOURS);
    const duration = Math.random() < 0.7 ? 1 : 2;
    const endHour = Math.min(startHour + duration, 17);
    if (endHour <= startHour) continue;
    const start = `${pad2(startHour)}:00`;
    const end = `${pad2(endHour)}:00`;

    const slotKey = `${room.id}|${dateStr}`;
    const daySlots = occupied.get(slotKey) || [];
    if (daySlots.some((s) => overlaps(s, { start, end }))) continue;
    daySlots.push({ start, end });
    occupied.set(slotKey, daySlots);

    const isTeacherLike = bookerDef.role === 'teacher' || bookerDef.key === 'head';
    const purpose = isTeacherLike && Math.random() < 0.25 ? pick(TEACHER_ONLY_PURPOSES) : pick(GENERAL_PURPOSES);
    const isPast = dateStr < relDate(0);
    const status = isPast
      ? weightedPick([['approved', 55], ['rejected', 15], ['cancelled', 15], ['expired', 15]])
      : weightedPick([['approved', 45], ['pending', 40], ['cancelled', 10], ['rejected', 5]]);

    const data = {
      userId: booker.id, roomId: room.id, role: bookerDef.role,
      bookingDate: new Date(dateStr), startTime: toTime(start), endTime: toTime(end),
      purpose, participants: 5 + Math.floor(Math.random() * 26),
      status, approvalType: 'manual',
    };

    if (status === 'approved' || status === 'rejected') {
      const approver = pick(approvers);
      data.approvedBy = approver.id;
      data.approvedAt = new Date();
      if (status === 'rejected') data.rejectReason = pick(REJECT_REASONS);
      if (status === 'approved' && Math.random() < 0.1) { data.approvalType = 'auto'; data.approvedBy = null; }
    }

    const wantsFacility = isTeacherLike && ['pending', 'approved'].includes(status) && Math.random() < 0.25;
    if (wantsFacility) {
      data.equipment = { mic: Math.random() < 0.5 ? 1 : 2, wb: Math.random() < 0.3 ? 1 : 0 };
      data.food = Math.random() < 0.5 ? ['กาแฟร้อน 10 แก้ว'] : [];
      data.facilityNote = 'ต้องการก่อนเวลาเริ่ม 15 นาที';
    }

    const booking = await prisma.booking.create({ data });
    createdBookings.push({ booking, bookerDef, wantsFacility, status });
  }
  console.log(`  created ${createdBookings.length} bookings (${attempts} attempts)`);

  console.log('Seeding facility requests...');
  const facilityStatusPool = [['pending', 40], ['accepted', 35], ['done', 25]];
  for (const { booking, wantsFacility } of createdBookings) {
    if (!wantsFacility) continue;
    await prisma.facilityRequest.create({
      data: {
        bookingId: booking.id, equipment: booking.equipment, food: booking.food, note: booking.facilityNote,
        status: weightedPick(facilityStatusPool),
      },
    });
  }

  console.log('Seeding audit logs...');
  for (const { booking, bookerDef, status } of createdBookings) {
    await prisma.auditLog.create({
      data: { userId: userIdByKey.get(bookerDef.key).id, action: 'booking.create', details: { bookingId: booking.id, status } },
    });
    if (status === 'approved' || status === 'rejected') {
      await prisma.auditLog.create({
        data: { userId: booking.approvedBy, action: status === 'approved' ? 'booking.approve' : 'booking.reject', details: { bookingId: booking.id } },
      });
    }
  }

  console.log('Seeding a bounded set of notifications (not one per booking, to keep inboxes realistic)...');
  const pendingSample = createdBookings.filter((b) => b.status === 'pending').slice(0, 12);
  for (const { booking, bookerDef } of pendingSample) {
    const name = bookerDef.name.split(' ')[0];
    await prisma.notification.create({
      data: {
        audience: 'approvers', iconKey: 'cal', iconBg: '#FEF3C7',
        title: `${name} ขอจองห้อง ${booking.roomId}`,
        subtitle: `${booking.bookingDate.toISOString().slice(0, 10)} · ${booking.purpose}`,
        status: 'รออนุมัติ', statusBg: '#FEF3C7', statusColor: '#92400e',
        actions: [{ l: 'อนุมัติ', c: 'g', f: 'approve' }, { l: 'ปฏิเสธ', c: 'r', f: 'reject' }],
        bookingId: booking.id, kind: 'booking',
      },
    });
  }
  const decidedSample = createdBookings.filter((b) => b.status === 'approved' || b.status === 'rejected').slice(0, 10);
  for (const { booking, bookerDef, status } of decidedSample) {
    await prisma.notification.create({
      data: {
        audience: bookerDef.role,
        iconKey: status === 'approved' ? 'ok' : 'no', iconBg: status === 'approved' ? '#dcfce7' : '#fee2e2',
        title: `การจองห้อง ${booking.roomId} ${status === 'approved' ? 'ได้รับการอนุมัติ' : 'ถูกปฏิเสธ'}`,
        subtitle: `${booking.bookingDate.toISOString().slice(0, 10)} · ${booking.purpose}`,
        unread: Math.random() < 0.4, bookingId: booking.id, kind: 'booking',
      },
    });
  }
  const facilitySample = createdBookings.filter((b) => b.wantsFacility).slice(0, 6);
  for (const { booking, bookerDef } of facilitySample) {
    await prisma.notification.create({
      data: {
        audience: 'staff', iconKey: 'tool', iconBg: '#EEF0FF',
        title: `${bookerDef.name.split(' ')[0]} ขอสิ่งอำนวยความสะดวกเพิ่มเติม พร้อมการจองใหม่`,
        subtitle: `ห้อง ${booking.roomId} · ${booking.bookingDate.toISOString().slice(0, 10)}`,
        status: 'รอ', statusBg: '#FEF3C7', statusColor: '#92400e',
        actions: [{ l: 'ดูเพิ่ม', c: '', f: 'detail' }],
        bookingId: booking.id, kind: 'facility_request',
      },
    });
  }

  const statusCounts = createdBookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});
  console.log(`\nDone. ${createdBookings.length} bookings by status:`, statusCounts);
  console.log(`Every seeded account's password is: ${DEFAULT_PASSWORD}`);
  console.log('Core logins:');
  console.log('  suradet.p@su.ac.th   — admin, holds "หัวหน้าภาควิชา" (can approve)');
  console.log('  wanna.s@su.ac.th     — teacher, holds "รองหัวหน้าภาควิชา" (can approve)');
  console.log('  anuwat.d@su.ac.th    — admin, no management position');
  console.log('  somchai.w@su.ac.th   — teacher, holds "ประธานหลักสูตร" (cannot approve)');
  console.log('  vipa.s@su.ac.th      — staff');
  console.log('  pongthon.m@su.ac.th — student');
  console.log(`  + ${EXTRA_TEACHER_NAMES.length} more teachers (teacher02..teacher08@su.ac.th), ${EXTRA_STUDENT_NAMES.length} more students (student03..student12@su.ac.th), ${EXTRA_STAFF_NAMES.length} more staff (staff03..staff04@su.ac.th)`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
