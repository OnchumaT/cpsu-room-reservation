const ROLE_LABEL = { teacher: 'อาจารย์', staff: 'เจ้าหน้าที่', admin: 'ผู้ดูแล' };
import { formatDatePlain } from '../../shared/dateFormat.js';
import { qrSvg } from '../../shared/checkIn.js';

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// "2026-10-26" -> "วันอาทิตย์ที่ 26 ตุลาคม 2569" — spelled out in full so the
// date reads at a glance from the corridor.
function thaiLongDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `วัน${THAI_DAYS[dow]}ที่ ${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

const THAI_DAYS_ABBR = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_MONTHS_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function dateParts(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

// First–last day of a multi-day booking in one line, naming the month/year
// only where they change: "จันทร์ 26 – ศุกร์ 30 ตุลาคม 2569",
// "จันทร์ 26 ตุลาคม – อังคาร 3 พฤศจิกายน 2569".
function thaiDateRange(firstIso, lastIso) {
  const a = dateParts(firstIso);
  const b = dateParts(lastIso);
  const tail = `${b.d} ${THAI_MONTHS[b.m - 1]} ${b.y + 543}`;
  const head = a.y !== b.y ? `${a.d} ${THAI_MONTHS[a.m - 1]} ${a.y + 543}`
    : a.m !== b.m ? `${a.d} ${THAI_MONTHS[a.m - 1]}`
      : `${a.d}`;
  return `${THAI_DAYS[a.dow]} ${head} – ${THAI_DAYS[b.dow]} ${tail}`;
}

// Days inside the range that aren't booked (skipped weekends/holidays), as
// one short line: "ไม่รวมวันเสาร์-อาทิตย์ และ จ. 13 เม.ย." — '' when none.
function skippedDaysNote(dates) {
  const booked = new Set(dates);
  const missing = [];
  for (let t = new Date(dates[0]).getTime(); t <= new Date(dates[dates.length - 1]).getTime(); t += 86400000) {
    const iso = new Date(t).toISOString().slice(0, 10);
    if (!booked.has(iso)) missing.push(dateParts(iso));
  }
  if (!missing.length) return '';
  const isWeekend = (p) => p.dow === 0 || p.dow === 6;
  const others = missing.filter((p) => !isWeekend(p)).map((p) => `${THAI_DAYS_ABBR[p.dow]} ${p.d} ${THAI_MONTHS_ABBR[p.m - 1]}`);
  const parts = [...(missing.some(isWeekend) ? ['วันเสาร์-อาทิตย์'] : []), ...others];
  return `ไม่รวม${parts.join(' และ ')}`;
}

function esc(str) {
  return String(str ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/** window.open()+document.write() against a separate window/document —
 * zero coupling to the React tree. A formal notice for posting at a room's
 * door, styled to match the department's official documents (seal, black
 * text on white, bordered fields) rather than the app's own UI chrome. */
// `checkInUrl` (the room's check-in QR link, fetched by the caller) adds a
// "scan to check in" block — left out when it couldn't be fetched.
// `graceMinutes` is the admin's current setting (ตั้งค่าระบบ), printed as-is.
export function printRoomNotice(booking, checkInUrl = '', graceMinutes = 15) {
  const roleLabel = ROLE_LABEL[booking.role] || booking.role;
  const isApproved = booking.status === 'approved';
  const printedOn = formatDatePlain(new Date());
  const sealUrl = `${window.location.origin}/silpakorn-seal.png`;
  // Multi-day booking (groupDays comes with a fetched booking): the box shows
  // every day the room is in use, not only this one.
  const days = (booking.groupDays || []).filter((d) => ['pending', 'approved'].includes(d.status)).map((d) => d.date).sort();
  const useDates = days.length > 1 ? days : [booking.date];
  const timeText = `${(booking.time || '').replace('-', ' – ')} น.`;

  const win = window.open('', '_blank', 'width=800,height=700');
  win.document.write(`<!DOCTYPE html><html lang="th"><head>
    <meta charset="UTF-8">
    <title>ป้ายหน้าห้อง ${esc(booking.room)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Sarabun,sans-serif;color:#000;background:#e8e8e8;display:flex;flex-direction:column;align-items:center;padding:30px;gap:18px}
      .notice{width:600px;background:white;padding:36px 44px;box-shadow:0 2px 10px rgba(0,0,0,.15)}
      .head{display:flex;align-items:center;justify-content:space-between;gap:16px}
      .brand{display:flex;align-items:center;gap:12px}
      .seal{height:72px;flex-shrink:0}
      .org{font-size:13px;line-height:1.5}
      .org .u{font-size:17px;font-weight:700}
      .org .doc-title{font-size:15px;font-weight:700;margin-top:6px}
      .org .doc-sub{font-size:11px;color:#444}
      .room{text-align:right;flex-shrink:0}
      .room-number{font-size:52px;font-weight:800;letter-spacing:.02em;line-height:1}
      .status{display:inline-block;margin-top:8px;border:1.5px solid #000;border-radius:20px;padding:3px 14px;font-size:12px;font-weight:600}
      hr{border:none;border-top:1.5px solid #000;margin:16px 0 18px}
      .when{border:3px solid #000;border-radius:10px;padding:14px 18px;text-align:center;margin-bottom:16px}
      .when .lbl{font-size:13px;font-weight:700;letter-spacing:.04em}
      .when .date{font-size:26px;font-weight:800;line-height:1.35;margin-top:4px}
      .when .range{font-size:22px;font-weight:800;line-height:1.35;margin-top:4px}
      .when .skip{font-size:13px;font-weight:600;margin-top:2px}
      .when .time{display:inline-block;margin-top:8px;border-top:1.5px solid #000;padding-top:6px;font-size:22px;font-weight:700}
      table.info{width:100%;border-collapse:collapse;margin-top:8px}
      table.info td{border:1px solid #000;padding:9px 12px;font-size:13.5px;vertical-align:top}
      table.info td:first-child{width:34%;color:#333;background:#f5f5f5;font-weight:600}
      .checkin{display:flex;align-items:center;gap:18px;margin-top:18px;border:1.5px solid #000;padding:12px 16px}
      .checkin .qr{width:120px;height:120px;flex-shrink:0}
      .checkin .qr svg{width:100%;height:100%}
      .checkin b{font-size:15px}
      .checkin div{font-size:12.5px;line-height:1.6}
      .footer{text-align:center;font-size:11px;color:#555;margin-top:22px;padding-top:12px;border-top:1px solid #ccc}
      .print-btn{padding:12px 32px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;box-shadow:0 4px 16px rgba(56,65,157,.3)}
      @page{size:A4;margin:14mm}
      @media print{body{background:white;padding:0}.notice{box-shadow:none;width:100%}.print-btn{display:none}}
    </style>
  </head><body>
    <div class="notice">
      <div class="head">
        <div class="brand">
          <img src="${sealUrl}" class="seal" alt="ตราสัญลักษณ์มหาวิทยาลัยศิลปากร" />
          <div class="org">
            <div class="u">มหาวิทยาลัยศิลปากร</div>
            <div>คณะวิทยาศาสตร์</div>
            <div>ภาควิชาวิทยาการคอมพิวเตอร์</div>
            <div class="doc-title">ป้ายแจ้งการใช้ห้อง</div>
            <div class="doc-sub">Room Reservation Notice</div>
          </div>
        </div>
        <div class="room">
          <div class="room-number">ห้อง ${esc(booking.room)}</div>
          <div class="status">${isApproved ? '✓ อนุมัติการจองแล้ว' : '⏳ รอการอนุมัติ'}</div>
        </div>
      </div>
      <hr />
      <div class="when">
        <div class="lbl">วันที่ใช้ห้อง${useDates.length > 1 ? ` · ${useDates.length} วัน` : ''}</div>
        ${useDates.length > 1
          ? `<div class="range">${esc(thaiDateRange(useDates[0], useDates[useDates.length - 1]))}</div>
             ${skippedDaysNote(useDates) ? `<div class="skip">(${esc(skippedDaysNote(useDates))})</div>` : ''}`
          : `<div class="date">${esc(thaiLongDate(useDates[0]))}</div>`}
        <div class="time">เวลา ${esc(timeText)}${useDates.length > 1 ? ' (ทุกวัน)' : ''}</div>
      </div>
      <table class="info">
        <tr><td>รหัสการจอง</td><td>${esc(booking.id)}</td></tr>
        <tr><td>ผู้จอง</td><td>${esc(booking.user)} (${esc(roleLabel)})</td></tr>
        <tr><td>วัตถุประสงค์</td><td>${esc(booking.title)}</td></tr>
        ${(booking.bookingForStudents || []).length ? `<tr><td>จองแทนนักศึกษา</td><td>${esc((booking.bookingForStudents || []).map((s) => `${s.name} (${s.studentId})`).join(', '))}</td></tr>` : ''}
      </table>
      ${checkInUrl ? `<div class="checkin"><div class="qr">${qrSvg(checkInUrl, 4)}</div>
        <div><b>ผู้จองสแกนเพื่อเช็กอินเข้าใช้ห้อง</b><br>เช็กอินได้ตั้งแต่ 15 นาทีก่อนเวลาเริ่ม<br>ถ้าไม่เช็กอินภายใน ${esc(String(graceMinutes))} นาทีหลังเวลาเริ่ม ระบบจะคืนห้อง</div></div>` : ''}
      <div class="footer">ระบบจองห้อง ภาควิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยศิลปากร · จัดพิมพ์โดยเจ้าหน้าที่ · ${printedOn}</div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.focus(), 300);
}
