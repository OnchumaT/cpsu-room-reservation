import { MONTHS } from '../../shared/constants.js';

const pad2 = (n) => String(n).padStart(2, '0');

/** "YYYY-MM" of the current month. */
export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

/** True when a booking's "YYYY-MM-DD" date falls in the picked month (null = every month). */
export function inMonth(date, monthKey) {
  return !monthKey || String(date).startsWith(monthKey);
}

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y + 543}`;
}

/**
 * ‹ ตุลาคม 2569 › [ทุกเดือน] — picks a month by the booking's own date (the day
 * the room is used, same as the calendar). `value` is "YYYY-MM", or null for
 * every month; the arrows start from the current month when nothing is picked.
 */
export function MonthFilter({ value, onChange }) {
  const base = value || currentMonthKey();
  return (
    <div className="month-filter">
      <button className="month-filter-btn" onClick={() => onChange(shiftMonth(base, -1))} aria-label="เดือนก่อนหน้า">‹</button>
      <span className={`month-filter-lbl${value ? '' : ' all'}`}>{value ? monthLabel(value) : 'ทุกเดือน'}</span>
      <button className="month-filter-btn" onClick={() => onChange(shiftMonth(base, 1))} aria-label="เดือนถัดไป">›</button>
      {value !== currentMonthKey() && <button className="fchip" onClick={() => onChange(currentMonthKey())}>เดือนนี้</button>}
      {value && <button className="fchip" onClick={() => onChange(null)}>ทุกเดือน</button>}
    </div>
  );
}
