import { openModal } from './Modal.js';
import { bookingStatusLongLabel } from '../formatters/statusLabels.js';

const ROLE_LABEL = { teacher: 'อาจารย์', student: 'นักศึกษา', staff: 'เจ้าหน้าที่' };
const STATUS_COLOR = { approved: '#166534', pending: '#92400e', rejected: '#991b1b', cancelled: '#4A4F7A' };
const STATUS_BG = { approved: '#dcfce7', pending: '#FEF3C7', rejected: '#fee2e2', cancelled: '#F4F5FA' };

/** Read-only booking detail popup, reused by the Dashboard calendar (and,
 * in the follow-up phase, the History list). Staff/Admin additionally get
 * a "print room notice" action. */
export function createBookingDetailModal({ bookingRepository }) {
  function show(bookingId, currentRole) {
    const booking = bookingRepository.findById(bookingId);
    if (!booking) return;
    const roleLabel = ROLE_LABEL[booking.role] || booking.role;
    const statusLabel = bookingStatusLongLabel(booking.status);
    const isStaff = currentRole === 'staff' || currentRole === 'admin';

    openModal(
      `รายละเอียดการจอง ${booking.id}`,
      `<div style="background:linear-gradient(135deg,#2A2262,#38419D);border-radius:10px;padding:14px 16px;color:white;margin-bottom:14px">
        <div style="font-size:16px;font-weight:600;margin-bottom:3px">ห้อง ${booking.room}</div>
        <div style="font-size:12px;opacity:.8">${booking.date} · ${booking.time}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0">
        ${[
          ['ผู้จอง', booking.user],
          ['บทบาท', roleLabel],
          ['วัตถุประสงค์', booking.title],
          ['วันที่', booking.date],
          ['เวลา', booking.time],
          ['สถานะ', `<span style="background:${STATUS_BG[booking.status]};color:${STATUS_COLOR[booking.status]};padding:2px 8px;border-radius:8px;font-size:11px;font-weight:500">${statusLabel}</span>`],
        ].map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:0.5px solid #D8DBF0">
          <span style="font-size:11px;color:#8890B5;font-weight:500">${k}</span>
          <span style="font-size:12px;color:#1A1D3A;font-weight:500;text-align:right;max-width:220px">${v}</span>
        </div>`).join('')}
      </div>
      ${isStaff ? `<div style="background:#EEF0FF;border-radius:8px;padding:9px 12px;font-size:11px;color:#38419D;margin-top:12px;display:flex;align-items:center;gap:6px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38419D" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        พิมพ์เพื่อนำไปแปะที่หน้าห้อง ${booking.room}
      </div>` : ''}`,
      `<button class="btn btn-o" onclick="App.closeModal()">ปิด</button>
       ${isStaff ? `<button class="btn btn-p" style="display:flex;align-items:center;gap:6px" onclick="App.printRoomNotice('${booking.id}')">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
         พิมพ์ PDF
       </button>` : ''}`,
    );
  }

  function printRoomNotice(bookingId) {
    const booking = bookingRepository.findById(bookingId);
    if (!booking) return;
    const roleLabel = ROLE_LABEL[booking.role] || booking.role;
    const isApproved = booking.status === 'approved';
    const win = window.open('', '_blank', 'width=800,height=700');
    win.document.write(`<!DOCTYPE html><html lang="th"><head>
      <meta charset="UTF-8">
      <title>ป้ายหน้าห้อง ${booking.room}</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Sarabun,sans-serif;background:#f0f2ff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:30px;gap:20px}
        .notice{width:520px;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(42,34,98,.18)}
        .notice-header{background:linear-gradient(135deg,#2A2262 0%,#38419D 60%,#3887BE 100%);padding:28px 32px;color:white;text-align:center}
        .room-number{font-size:52px;font-weight:800;letter-spacing:.04em;line-height:1}
        .room-label{font-size:14px;opacity:.7;margin-top:4px;letter-spacing:.06em;text-transform:uppercase}
        .status-badge{display:inline-flex;align-items:center;gap:6px;margin-top:14px;background:${isApproved ? 'rgba(22,163,74,.25)' : 'rgba(251,191,36,.25)'};border:1.5px solid ${isApproved ? 'rgba(74,222,128,.5)' : 'rgba(251,191,36,.5)'};color:${isApproved ? '#a7f3d0' : '#fde68a'};padding:6px 16px;border-radius:30px;font-size:13px;font-weight:600}
        .notice-body{padding:26px 32px}
        .info-row{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:.5px solid #E8EAF0}
        .info-row:last-child{border-bottom:none}
        .info-icon{width:32px;height:32px;border-radius:8px;background:#EEF0FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px}
        .info-label{font-size:11px;color:#8890B5;margin-bottom:2px}
        .info-value{font-size:14px;font-weight:600;color:#1A1D3A}
        .notice-footer{padding:16px 32px;background:#F4F5FA;border-top:.5px solid #E8EAF0;text-align:center;font-size:11px;color:#8890B5}
        .print-btn{padding:12px 32px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;box-shadow:0 4px 16px rgba(56,65,157,.3)}
        @media print{body{background:white;padding:0;justify-content:flex-start}.notice{box-shadow:none;border-radius:0;width:100%}.print-btn{display:none}}
      </style>
    </head><body>
      <div class="notice">
        <div class="notice-header">
          <div class="room-number">ห้อง ${booking.room}</div>
          <div class="room-label">ชั้น 6 · อาคาร 1 · ภาควิชาวิทยาการคอมพิวเตอร์</div>
          <div class="status-badge">${isApproved ? '✓ อนุมัติการจองแล้ว' : '⏳ รอการอนุมัติ'}</div>
        </div>
        <div class="notice-body">
          <div class="info-row"><div class="info-icon">📋</div><div><div class="info-label">รหัสการจอง</div><div class="info-value">${booking.id}</div></div></div>
          <div class="info-row"><div class="info-icon">👤</div><div><div class="info-label">ผู้จอง</div><div class="info-value">${booking.user} <span style="font-size:11px;color:#8890B5;font-weight:400">(${roleLabel})</span></div></div></div>
          <div class="info-row"><div class="info-icon">📅</div><div><div class="info-label">วันที่ใช้ห้อง</div><div class="info-value">${booking.date}</div></div></div>
          <div class="info-row"><div class="info-icon">⏰</div><div><div class="info-label">เวลา</div><div class="info-value">${booking.time}</div></div></div>
          <div class="info-row"><div class="info-icon">📌</div><div><div class="info-label">วัตถุประสงค์</div><div class="info-value">${booking.title}</div></div></div>
        </div>
        <div class="notice-footer">ระบบจองห้อง CPSU · จัดพิมพ์โดยเจ้าหน้าที่ · ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.focus(), 300);
  }

  return { show, printRoomNotice };
}
