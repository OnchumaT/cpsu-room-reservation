export const TIMETABLE_HEADER = ['วัน', 'ห้อง', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'รหัสวิชา', 'กลุ่มเรียน'];

const DAY_INDEX = { อาทิตย์: 0, จันทร์: 1, อังคาร: 2, พุธ: 3, พฤหัสบดี: 4, ศุกร์: 5, เสาร์: 6 };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function parseCsvLines(text) {
  // A blank line survives as "" and is filtered below — but a row Excel
  // leaves trailing with only separators (",,,,,") is non-empty as a
  // string while every cell in it is empty, so it slipped through and
  // surfaced as a bogus "วันไม่ถูกต้อง" row. Filter on the cells, not the
  // raw line, to catch both shapes of "nothing here" the same way.
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
    .filter((l) => l.split(',').some((c) => c.trim() !== ''));
  const first = lines[0]?.split(',').map((c) => c.trim());
  const body = first?.[0] === TIMETABLE_HEADER[0] ? lines.slice(1) : lines;
  return body.map((line, i) => {
    const cells = line.split(',').map((c) => c.trim());
    return {
      lineNo: i + 1,
      day: cells[0] ?? '',
      roomRaw: cells[1] ?? '',
      start: cells[2] ?? '',
      end: cells[3] ?? '',
      courseCode: cells[4] ?? '',
      section: cells[5] ?? '',
    };
  });
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
  if (!(row.day in DAY_INDEX)) return 'วันไม่ถูกต้อง';
  if (!TIME_RE.test(row.start) || !TIME_RE.test(row.end)) return 'รูปแบบเวลาไม่ถูกต้อง (HH:MM)';
  if (toMinutes(row.start) >= toMinutes(row.end)) return 'เวลาเริ่มต้องก่อนเวลาสิ้นสุด';
  if (!row.courseCode) return 'ไม่มีรหัสวิชา';
  if (!row.section) return 'ไม่มีกลุ่มเรียน';
  if (!row.roomRaw) return 'ไม่มีชื่อห้อง';
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
    else if (!room) { status = 'unmatched'; message = 'ยังไม่จับคู่'; }
    else {
      const key = [room.id, DAY_INDEX[row.day], row.start, row.end, row.courseCode, row.section].join('|');
      if (seen.has(key)) { status = 'invalid'; message = `ซ้ำกับแถว ${seen.get(key)} ในไฟล์`; }
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
