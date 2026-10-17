// Seeds the database with a fuller demo dataset: management positions,
// the department's real 21-teacher roster (1 head, 2 deputy heads, 18
// teachers with no management position) plus a pool of placeholder
// admin/staff accounts for variety, rooms, the department's
// default approval mode, and 100 randomly-generated sample bookings
// (with conflict-avoidance, a mix of statuses, some carrying a facility
// request) plus matching audit logs and a bounded set of notifications
// so the inboxes stay realistic rather than flooded.
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
  { key: 'head', positionName: 'หัวหน้าภาควิชา', canApprove: true, level: 'department' },
  { key: 'viceHead', positionName: 'รองหัวหน้าภาควิชา', canApprove: true, level: 'department' },
  { key: 'programChair', positionName: 'ประธานหลักสูตร', canApprove: false, level: 'department' },
];

// The department's real 21-teacher roster. "Head" holds the หัวหน้าภาควิชา
// position; the two "Deputy Head" entries both hold รองหัวหน้าภาควิชา (the
// join table is many-to-many, so two people can share one position); the
// rest have no management position (role teacher, can't approve).
const TEACHERS = [
  { key: 'head', name: 'ผศ.ดร.สิรักข์ แก้วจำนงค์', email: 'kaewjamnong_s@su.ac.th', positions: ['head'] },
  { key: 'viceHead1', name: 'ผศ.โอภาส วงษ์ทวีทรัพย์', email: 'wongtaweesap_o@silpakorn.edu', positions: ['viceHead'] },
  { key: 'viceHead2', name: 'อ.ดร.ภูริวัจน์ วรวิชัยพัฒน์', email: 'phuriwat.wor@su.ac.th', positions: ['viceHead'] },
  { key: 'teacher04', name: 'รศ.ดร.ปานใจ ธารทัศนวงศ์', email: 'tantatsanawong_p@su.ac.th', positions: [] },
  { key: 'teacher05', name: 'ผศ.ดร.กรัญญา สิทธิสงวน', email: 'sitdhisanguan_k@su.ac.th', positions: [] },
  { key: 'teacher06', name: 'ผศ.ดร.กฤษณะ สีพนมวัน', email: 'seepanomwan_k@su.ac.th', positions: [] },
  { key: 'teacher07', name: 'ผศ.ดร.คทา ประดิษฐวงศ์', email: 'praditwong_k@su.ac.th', positions: [] },
  { key: 'teacher08', name: 'ผศ.ดร.ณัฐโชติ พรหมฤทธิ์', email: 'promrit_n@silpakorn.edu', positions: [] },
  { key: 'teacher09', name: 'ผศ.ดร.ทัศนวรรณ ศูนย์กลาง', email: 'soonklang_t@su.ac.th', positions: [] },
  { key: 'teacher10', name: 'ผศ.ดร.ปัญญนัท อ้นพงษ์', email: 'aonpong_p@su.ac.th', positions: [] },
  { key: 'teacher11', name: 'ผศ.ดร.รัชดาพร คณาวงษ์', email: 'kanawong_r@su.ac.th', positions: [] },
  { key: 'teacher12', name: 'ผศ.ดร.วีณาวดี ม่วงอ้น', email: 'muangon_w@su.ac.th', positions: [] },
  { key: 'teacher13', name: 'ผศ.ดร.สัจจาภรณ์ ไวจรรยา', email: 'waijanya_s@silpakorn.edu', positions: [] },
  { key: 'teacher14', name: 'ผศ.ดร.สุนีย์ พงษ์พินิจภิญโญ', email: 'pongpinigpinyo_s@su.ac.th', positions: [] },
  { key: 'teacher15', name: 'ผศ.ดร.อรวรรณ เชาวลิต', email: 'chaowalit_o@su.ac.th', positions: [] },
  { key: 'teacher16', name: 'อ.ดร.ณัฐพงศ์ จิวมั่งมี', email: 'tangjui_n@su.ac.th', positions: [] },
  { key: 'teacher17', name: 'อ.ดร.บูชาภัทร ป้านศรี', email: 'pansri_b@su.ac.th', positions: [] },
  { key: 'teacher18', name: 'อ.ดร.วัสรา รอดเหตุภัย', email: 'wasara@su.ac.th', positions: [] },
  { key: 'teacher19', name: 'อ.ดร.เสาวลักษณ์ อร่ามพงศานุวัต', email: 'arampongsanuwat_s@su.ac.th', positions: [] },
  { key: 'teacher20', name: 'อ.ดร.เสฐลัทธ์ รอดเหตุภัย', email: 'rodhetbhai_s@su.ac.th', positions: [] },
  { key: 'teacher21', name: 'อ.อภิเษก หงษ์วิทยากร', email: 'hongwitayakorn_a@su.ac.th', positions: [] },
];

