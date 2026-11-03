import { formatDatePlain } from '../../shared/dateFormat.js';
import { splitFoodCategory } from '../../shared/foodFormat.js';

/** window.open()+document.write() against a separate window/document — the
 * department's paper form "ขอความอนุเคราะห์ใช้ห้อง/จัดเลี้ยง" (page 1) and its
 * attendee sign-in sheet (page 2), filled in from a booking a teacher made
 * on students' behalf — including Staff's check (who looks after the catering
 * / opens the room) once recorded. Whatever the system has no data for (memo
 * number, signatures) is left blank to fill by hand, as in printFacultyMemo.js. */

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// The rooms printed as tick boxes on the paper form; any other room goes on
// its "ห้อง ……" line.
const FORM_ROOMS = [
  ['1638', 'ห้องประชุม (1638)'],
  ['1639', 'ห้องอเนกประสงค์ (1639)'],
  ['1640', 'ห้อง COMPACT (1640)'],
  ['1641', 'ห้อง COM-MA-DY (1641)'],
];
const FORM_PURPOSES = ['จัดประชุม', 'จัดสอบโครงงานปริญญานิพนธ์'];
// Each food item carries the category the booker picked (see
// splitFoodCategory); items saved before the picker fall back to a guess:
// a main dish goes on the lunch line, anything else on the snack line.
const MEAL_PATTERN = /ข้าว|ก๋วยเตี๋ยว|บะหมี่|เส้น|ผัด|แกง|สุกี้|ขนมจีน|อาหารกลางวัน|อาหารกล่อง|อาหารจานเดียว/;
const NAME_SLOTS = 15;
const SIGN_IN_ROWS = 30;

