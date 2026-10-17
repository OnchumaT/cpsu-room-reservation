import { DAYS } from '../../shared/constants.js';
import { formatDatePlain } from '../../shared/dateFormat.js';

function esc(str) {
  return String(str ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function line(text = '', width = 120) {
  return `<span class="fill" style="min-width:${width}px">${esc(text)}</span>`;
}


function eventDateParts(dateStr) {
  if (!dateStr) return { dayName: '', dateBE: '', isWeekend: false };
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { dayName: '', dateBE: '', isWeekend: false };
  const dow = d.getDay();
  return { dayName: DAYS[dow], dateBE: formatDatePlain(dateStr), isWeekend: dow === 0 || dow === 6 };
}

/** window.open()+document.write() against a separate window/document —
 * zero coupling to the React tree. A formal "บันทึกข้อความ" to the Dean
 * (คณบดีคณะวิทยาศาสตร์), notifying the faculty of out-of-hours use of the
 * building — Staff's task once such a booking clears department approval
 * (see ApproveRejectBookingUseCase's 'staff' notification). Printed
 * straight from the booking's own data, no separate edit step — anything
 * the paper form asks for that the system has no data for (a memo
 * reference number, a physical signature) is left blank for hand-filling. */
export function printFacultyMemo(booking) {
  const { dayName, dateBE, isWeekend } = eventDateParts(booking.date);
  const timeDisplay = (booking.time || '').replace('-', ' – ');
  const memoDate = formatDatePlain(new Date());
  const sealUrl = `${window.location.origin}/silpakorn-seal.png`;
  // Matches the department's own reference wording: an actual holiday/
  // weekend booking is "ในวันหยุดราชการ"; an off-hour start on an
  // ordinary weekday is "นอกเวลาราชการ".
  const subject = `ขอแจ้งการใช้งานอาคารวิทยาศาสตร์ 1 ${isWeekend ? 'ในวันหยุดราชการ' : 'นอกเวลาราชการ'}`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html lang="th"><head>
    <meta charset="UTF-8">
    <title>บันทึกข้อความแจ้งคณะ ${esc(booking.id)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Sarabun,sans-serif;color:#000;background:#e8e8e8;padding:24px;font-size:15px;line-height:1.7}
      .page{max-width:794px;min-height:1123px;margin:0 auto;background:white;padding:42px 56px;box-shadow:0 2px 10px rgba(0,0,0,.15)}
      .toolbar{max-width:794px;margin:0 auto 14px;text-align:center}
      .toolbar button{padding:9px 24px;border-radius:8px;font-size:13px;font-family:Sarabun,sans-serif;cursor:pointer;margin:0 4px}
      .btn-print{background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none}
      .btn-close{background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0}
      .hdr{display:flex;align-items:center;gap:10px;margin-bottom:20px}
      .seal{height:58px;flex-shrink:0}
      .title{flex:1;text-align:center;font-size:22px;font-weight:700;padding-right:58px}
      .field{display:flex;align-items:baseline;gap:6px;margin-bottom:6px}
      .field b{flex-shrink:0;font-weight:700}
      .field .fill{flex:1}
      .field-pair{display:flex;gap:28px;margin-bottom:6px}
      .field-pair .field{margin-bottom:0}
      .fill{display:inline-block;border-bottom:1px dotted #000;padding:0 4px;min-height:1.3em}
      p{margin-bottom:10px;text-align:justify}
      .indent{text-indent:38px}
      .sig{text-align:center;width:280px;margin:0 auto}
      .sig-box{margin-top:30px;height:30px}
      @page{size:A4;margin:15mm 20mm}
      @media print{body{background:white;padding:0}.page{box-shadow:none;margin:0;padding:0;max-width:none;min-height:267mm}.toolbar{display:none}}
    </style>
  </head><body>
    <div class="toolbar">
      <button class="btn-print" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
      <button class="btn-close" onclick="window.close()">ปิด</button>
    </div>

    <div class="page">
      <div class="hdr">
        <img src="${sealUrl}" class="seal" alt="ตราสัญลักษณ์มหาวิทยาลัยศิลปากร" />
        <div class="title">บันทึกข้อความ</div>
      </div>

      <div class="field"><b>ส่วนงาน</b> ${line('ภาควิชาคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยศิลปากร โทร. 207703, 207708', 0)}</div>
      <div class="field-pair">
        <div class="field" style="flex:0 0 auto"><b>ที่</b> ${line('', 160)}</div>
        <div class="field" style="flex:1"><b>วันที่</b> ${line(memoDate, 0)}</div>
      </div>
      <div class="field"><b>เรื่อง</b> ${line(subject, 0)}</div>

      <p style="margin-top:16px">เรียน คณบดีคณะวิทยาศาสตร์</p>

      <p class="indent" style="margin-top:16px">
        ด้วยภาควิชาคอมพิวเตอร์ จะดำเนินการ${esc(booking.title)} ในวัน${esc(dayName)}ที่ ${esc(dateBE)}
        เวลา ${esc(timeDisplay)} น. ณ ห้อง ${esc(booking.room)} อาคารวิทยาศาสตร์ 1
        มีผู้เข้าร่วม จำนวน ${esc(String(booking.participants ?? ''))} คน
        โดยมี ${esc(booking.user)} เป็นผู้ประสานงาน
      </p>

      <p style="margin-top:16px">จึงเรียนมาเพื่อโปรดพิจารณาดำเนินการต่อไปด้วย จักเป็นพระคุณยิ่ง</p>

      <div class="sig" style="margin-top:44px">
        <div class="sig-box"></div>
        <div>( ${esc(booking.approvedByName || '')} )</div>
        <div>หัวหน้า/รองหัวหน้าภาควิชาคอมพิวเตอร์</div>
      </div>
    </div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.focus(), 300);
}