// Placeholder admin/staff accounts — no real roster was provided
// for these roles, so they stay demo data.
const CORE_USERS = [
  ...TEACHERS.map((t) => ({ key: t.key, name: t.name, email: t.email, role: 'teacher', positions: t.positions })),
  { key: 'admin', name: 'นายอนุวัฒน์ ดีมาก', email: 'anuwat.d@su.ac.th', role: 'admin', positions: [] },
  { key: 'staff01', name: 'น.ส.วิภา สมใจ', email: 'vipa.s@su.ac.th', role: 'staff', positions: [] },
  { key: 'staff02', name: 'นายสกล รักดี', email: 'sakol.r@su.ac.th', role: 'staff', positions: [] },
];

// A pool of additional staff, generated with systematic emails, so
// there's enough variety of requesters to spread 100 bookings across
// without every booking coming from the same handful of people.
const EXTRA_STAFF_NAMES = ['นายประสิทธิ์ ช่วยเหลือ', 'น.ส.อรุณี ตั้งใจ'];

const USERS = [
  ...CORE_USERS,
  ...EXTRA_STAFF_NAMES.map((name, i) => ({ key: `staff${pad2(i + 3)}`, name, email: `staff${pad2(i + 3)}@su.ac.th`, role: 'staff', positions: [] })),
];

