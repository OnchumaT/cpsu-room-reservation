import { qrSvg } from '../../shared/checkIn.js';

function esc(str) {
  return String(str ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/**
 * A standing A4 sheet for a room's door: its check-in QR code, large. Posted
 * once and left up — the code is per room, not per booking (shared/checkIn.js).
 * `win` is opened by the caller straight from the click (before fetching the
 * room's token), so the print window isn't popup-blocked.
 */
export function printCheckInQr(win, { roomId, roomName, url, graceMinutes = 15 }) {
  const sealUrl = `${window.location.origin}/silpakorn-seal.png`;
  win.document.write(`<!DOCTYPE html><html lang="th"><head>
    <meta charset="UTF-8">
    <title>QR เช็กอิน ห้อง ${esc(roomId)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Sarabun,sans-serif;color:#000;background:#e8e8e8;display:flex;flex-direction:column;align-items:center;padding:30px;gap:18px}
      .sheet{width:600px;background:white;padding:40px 44px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.15)}
      .seal{height:60px;margin-bottom:6px}
      .org{font-size:14px;margin-bottom:18px}
      .room{font-size:54px;font-weight:800;line-height:1.1}
      .name{font-size:16px;color:#333;margin-bottom:18px}
      .qr{width:330px;height:330px;margin:0 auto}
      .qr svg{width:100%;height:100%}
      .how{font-size:20px;font-weight:600;margin-top:16px}
      .rule{font-size:14px;color:#333;margin-top:8px;line-height:1.6}
      .print-btn{padding:12px 32px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif}
      @page{size:A4;margin:14mm}
      @media print{body{background:white;padding:0}.sheet{box-shadow:none;width:100%}.print-btn{display:none}}
    </style>
  </head><body>
    <div class="sheet">
      <img src="${sealUrl}" class="seal" alt="ตราสัญลักษณ์มหาวิทยาลัยศิลปากร" />
      <div class="org">คณะวิทยาศาสตร์ · ภาควิชาคอมพิวเตอร์ มหาวิทยาลัยศิลปากร</div>
      <div class="room">ห้อง ${esc(roomId)}</div>
      <div class="name">${roomName && roomName !== `ห้อง ${roomId}` ? esc(roomName) : '&nbsp;'}</div>
      <div class="qr">${qrSvg(url, 8)}</div>
      <div class="how">สแกนเพื่อเช็กอินเข้าใช้ห้อง</div>
      <div class="rule">ผู้จองสแกนด้วยกล้องมือถือ แล้วเข้าสู่ระบบด้วยบัญชีของตนเอง<br>
        เช็กอินได้ตั้งแต่ 15 นาทีก่อนเวลาเริ่ม<br>
        ถ้าไม่เช็กอินภายใน ${graceMinutes} นาทีหลังเวลาเริ่ม ระบบจะคืนห้อง</div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.focus(), 300);
}
