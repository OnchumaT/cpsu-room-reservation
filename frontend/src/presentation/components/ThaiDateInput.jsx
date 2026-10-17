import { useState } from 'react';
import { formatDateDMY } from '../../shared/dateFormat.js';

/**
 * Drop-in replacement for <input type="date"> that shows the picked date as
 * "จ. 05/10/2569" (Thai weekday + Buddhist-era year) instead of the browser's
 * own Gregorian format, which can't be changed. The native input still sits on
 * top (invisible) so clicking opens the browser's date picker, and onChange
 * receives the native event — value stays ISO "YYYY-MM-DD" like before.
 * Works controlled (value) or uncontrolled (defaultValue).
 */
export function ThaiDateInput({ value, defaultValue = '', onChange, min, max, className = 'form-control' }) {
  const [inner, setInner] = useState(defaultValue);
  const current = value !== undefined ? value : inner;

  return (
    <div className={`${className} thai-date`}>
      <span className={current ? '' : 'thai-date-ph'}>{current ? formatDateDMY(current) : 'วว/ดด/ปปปป'}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <input
        type="date"
        aria-label="เลือกวันที่"
        value={current}
        min={min}
        max={max}
        onChange={(e) => {
          if (value === undefined) setInner(e.target.value);
          onChange?.(e);
        }}
        // Open the picker on a click anywhere in the box, not just on the browser's tiny icon.
        onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* not supported — native behavior */ } }}
      />
    </div>
  );
}
