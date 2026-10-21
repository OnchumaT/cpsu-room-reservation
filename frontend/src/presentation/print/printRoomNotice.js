const ROLE_LABEL = { teacher: 'อาจารย์', staff: 'เจ้าหน้าที่', admin: 'ผู้ดูแล' };
import { formatDatePlain } from '../../shared/dateFormat.js';
import { qrSvg } from '../../shared/checkIn.js';

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

  const win = window.open('', '_blank', 'width=800,height=700');
  win.document.write(`<!DOCTYPE html><html lang="th"><head>
    <meta charset="UTF-8">
    <title>ป้ายหน้าห้อง ${esc(booking.room)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Sarabun,sans-serif;color:#000;background:#e8e8e8;display:flex;flex-direction:column;align-items:center;padding:30px;gap:18px}
      .notice{width:600px;background:white;padding:36px 44px;box-shadow:0 2px 10px rgba(0,0,0,.15)}
      .seal{display:block;margin:0 auto 8px;height:64px}
      .org{text-align:center;font-size:14px;line-height:1.5}
      .org .u{font-size:16px;font-weight:700}
      hr{border:none;border-top:1.5px solid #000;margin:16px 0}
      .doc-title{text-align:center;font-size:18px;font-weight:700;margin-bottom:4px}
      .doc-sub{text-align:center;font-size:12px;color:#444;margin-bottom:18px}
      .room-number{text-align:center;font-size:56px;font-weight:800;letter-spacing:.03em;line-height:1;margin:10px 0}
      .status{text-align:center;margin-bottom:20px}
      .status span{display:inline-block;border:1.5px solid #000;border-radius:20px;padding:5px 18px;font-size:13px;font-weight:600}
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
      <img src="${sealUrl}" class="seal" alt="ตราสัญลักษณ์มหาวิทยาลัยศิลปากร" />
      <div class="org">
        <div class="u">มหาวิทยาลัยศิลปากร</div>
        <div>คณะวิทยาศาสตร์ · ภาควิชาวิทยาการคอมพิวเตอร์</div>
      </div>
      <hr />
      <div class="doc-title">ป้ายแจ้งการใช้ห้อง</div>
      <div class="doc-sub">Room Reservation Notice</div>
      <div class="room-number">ห้อง ${esc(booking.room)}</div>
      <div class="status"><span>${isApproved ? '✓ อนุมัติการจองแล้ว' : '⏳ รอการอนุมัติ'}</span></div>
      <table class="info">
        <tr><td>รหัสการจอง</td><td>${esc(booking.id)}</td></tr>
        <tr><td>ผู้จอง</td><td>${esc(booking.user)} (${esc(roleLabel)})</td></tr>
        <tr><td>วันที่ใช้ห้อง</td><td>${esc(formatDatePlain(booking.date))}</td></tr>
        <tr><td>เวลา</td><td>${esc(booking.time)}</td></tr>
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