function esc(str) {
  return String(str ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function line(text = '', width = 120) {
  return `<span class="fill" style="min-width:${width}px">${esc(text)}</span>`;
}

const box = (on) => (on ? '☑' : '☐');
const circle = (on) => (on ? '◉' : '○');

function parts(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

const longDate = (iso) => {
  const p = parts(iso);
  return `วัน${THAI_DAYS[p.dow]}ที่ ${p.d} ${THAI_MONTHS[p.m - 1]} ${p.y + 543}`;
};

// One day, a run of consecutive days ("… ถึง …"), or a list (weekly repeats).
function describeDays(dates) {
  if (dates.length === 1) return longDate(dates[0]);
  const consecutive = dates.every((d, i) => i === 0 || new Date(d) - new Date(dates[i - 1]) === 86400000);
  if (consecutive) return `${longDate(dates[0])} ถึง ${longDate(dates[dates.length - 1])}`;
  return dates.map((d) => { const p = parts(d); return `${p.d} ${THAI_MONTHS[p.m - 1]}`; }).join(', ') + ` ${parts(dates[dates.length - 1]).y + 543}`;
}

/**
 * @param {import('../../domain/entities/Booking.js').Booking} booking — a fetched one (groupDays for a multi-day booking)
 * @param {{ equipmentItems?: string[], headName?: string, titlesByName?: Record<string,string> }} extra —
 *   equipment labels, the head of department's name, and name -> position
 *   (หัวหน้า/รองหัวหน้าภาควิชา) for the teachers who hold one; others are อาจารย์
 */
export function printStudentRoomRequest(booking, { equipmentItems = [], headName = '', titlesByName = {} } = {}) {
  const titleOf = (name) => titlesByName[name] || 'อาจารย์';
  const bookerTitle = titleOf(booking.user);
  // Student ids are digits — a stray Thai vowel mark typed into one must not print.
  const students = (booking.bookingForStudents || []).map((s) => ({ ...s, studentId: String(s.studentId ?? '').replace(/\D/g, '') }));
  // The booker is in here only if they ticked "ฉันเข้าร่วมด้วย" (BookingView).
  const teachers = [...new Set(booking.participatingTeachers || [])];
  const days = (booking.groupDays || []).filter((d) => ['pending', 'approved'].includes(d.status)).map((d) => d.date).sort();
  const dates = days.length > 1 ? days : [booking.date];
  const [start, end] = (booking.time || '').split('-');

  // Purpose is stored as "<purpose>: <detail>" (see purposeWithDetail).
  const [basePurpose, ...rest] = String(booking.title || '').split(': ');
  const purposeDetail = rest.join(': ');
  const formPurpose = FORM_PURPOSES.find((p) => basePurpose === p);
  const formRoom = FORM_ROOMS.find(([id]) => id === String(booking.room));
  const hasProjector = equipmentItems.some((e) => /projector|โปรเจก|ฉายภาพ/i.test(e));
  const otherEquipment = equipmentItems.filter((e) => !/projector|โปรเจก|ฉายภาพ/i.test(e));
  const food = booking.food || [];
  const isMeal = ({ category, item }) => (category ? category === 'อาหารกลางวัน' : MEAL_PATTERN.test(item));
  const foodItems = food.map(splitFoodCategory);
  const meals = foodItems.filter(isMeal).map((f) => f.item);
  const snacks = foodItems.filter((f) => !isMeal(f)).map((f) => f.item);

  // Attendees, not mixed: the teachers first, by position (หัวหน้าภาควิชา,
  // then รองหัวหน้าภาควิชา, then อาจารย์ — the booker among them only when
  // attending), then the students. The count is never below the names listed.
  const rank = (title) => (title === 'หัวหน้าภาควิชา' ? 0 : title.startsWith('รองหัวหน้า') ? 1 : 2);
  const teacherRows = teachers
    .map((name) => ({ name, role: titleOf(name) }))
    .sort((x, y) => rank(x.role) - rank(y.role));
  const attendees = [
    ...teacherRows,
    ...students.map((s) => ({ name: s.name, role: `นักศึกษา รหัส ${s.studentId}` })),
  ];
  const participantCount = Math.max(Number(booking.participants) || 0, attendees.length);
  const nameCell = (i) => `<div class="name-cell">${i + 1}${line(attendees[i]?.name || '', 0)}</div>`;
  const requester = students[0];
  const approved = booking.status === 'approved';
  // Staff's assignment (BookingDetailModal) wins; else the out-of-hours
  // room-responsible person the booker named.
  const opener = booking.openerAssignee
    || (booking.roomResponsibleName ? `${booking.roomResponsibleName}${booking.roomResponsiblePhone ? ` (โทร. ${booking.roomResponsiblePhone})` : ''}` : '');

  // Sign-in sheet date: one day, or the day numbers when they share a month.
  const first = parts(dates[0]);
  const sameMonth = dates.every((d) => { const p = parts(d); return p.m === first.m && p.y === first.y; });
  const sheetDay = sameMonth ? dates.map((d) => parts(d).d).join(', ') : describeDays(dates);

  const win = window.open('', '_blank', 'width=900,height=800');
  win.document.write(`<!DOCTYPE html><html lang="th"><head>
    <meta charset="UTF-8">
    <title>แบบฟอร์มขอใช้ห้อง ${esc(booking.id)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Sarabun,sans-serif;color:#000;background:#e8e8e8;padding:24px;font-size:14.5px;line-height:1.75}
      .page{max-width:794px;min-height:1123px;margin:0 auto 18px;background:white;padding:36px 56px;box-shadow:0 2px 10px rgba(0,0,0,.15)}
      .toolbar{max-width:794px;margin:0 auto 14px;text-align:center}
      .toolbar button{padding:9px 24px;border-radius:8px;font-size:13px;font-family:Sarabun,sans-serif;cursor:pointer;margin:0 4px}
      .btn-print{background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none}
      .btn-close{background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0}
      .hdr{display:flex;align-items:center;gap:10px;margin-bottom:14px}
      .seal{height:58px;flex-shrink:0}
      .title{flex:1;text-align:center;font-size:22px;font-weight:700;padding-right:58px}
      .field{display:flex;align-items:baseline;gap:6px;margin-bottom:4px}
      .field b{flex-shrink:0;font-weight:700}
      .field .fill{flex:1}
      .fill{display:inline-block;border-bottom:1px dotted #000;padding:0 4px;min-height:1.3em}
      .row{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;margin-bottom:4px}
      .indent{padding-left:38px}
      .names{display:grid;grid-template-columns:repeat(3,1fr);gap:2px 16px;margin:4px 0 10px}
      .name-cell{display:flex;align-items:baseline;gap:4px}
      .name-cell .fill{flex:1}
      .sig{text-align:center;width:300px;margin-left:auto;margin-top:18px}
      .sig-box{height:26px}
      .section{margin-top:18px}
      u{text-underline-offset:3px}
      h2{text-align:center;font-size:16px;font-weight:700;margin-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #000;padding:2px 8px;font-size:13px;height:25px}
      th{font-weight:700}
      td.c{text-align:center}
      @page{size:A4;margin:12mm 18mm}
      @media print{body{background:white;padding:0}.page{box-shadow:none;margin:0;padding:0;max-width:none;min-height:auto;page-break-after:always}.page:last-child{page-break-after:auto}.toolbar{display:none}}
    </style>
  </head><body>
    <div class="toolbar">
      <button class="btn-print" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
      <button class="btn-close" onclick="window.close()">ปิด</button>
    </div>

    <div class="page">
      <div class="hdr">
        <img src="${window.location.origin}/silpakorn-seal.png" class="seal" alt="ตราสัญลักษณ์มหาวิทยาลัยศิลปากร" />
        <div class="title">บันทึกข้อความ</div>
      </div>
      <div class="field"><b>ส่วนงาน</b> ${line('ภาควิชาคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยศิลปากร วิทยาเขตพระราชวังสนามจันทร์', 0)}</div>
      <div class="row"><span><b>ที่</b> อว 8613.7/${line('', 140)}</span><span style="flex:1;display:flex;gap:6px"><b>วันที่</b> ${line(formatDatePlain(new Date()), 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span></div>
      <div class="field"><b>เรื่อง</b> ${line('ขอความอนุเคราะห์ใช้ห้อง/จัดเลี้ยง', 0)}</div>

      <p style="margin-top:12px">เรียน หัวหน้าภาควิชาคอมพิวเตอร์</p>

      <div class="field indent" style="margin-top:8px"><span>ด้วย</span> ${line(`${students.map((s) => `${s.name} (${s.studentId})`).join(', ')} นักศึกษาภาควิชาคอมพิวเตอร์ ในความดูแลของ ${booking.user}`, 0)}</div>
      <div class="row"><span>มีความประสงค์</span>
        <span>${box(formPurpose === 'จัดประชุม')} จัดประชุม</span>
        <span>${box(formPurpose === 'จัดสอบโครงงานปริญญานิพนธ์')} จัดสอบโครงงานปริญญานิพนธ์</span>
        <span style="flex:1;display:flex;gap:4px">${box(!formPurpose)} ${line(formPurpose ? '' : basePurpose, 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span>
      </div>
      <div class="field"><span>(ระบุรายละเอียด)</span> ${line(purposeDetail, 0)}</div>
      <div class="row"><span>จึงขอความอนุเคราะห์ขอใช้</span>
        ${FORM_ROOMS.map(([id, label]) => `<span>${box(String(booking.room) === id)} ${esc(label)}</span>`).join('')}
        <span style="flex:1;display:flex;gap:4px">${box(!formRoom)} ห้อง ${line(formRoom ? '' : booking.room, 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span>
      </div>
      <div class="row"><span>และอุปกรณ์</span>
        <span>${circle(false)} คอมพิวเตอร์</span>
        <span>${circle(hasProjector)} เครื่องฉายภาพ</span>
        <span style="flex:1;display:flex;gap:4px">${circle(otherEquipment.length > 0)} ${line(otherEquipment.join(', '), 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span>
      </div>
      <div class="row"><span style="flex:3;display:flex;gap:4px">ในวัน ${line(describeDays(dates), 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span><span style="flex:1;display:flex;gap:4px">เวลา ${line(`${start || ''} – ${end || ''} น.`, 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span></div>
      <div class="row"><span style="flex:1;display:flex;gap:4px">${box(snacks.length > 0)} อาหารว่าง / เครื่องดื่ม (ระบุประเภท) ${line(snacks.join(', '), 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span><span>เวลา ${line('', 60)} น.</span></div>
      <div class="row"><span style="flex:1;display:flex;gap:4px">${box(meals.length > 0)} อาหารกลางวัน (ระบุประเภท) ${line(meals.join(', '), 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span><span>เวลา ${line('', 60)} น.</span></div>
      <div class="row"><span>โดยมีผู้เข้าร่วมจำนวน ${line(String(participantCount), 70)} คน ดังรายนามต่อไปนี้</span></div>
      <div class="names">${Array.from({ length: NAME_SLOTS }, (_, i) => nameCell(i)).join('')}</div>

      <p class="indent">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติด้วย</p>
      <div class="sig">
        <div class="sig-box"></div>
        <div>( ${requester ? esc(requester.name) : '&nbsp;'.repeat(50)} )</div>
        <div>ตำแหน่ง ${line(requester ? `นักศึกษา รหัส ${requester.studentId}` : '', 180)}</div>
      </div>

      <div class="section">
        <p>เรียน หัวหน้าภาควิชาคอมพิวเตอร์</p>
        <p class="indent">เพื่อโปรดพิจารณาอนุญาต ทั้งนี้ได้ดำเนินการตรวจสอบว่าห้องว่างตามวันและเวลาที่ขอมาดังกล่าว โดยมอบหมายให้</p>
        <div class="row"><span style="flex:1;display:flex;gap:4px">${box(Boolean(booking.cateringAssignee))} ${line(booking.cateringAssignee || '', 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span><span>เป็นผู้ดูแลการจัดเลี้ยง และ</span></div>
        <div class="row"><span style="flex:1;display:flex;gap:4px">${box(Boolean(opener))} ${line(opener, 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span><span>เป็นผู้ดูแลการเปิด-ปิดห้อง</span></div>
        <div class="sig">
          <div class="sig-box"></div>
          <div>( ${booking.checkedByName ? esc(booking.checkedByName) : '&nbsp;'.repeat(50)} )</div>
          <div>ผู้ตรวจสอบ</div>
        </div>
      </div>

      <div class="section">
        <p><u>คำสั่งหัวหน้าภาควิชา</u></p>
        <div class="row"><span>${box(approved)} อนุญาต</span><span>${box(false)} ไม่อนุญาต</span><span style="flex:1;display:flex;gap:4px">${box(false)} อื่น ๆ ${line('', 0).replace('class="fill"', 'class="fill" style="flex:1"')}</span></div>
        <div class="sig">
          <div class="sig-box"></div>
          <div>( ${headName ? esc(headName) : '&nbsp;'.repeat(50)} )</div>
          <div>หัวหน้าภาควิชา</div>
        </div>
      </div>
    </div>

    <div class="page">
      <h2>รายชื่อผู้เข้าร่วมการประชุม/กิจกรรม</h2>
      <div class="field"><b>เรื่อง</b> ${line(booking.title, 0)}</div>
      <div class="row"><b>วันที่</b> ${line(sheetDay, 60)} <b>เดือน</b> ${line(sameMonth ? THAI_MONTHS[first.m - 1] : '', 110)} <b>พ.ศ.</b> ${line(sameMonth ? String(first.y + 543) : '', 60)} <b>เวลา</b> ${line(start || '', 50)} <b>น. ถึง</b> ${line(end || '', 50)} <b>น.</b></div>
      <div class="row"><b>ณ ห้อง</b> ${line(String(booking.room), 140)} <b>ภาควิชาคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยศิลปากร</b></div>
      <table>
        <thead><tr><th style="width:64px;white-space:nowrap">ลำดับที่</th><th>ชื่อ - สกุล</th><th>ตำแหน่ง/หน่วยงาน</th><th>ลายมือชื่อ</th></tr></thead>
        <tbody>
          ${Array.from({ length: SIGN_IN_ROWS }, (_, i) => `<tr><td class="c">${i + 1}</td><td>${esc(attendees[i]?.name || '')}</td><td>${esc(attendees[i]?.role || '')}</td><td style="width:150px"></td></tr>`).join('')}
        </tbody>
      </table>
      <p style="margin-top:14px;font-weight:700">ขอรับรองว่าเป็นการจัดประชุม/กิจกรรมและมีผู้เข้าร่วมตามรายชื่อนี้จริง</p>
      <div class="sig">
        <div class="sig-box"></div>
        <div>( ${esc(booking.user || '')} )</div>
        <div>ตำแหน่ง ${line(bookerTitle, 180)}</div>
      </div>
    </div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.focus(), 300);
}
