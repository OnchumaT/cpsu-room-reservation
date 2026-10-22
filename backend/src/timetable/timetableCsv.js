export const TIMETABLE_HEADER = ['วัน', 'ห้อง', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'รหัสวิชา', 'กลุ่มเรียน'];

const DAY_INDEX = { อาทิตย์: 0, จันทร์: 1, อังคาร: 2, พุธ: 3, พฤหัสบดี: 4, ศุกร์: 5, เสาร์: 6 };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// One CSV record -> cells. Handles quoted cells ("a,b", "say ""hi""") the way
// Excel writes them; every cell is trimmed, tabs included (Excel can leave a
// leading tab inside a quoted cell, e.g. "\t520341").
export function splitCsvRecord(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { cells.push(cell); cell = ''; }
    else cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

export function parseCsvLines(text) {
  // Line breaks may be \r\n (Windows), \n (Unix) or a lone \r (Excel for Mac's
  // "CSV" export) — splitting on \n alone read a whole Mac file as one header line
  // and found 0 rows. A row Excel leaves with only separators (",,,,,") is
  // non-empty as a string while every cell in it is empty, so rows are filtered
  // on their cells, not the raw line.
  const records = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/)
    .map(splitCsvRecord)
    .filter((cells) => cells.some((c) => c !== ''));
  const hasHeader = records[0]?.[0] === TIMETABLE_HEADER[0];
  const body = hasHeader ? records.slice(1) : records;
  // lineNo is the row number as seen in Excel (header = row 1), so a problem
  // reported for "แถว 5" is row 5 in the spreadsheet.
  const firstRowNo = hasHeader ? 2 : 1;
  return body.map((cells, i) => ({
    lineNo: i + firstRowNo,
    day: cells[0] ?? '',
    roomRaw: cells[1] ?? '',
    start: cells[2] ?? '',
    end: cells[3] ?? '',
    courseCode: cells[4] ?? '',
    section: cells[5] ?? '',
  }));
}

export function matchRoom(raw, rooms) {
  const key = raw.trim();
  const squashed = key.replace(/\s/g, '');
  return rooms.find((r) => r.id === key)
    ?? rooms.find((r) => r.name === key)
    ?? rooms.find((r) => r.name.replace(/\s/g, '') === squashed)
    ?? rooms.find((r) => squashed === `ห้อง${r.id}`)
    ?? null;
}

export function validateRow(row) {
  if (!(row.day in DAY_INDEX)) return `วัน "${row.day}" ไม่ถูกต้อง — ต้องสะกดเต็ม เช่น จันทร์, อังคาร, พฤหัสบดี`;
  if (!TIME_RE.test(row.start) || !TIME_RE.test(row.end)) return 'เวลาต้องเป็น HH:MM แบบ 24 ชั่วโมง เช่น 08:30, 13:00';
  if (toMinutes(row.start) >= toMinutes(row.end)) return 'เวลาเริ่มต้องก่อนเวลาสิ้นสุด — ตรวจว่าใส่สลับกันหรือไม่';
  if (!row.courseCode) return 'ช่องรหัสวิชาว่าง';
  if (!row.section) return 'ช่องกลุ่มเรียนว่าง';
  if (!row.roomRaw) return 'ช่องห้องว่าง';
  return null;
}

// Returns every row with its status plus a summary. Writes nothing.
export function analyzeTimetable({ csv, rooms }) {
  const seen = new Map();
  const rows = parseCsvLines(csv).map((row) => {
    const problem = validateRow(row);
    const room = problem ? null : matchRoom(row.roomRaw, rooms);
    let status = 'ok';
    let message = 'พร้อมนำเข้า';
    if (problem) { status = 'invalid'; message = problem; }
    else if (!room) { status = 'unmatched'; message = `ไม่พบห้อง "${row.roomRaw}" ในระบบ — แก้ชื่อห้องในไฟล์ให้ตรงกับรหัสห้อง หรือเพิ่มห้องนี้ในหน้าจัดการห้องก่อน`; }
    else {
      const key = [room.id, DAY_INDEX[row.day], row.start, row.end, row.courseCode, row.section].join('|');
      if (seen.has(key)) { status = 'invalid'; message = `ซ้ำกับแถว ${seen.get(key)} ทุกช่อง — ลบแถวใดแถวหนึ่งออก`; }
      else seen.set(key, row.lineNo);
    }
    return {
      lineNo: row.lineNo,
      day: row.day,
      dayOfWeek: DAY_INDEX[row.day] ?? null,
      roomRaw: row.roomRaw,
      roomId: room?.id ?? null,
      roomName: room?.name ?? null,
      start: row.start,
      end: row.end,
      courseCode: row.courseCode,
      section: row.section,
      status,
      message,
    };
  });
  const okCount = rows.filter((r) => r.status === 'ok').length;
  return {
    rows,
    summary: { total: rows.length, ok: okCount, unmatched: rows.filter((r) => r.status === 'unmatched').length, invalid: rows.filter((r) => r.status === 'invalid').length },
    canImport: rows.length > 0 && okCount === rows.length,
  };
}
