import { ROLE_INFO } from '../../shared/constants.js';
import { formatDatePlain } from '../../shared/dateFormat.js';
import { container } from '../../shared/di/container.js';
import { foodLabel } from '../../shared/foodFormat.js';

function esc(str) {
  return String(str ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function cb(checked, label) {
  return `<span class="cb${checked ? ' on' : ''}"></span>${label ? ` ${esc(label)}` : ''}`;
}

function line(text = '', width = 120) {
  return `<span class="fill" style="min-width:${width}px">${esc(text)}</span>`;
}

function equipmentSummary(equipment) {
  return Object.entries(equipment || {})
    .filter(([, qty]) => qty > 0)
    .map(([k, qty]) => container.repositories.equipmentRepository.label(k, qty))
    .join(', ');
}

function foodSummary(food) {
  const counts = {};
  (food || []).forEach((f) => { counts[f] = (counts[f] || 0) + 1; });
  return Object.entries(counts).map(([name, qty]) => foodLabel(name, qty)).join(', ');
}


function nameRows(names, count, columns) {
  const padded = [...names];
  while (padded.length < count) padded.push('');
  const perCol = Math.ceil(count / columns);
  const cols = [];
  for (let c = 0; c < columns; c += 1) cols.push(padded.slice(c * perCol, (c + 1) * perCol));
  let html = '<div class="namecols">';
  cols.forEach((col, ci) => {
    html += '<div class="namecol">';
    col.forEach((n, i) => {
      const num = ci * perCol + i + 1;
      html += `<div class="nameline">${num}. ${n ? esc(n) : '<span class="fill" style="min-width:100px"></span>'}</div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function attendeeTableRows(names, rowCount) {
  let rows = '';
  for (let i = 0; i < rowCount; i += 1) {
    const name = names[i] || '';
    rows += `<tr><td class="tc-no">${i + 1}</td><td class="tc-name">${esc(name)}</td><td></td><td></td></tr>`;
  }
  return rows;
}

// Room checkboxes mirror the department's actual, current room list (from
// ManageRoomsView) rather than the four rooms hardcoded on the paper form —
// new rooms added later show up here automatically. Falls back to a single
// checked entry for the booking's own room if the list hasn't loaded.
function roomCheckboxes(rooms, selectedRoomId) {
  const list = rooms.length ? rooms : [{ id: selectedRoomId, name: '' }];
  const items = [...list]
    .sort((a, b) => String(a.id).localeCompare(String(b.id), 'th', { numeric: true }))
    .map((r) => {
      const label = r.name && !r.name.includes(String(r.id)) ? `${r.name} (${r.id})` : (r.name || `ห้อง ${r.id}`);
      return `<span class="room-cb">${cb(String(r.id) === String(selectedRoomId), label)}</span>`;
    })
    .join('');
  return `<div class="roomlist">${items}</div>`;
}

/** window.open()+document.write() against a separate window/document —
 * zero coupling to the React tree. Mirrors the department's official
 * "บันทึกข้อความ" paper form (room/catering request memo) plus its
 * 30-row attendee sign-in sheet, auto-filled from booking data wherever
 * the app actually tracks the corresponding field; anything the paper
 * form asks for that the system has no data for (physical signatures,
 * a checker distinct from the approver, the ครุฑ seal) is left blank
 * for hand-filling, exactly as it would be on a printed blank form. */
export function printBookingReceipt(booking) {
  // window.open() must happen synchronously in the click handler or popup
  // blockers kill it — the room list is fetched after, and the document is
  // written in once it's ready.
  const win = window.open('', '_blank', 'width=900,height=700');
  renderInto(win, booking);
}

async function renderInto(win, booking) {
  const { roomRepository } = container.repositories;
  let rooms = roomRepository.getAll();
  if (!rooms.length) {
    try { await roomRepository.refresh(); } catch { /* fall back to selected-room-only list below */ }
    rooms = roomRepository.getAll();
  }

  const roleLabel = ROLE_INFO[booking.role]?.label || booking.role || '';
  const teachers = booking.participatingTeachers || [];
  const bookingForStudentsText = (booking.bookingForStudents || [])
    .map((s) => `${s.name} (${s.studentId})`)
    .join(', ');
  const purposeIsMeeting = booking.title === 'จัดประชุม';
  const purposeIsThesis = booking.title === 'จัดสอบโครงงานปริญญานิพนธ์';
  const purposeOtherText = !purposeIsMeeting && !purposeIsThesis ? booking.title : '';
  // Food and the attendee list/sign-in sheet only make sense for an actual
  // meeting or thesis defense — other purposes (teaching, exams, lab
  // sessions, etc.) skip them and page 2 entirely.
  const showAttendees = purposeIsMeeting || purposeIsThesis;
  const equipText = equipmentSummary(booking.equipment);
  const foodText = foodSummary(booking.food);
  const timeDisplay = (booking.time || '').replace('-', ' – ');
  // Multi-day booking: the whole range, when the caller has its days.
  const days = (booking.groupDays || []).filter((d) => ['pending', 'approved'].includes(d.status)).map((d) => d.date).sort();
  const bookingDate = days.length > 1
    ? `${formatDatePlain(days[0])} – ${formatDatePlain(days[days.length - 1])} (${days.length} วัน)`
    : formatDatePlain(booking.date);
  const memoDate = formatDatePlain(booking.createdAt) || formatDatePlain(new Date());

  const approvedOn = booking.status === 'approved';
  const rejectedOn = booking.status === 'rejected';
  const otherOn = booking.status === 'pending' || booking.status === 'cancelled';
  const otherNote = booking.status === 'pending' ? 'อยู่ระหว่างพิจารณา'
    : booking.status === 'cancelled' ? 'ยกเลิกการจองแล้ว' : '';
  // Absolute URL: the popup is its own document (about:blank origin), a
  // relative path would resolve wrong — /public assets are served from the
  // app's own origin in both dev and production builds.
  const sealUrl = `${window.location.origin}/silpakorn-seal.png`;

  win.document.write(`<!DOCTYPE html><html lang="th"><head>
    <meta charset="UTF-8">
    <title>บันทึกข้อความขอใช้ห้อง ${esc(booking.id)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Sarabun,sans-serif;color:#000;background:#e8e8e8;padding:24px;font-size:13.5px;line-height:1.45}
      .page{max-width:794px;margin:0 auto 24px;background:white;padding:40px 48px;box-shadow:0 2px 10px rgba(0,0,0,.15);display:flex;flex-direction:column}
      .approval-zone{margin-top:auto;padding-top:24px}
      .toolbar{max-width:794px;margin:0 auto 14px;text-align:center}
      .toolbar button{padding:9px 24px;border-radius:8px;font-size:13px;font-family:Sarabun,sans-serif;cursor:pointer;margin:0 4px}
      .btn-print{background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none}
      .btn-close{background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0}
      .seal{display:block;margin:0 auto 6px;height:56px}
      .title{text-align:center;font-size:19px;font-weight:700;margin-bottom:14px}
      .row{display:flex;justify-content:space-between;margin-bottom:5px}
      .indent{padding-left:36px}
      .indent2{padding-left:56px}
      p{margin-bottom:7px}
      .fill{display:inline-block;border-bottom:1px dotted #000;padding:0 2px}
      .cb{display:inline-block;width:11px;height:11px;border:1px solid #000;margin:0 4px 0 12px;vertical-align:middle;position:relative;top:-1px}
      .cb:first-child{margin-left:0}
      .cb.on::after{content:'✓';position:absolute;left:1px;top:-4px;font-size:10px;font-weight:700}
      .roomlist{margin:4px 0 7px}
      .room-cb{display:inline-block;white-space:nowrap;margin:2px 14px 2px 0}
      .room-cb .cb{margin:0 4px 0 0}
      .namecols{display:flex;gap:24px;margin:6px 0 8px 0}
      .namecol{flex:1}
      .nameline{margin-bottom:3px;white-space:nowrap}
      .sig{text-align:center;width:220px}
      .sig-box{margin-top:26px}
      .sig-line{border-bottom:1px dotted #000;height:1px;margin-bottom:4px}
      .sig-blocks{display:flex;justify-content:flex-end;margin-top:6px}
      .sig-blocks-between{display:flex;justify-content:space-between;margin-top:6px}
      table.att{width:100%;border-collapse:collapse;margin-top:6px}
      table.att th,table.att td{border:1px solid #000;padding:1.5px 6px;font-size:11.5px}
      table.att th{background:#f2f2f2;text-align:center}
      .tc-no{width:36px;text-align:center}
      .tc-name{width:220px}
      .meta-row{display:flex;gap:18px;flex-wrap:wrap;margin:6px 0 8px}
      @page{size:A4;margin:11mm 14mm}
      @media print{
        body{background:white;padding:0}
        .page{box-shadow:none;margin:0;padding:0;max-width:none;min-height:274mm;page-break-after:always}
        .page:last-child{page-break-after:auto}
        .toolbar{display:none}
      }
    </style>
  </head><body>
    <div class="toolbar">
      <button class="btn-print" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
      <button class="btn-close" onclick="window.close()">ปิด</button>
    </div>

    <div class="page">
      <img src="${sealUrl}" class="seal" alt="ตราสัญลักษณ์มหาวิทยาลัยศิลปากร" />
      <div class="title">บันทึกข้อความ</div>
      <div class="row"><span>ส่วนงาน ${line('ภาควิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยศิลปากร', 380)}</span></div>
      <div class="row">
        <span>ที่ ${line('', 160)}</span>
        <span>วันที่ ${line(memoDate, 200)}</span>
      </div>
      <div class="row"><span>เรื่อง ${line('ขอความอนุเคราะห์ใช้ห้อง/จัดเลี้ยง', 380)}</span></div>
      <p style="margin-top:14px">เรียน หัวหน้าภาควิชาวิทยาการคอมพิวเตอร์</p>

      <p class="indent" style="margin-top:14px">
        ด้วย ${line(booking.user, 220)} (${esc(roleLabel)}) มีความประสงค์จะขอใช้ห้องของภาควิชาฯ ดังรายละเอียดต่อไปนี้
      </p>

      <p>มีความประสงค์
        ${cb(purposeIsMeeting, 'จัดประชุม')}
        ${cb(purposeIsThesis, 'จัดสอบโครงงานปริญญานิพนธ์')}
        ${cb(Boolean(purposeOtherText), '')} ${line(purposeOtherText, 180)}
      </p>
      ${booking.note ? `<p>(ระบุรายละเอียด) ${line(booking.note, 400)}</p>` : ''}
      ${bookingForStudentsText ? `<p>จองแทนนักศึกษา: ${line(bookingForStudentsText, 400)}</p>` : ''}

      <p style="margin-top:10px">จึงขอความอนุเคราะห์ขอใช้</p>
      ${roomCheckboxes(rooms, booking.room)}
      <p>และอุปกรณ์ ${cb(Boolean(equipText), '')} ${line(equipText || '-', 300)}</p>

      <div class="meta-row">
        <span>ในวัน${line(bookingDate, 180)}</span>
        <span>เวลา ${line(timeDisplay, 160)}</span>
      </div>

      ${showAttendees ? `<p>${cb(Boolean(foodText), 'อาหารว่าง/เครื่องดื่ม/อาหารกลางวัน (ระบุประเภท)')} ${line(foodText || '-', 260)}</p>

      <p style="margin-top:10px">โดยมีผู้เข้าร่วมจำนวน ${line(String(booking.participants ?? teachers.length ?? ''), 60)} คน ดังรายนามต่อไปนี้${teachers.length > 15 ? ' (รายชื่อทั้งหมดอยู่ในใบลงชื่อผู้เข้าร่วม หน้า 2)' : ''}</p>
      ${nameRows(teachers, 15, 3)}` : ''}

      <p style="margin-top:6px">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติด้วย</p>

      <div class="sig-blocks">
        <div class="sig">
          <div class="sig-box"><div class="sig-line"></div></div>
          <div>( ${esc(booking.user)} )</div>
          <div>ตำแหน่ง ${esc(roleLabel)}</div>
        </div>
      </div>

      <div class="approval-zone">
        <p>เรียน หัวหน้าภาควิชาวิทยาการคอมพิวเตอร์</p>
        <p>เพื่อโปรดพิจารณาอนุญาต ทั้งนี้ได้ดำเนินการตรวจสอบว่าห้องว่างตามวัน และเวลาที่ขอมาดังกล่าวแล้ว</p>

        <div class="sig-blocks">
          <div class="sig">
            <div class="sig-box"><div class="sig-line"></div></div>
            <div>( ${line('', 160)} )</div>
            <div>ผู้ตรวจสอบ</div>
          </div>
        </div>

        <p style="margin-top:22px">คำสั่งหัวหน้าภาควิชา</p>
        <p>
          ${cb(approvedOn, 'อนุญาต')}
          ${cb(rejectedOn, 'ไม่อนุญาต')} ${rejectedOn ? line(booking.rejectReason, 180) : ''}
          ${cb(otherOn, 'อื่นๆ')} ${line(otherOn ? otherNote : '', 180)}
        </p>

        <div class="sig-blocks">
          <div class="sig">
            <div class="sig-box"><div class="sig-line"></div></div>
            <div>( ${line(booking.approvedByName || '', 160)} )</div>
            <div>หัวหน้าภาควิชาวิทยาการคอมพิวเตอร์</div>
          </div>
        </div>
      </div>
    </div>

    ${showAttendees ? `<div class="page">
      <img src="${sealUrl}" class="seal" alt="ตราสัญลักษณ์มหาวิทยาลัยศิลปากร" />
      <div class="title">รายชื่อผู้เข้าร่วมการประชุม/กิจกรรม</div>
      <p>เรื่อง ${line(booking.title, 380)}</p>
      <div class="meta-row">
        <span>วันที่ ${line(bookingDate, 200)}</span>
        <span>เวลา ${line(timeDisplay, 160)}</span>
      </div>
      <p>ณ ห้อง ${line(booking.room, 100)} ภาควิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยศิลปากร</p>

      <table class="att">
        <thead>
          <tr><th>ลำดับที่</th><th>ชื่อ - สกุล</th><th>ตำแหน่ง/หน่วยงาน</th><th>ลายมือชื่อ</th></tr>
        </thead>
        <tbody>
          ${attendeeTableRows(teachers, 30)}
        </tbody>
      </table>

      <p style="margin-top:16px">ขอรับรองว่าเป็นการจัดประชุม/กิจกรรมและมีผู้เข้าร่วมตามรายชื่อนี้จริง</p>

      <div class="sig-blocks">
        <div class="sig">
          <div class="sig-box"><div class="sig-line"></div></div>
          <div>( ${esc(booking.user)} )</div>
          <div>ตำแหน่ง ${esc(roleLabel)}</div>
        </div>
      </div>
    </div>` : ''}
  </body></html>`);
  win.document.close();
  setTimeout(() => win.focus(), 300);
}