const ROOMS = [
  { id: '1637', name: 'ห้อง 1637', capacity: 20, status: 'available', floor: 6, equipment: { projector: 1, whiteboard: 1, ac: 2, mic: 1, tv: 1, plug: 6, sound: 1 } },
  { id: '1638', name: 'ห้อง 1638', capacity: 20, status: 'available', floor: 6, equipment: { projector: 1, whiteboard: 1, ac: 2, mic: 1, tv: 1, plug: 6, sound: 1 } },
  { id: '1639', name: 'ห้อง 1639', capacity: 30, status: 'available', floor: 6, equipment: { projector: 1, whiteboard: 2, ac: 3, mic: 2, tv: 1, plug: 6, sound: 1 } },
  { id: '1640', name: 'ห้อง 1640', capacity: 15, status: 'pending', floor: 6, equipment: { projector: 1, ac: 1, plug: 6 } },
  { id: '1641', name: 'ห้อง 1641', capacity: 20, status: 'available', floor: 6, equipment: { projector: 1, whiteboard: 1, ac: 2, plug: 6 } },
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
  for (const table of ['audit_logs', 'notifications', 'facility_requests', 'templates', 'bookings', 'rooms', 'user_management_positions', 'users', 'management_positions', 'booking_settings', 'holidays']) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table}`);
  }
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

  console.log('Seeding management positions...');
  const positionIdByKey = new Map();
  for (const p of POSITIONS) {
    const created = await prisma.managementPosition.create({ data: { positionName: p.positionName, canApprove: p.canApprove, level: p.level } });
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
      data: { id: r.id, name: r.name, capacity: r.capacity, status: r.status, floor: r.floor, equipment: r.equipment },
    });
  }

  console.log('Seeding booking settings...');
  await prisma.bookingSetting.create({ data: { approvalMode: 'manual', updatedBy: userIdByKey.get('head').id } });

  console.log('Seeding holidays (annual/special Thai public holidays — weekends are out-of-hours too, but computed from the date, not stored here)...');
  // Fixed-date holidays (same month/day every year) — seeded for this year
  // and next so at least one instance of each is always "upcoming"
  // regardless of when this script runs.
  const FIXED_HOLIDAY_DEFS = [
    { month: 1, day: 1, name: 'วันขึ้นปีใหม่' },
    { month: 4, day: 6, name: 'วันจักรี' },
    { month: 4, day: 13, name: 'วันสงกรานต์' },
    { month: 4, day: 14, name: 'วันสงกรานต์' },
    { month: 4, day: 15, name: 'วันสงกรานต์' },
    { month: 5, day: 4, name: 'วันฉัตรมงคล' },
    { month: 6, day: 3, name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี' },
    { month: 7, day: 28, name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว (วันชาติ)' },
    { month: 8, day: 12, name: 'วันแม่แห่งชาติ' },
    { month: 10, day: 13, name: 'วันนวมินทรมหาราช' },
    { month: 10, day: 23, name: 'วันปิยมหาราช' },
    { month: 12, day: 5, name: 'วันพ่อแห่งชาติ' },
    { month: 12, day: 10, name: 'วันรัฐธรรมนูญ' },
    { month: 12, day: 31, name: 'วันสิ้นปี' },
  ];
  const thisYear = new Date().getFullYear();
  for (const y of [thisYear, thisYear + 1]) {
    for (const h of FIXED_HOLIDAY_DEFS) {
      await prisma.holiday.create({ data: { date: new Date(`${y}-${pad2(h.month)}-${pad2(h.day)}`), name: h.name } });
    }
  }
  // Movable holidays (lunar-calendar Buddhist observances, the Royal
  // Ploughing Ceremony, and ad-hoc ครม.-announced special/compensatory
  // days) don't follow a fixed month/day, so there's no formula — each
  // year's exact dates come from the government's own annual calendar
  // announcement. Hardcoded here only for 2569/2026 and 2570/2027 (sourced
  // from the published calendar at seed-authoring time); admin adds future
  // years via /api/holidays (ManageHolidaysView) once announced.
  const MOVABLE_HOLIDAYS_2026 = [
    { date: '2026-01-02', name: 'วันหยุดพิเศษ (ตามมติ ครม.)' },
    { date: '2026-03-03', name: 'วันมาฆบูชา' },
    { date: '2026-05-13', name: 'วันพืชมงคล' },
    { date: '2026-05-31', name: 'วันวิสาขบูชา' },
    { date: '2026-06-01', name: 'วันหยุดชดเชยวันวิสาขบูชา' },
    { date: '2026-07-29', name: 'วันอาสาฬหบูชา' },
  ];
  const MOVABLE_HOLIDAYS_2027 = [
    { date: '2027-02-21', name: 'วันมาฆบูชา' },
    { date: '2027-02-22', name: 'วันหยุดชดเชยวันมาฆบูชา' },
    { date: '2027-05-20', name: 'วันวิสาขบูชา' },
    { date: '2027-07-18', name: 'วันอาสาฬหบูชา' },
  ];
  for (const h of [...MOVABLE_HOLIDAYS_2026, ...MOVABLE_HOLIDAYS_2027]) {
    await prisma.holiday.create({ data: { date: new Date(h.date), name: h.name } });
  }

  console.log(`Generating ${BOOKING_COUNT} sample bookings...`);
  // Anyone who can actually book: every teacher (students never have
  // accounts — a teacher books on their behalf via bookingForStudents).
  // Staff/admin never book.
  const bookers = USERS.filter((u) => u.role === 'teacher');
  const approvers = [userIdByKey.get('head'), userIdByKey.get('viceHead1'), userIdByKey.get('viceHead2')];

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

    const purpose = Math.random() < 0.25 ? pick(TEACHER_ONLY_PURPOSES) : pick(GENERAL_PURPOSES);
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

    const wantsFacility = ['pending', 'approved'].includes(status) && Math.random() < 0.25;
    if (wantsFacility) {
      data.equipment = { mic: Math.random() < 0.5 ? 1 : 2, wb: Math.random() < 0.3 ? 1 : 0 };
      data.food = Math.random() < 0.5 ? ['กาแฟร้อน 10 แก้ว'] : [];
      data.facilityNote = 'ต้องการก่อนเวลาเริ่ม 15 นาที';
    }

    const booking = await prisma.booking.create({ data });
    createdBookings.push({ booking, bookerDef, wantsFacility, status });
  }
  console.log(`  created ${createdBookings.length} bookings (${attempts} attempts)`);

  console.log('Seeding 2 explicit out-of-hours bookings (so the department approval flow for out-of-hours bookings is visible in seeded data)...');
  // The random generator above never lands out-of-hours (START_HOURS tops
  // out at 16:00, and its ±20/+59-day window around "today" rarely lands
  // on a seeded holiday) — these two are hand-crafted so both trigger
  // paths (evening start, holiday date) are demonstrable right after seed.
  const oohBookerDef = TEACHERS.find((t) => t.key === 'teacher04');
  const oohBooker = userIdByKey.get(oohBookerDef.key);
  const upcomingHolidayDate = [thisYear, thisYear + 1]
    .flatMap((y) => FIXED_HOLIDAY_DEFS.map((h) => `${y}-${pad2(h.month)}-${pad2(h.day)}`))
    .find((d) => d >= relDate(0));
  const OOH_BOOKINGS = [
    { room: ROOMS[0], dateStr: relDate(10), start: '18:30', end: '20:00', purpose: 'จัดประชุมวิชาการนอกเวลาราชการ' },
    { room: ROOMS[1], dateStr: upcomingHolidayDate, start: '10:00', end: '12:00', purpose: 'จัดกิจกรรมวันหยุดนักขัตฤกษ์' },
  ];
  for (const b of OOH_BOOKINGS) {
    const booking = await prisma.booking.create({
      data: {
        userId: oohBooker.id, roomId: b.room.id, role: 'teacher',
        bookingDate: new Date(b.dateStr), startTime: toTime(b.start), endTime: toTime(b.end),
        purpose: b.purpose, participants: 15,
        status: 'pending', approvalType: 'manual', isOutOfHours: true,
      },
    });
    await prisma.notification.create({
      data: {
        audience: 'approvers', iconKey: 'cal', iconBg: '#FEF3C7',
        title: `${oohBookerDef.name.split(' ')[0]} ขอจองห้อง ${booking.roomId} (นอกเวลาราชการ)`,
        subtitle: `${b.dateStr} · ${b.start}-${b.end} · ${b.purpose}`,
        status: 'รออนุมัติ', statusBg: '#FEF3C7', statusColor: '#92400e',
        actions: [{ l: 'อนุมัติ', c: 'g', f: 'approve' }, { l: 'ปฏิเสธ', c: 'r', f: 'reject' }],
        bookingId: booking.id, kind: 'booking',
      },
    });
    createdBookings.push({ booking, bookerDef: oohBookerDef, wantsFacility: false, status: 'pending' });
  }

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
        userId: userIdByKey.get(bookerDef.key).id,
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
  console.log('  kaewjamnong_s@su.ac.th      — teacher, holds "หัวหน้าภาควิชา" (can approve)');
  console.log('  wongtaweesap_o@silpakorn.edu — teacher, holds "รองหัวหน้าภาควิชา" (can approve)');
  console.log('  phuriwat.wor@su.ac.th       — teacher, holds "รองหัวหน้าภาควิชา" (can approve)');
  console.log('  anuwat.d@su.ac.th           — admin, no management position');
  console.log('  vipa.s@su.ac.th             — staff');
  console.log(`  + ${TEACHERS.length - 3} more teachers from the real department roster (no management position), ${EXTRA_STAFF_NAMES.length} more staff (staff03..staff04@su.ac.th)`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
