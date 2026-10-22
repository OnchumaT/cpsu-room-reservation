import { AppError } from '../../../utils/AppError.js';
import { splitCsvRecord } from '../../../timetable/timetableCsv.js';

export const HOLIDAY_CSV_HEADER = ['วันที่', 'ชื่อวันหยุด'];
const MAX_ROWS = 500;

// "2026-01-01", "1/1/2569", "01-01-2026" -> "2026-01-01", or null. Slashed
// dates are day/month/year (the Thai way of writing them); a year above 2400
// is Buddhist Era and has 543 taken off. Rejects dates that don't exist
// (31/02, 29/02 in a non-leap year) by round-tripping through Date.UTC.
export function parseHolidayDate(raw) {
  const text = String(raw ?? '').trim();
  let y; let m; let d;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) [, y, m, d] = match.map(Number);
  else if ((match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [, d, m, y] = match.map(Number);
  else return null;
  if (y > 2400) y -= 543;
  if (y < 1900 || y > 2200) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return t.toISOString().slice(0, 10);
}

/**
 * Adds holidays from a CSV (columns: วันที่, ชื่อวันหยุด; header row optional).
 * `dryRun` only reports what would happen, so the page can show a preview
 * before anything is saved. Dates already in the calendar are skipped (the
 * existing name is kept), as is a date repeated later in the same file.
 */
export class ImportHolidaysUseCase {
  constructor({ holidayRepository }) {
    this.holidayRepository = holidayRepository;
  }

  async execute({ csv, dryRun = false }) {
    if (!csv?.trim()) throw AppError.badRequest('ไฟล์ CSV ว่างเปล่า');
    const records = csv.replace(/^﻿/, '').split(/\r\n|\r|\n/)
      .map(splitCsvRecord)
      .filter((cells) => cells.some((c) => c !== ''));
    const hasHeader = records[0]?.[0] === HOLIDAY_CSV_HEADER[0];
    const body = hasHeader ? records.slice(1) : records;
    if (body.length > MAX_ROWS) throw AppError.badRequest(`นำเข้าได้ครั้งละไม่เกิน ${MAX_ROWS} แถว`);
    const firstRowNo = hasHeader ? 2 : 1;

    const existing = new Map((await this.holidayRepository.getAll()).map((h) => [h.date, h.name]));
    const seen = new Set();
    const toAdd = [];
    const skipped = [];
    const errors = [];
    body.forEach((cells, i) => {
      const lineNo = i + firstRowNo;
      const [rawDate = '', name = ''] = cells;
      const date = parseHolidayDate(rawDate);
      if (!date) { errors.push({ lineNo, raw: rawDate, reason: 'วันที่ไม่ถูกต้อง' }); return; }
      if (!name) { errors.push({ lineNo, raw: rawDate, reason: 'ไม่มีชื่อวันหยุด' }); return; }
      if (name.length > 191) { errors.push({ lineNo, raw: rawDate, reason: 'ชื่อวันหยุดยาวเกินไป' }); return; }
      if (existing.has(date)) { skipped.push({ lineNo, date, name, reason: `มีอยู่แล้ว (${existing.get(date)})` }); return; }
      if (seen.has(date)) { skipped.push({ lineNo, date, name, reason: 'วันที่ซ้ำกับแถวก่อนหน้าในไฟล์' }); return; }
      seen.add(date);
      toAdd.push({ lineNo, date, name });
    });

    const added = dryRun || !toAdd.length ? 0 : await this.holidayRepository.addMany(toAdd);
    return { success: true, dryRun, toAdd, skipped, errors, added };
  }
}
