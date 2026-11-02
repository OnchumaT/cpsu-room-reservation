// Month calendar(s) under the booking form's date-range / weekly options:
// which days will be booked and which are skipped (weekends, holidays) at a
// glance — and a booked day can be clicked off (an exam week) or back on.
// BookingView owns the state; this draws it and reports clicks.

const MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
// Monday first, as on a Thai timetable.
const HEADERS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Only the months from the first to the last booked day — no empty month.
function monthsBetween(start, end) {
  const months = [];
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7)) - 1;
  const endKey = Number(end.slice(0, 4)) * 12 + Number(end.slice(5, 7)) - 1;
  while (y * 12 + m <= endKey) {
    months.push({ y, m });
    m += 1;
    if (m === 12) { m = 0; y += 1; }
  }
  return months;
}

/**
 * @param {{ booked: string[], skipped: string[], removed: string[], holidays: Map<string,string>, onToggle: (date: string) => void }} props
 * booked = days that will be booked; skipped = days in the span left out
 * (weekend/holiday); removed = days the booker clicked off (clickable to put
 * back); holidays = date -> name, for the red dot and tooltip.
 */
export function BookingDaysCalendar({ booked, skipped, removed, holidays, onToggle }) {
  if (!booked.length && !removed.length) return null;
  const bookedSet = new Set(booked);
  const skippedSet = new Set(skipped);
  const removedSet = new Set(removed);
  const first = [...booked, ...skipped].sort()[0];
  const last = [...booked, ...removed].sort().at(-1);
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {monthsBetween(first, last).map(({ y, m }) => {
          const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // blanks before the 1st, Monday-first
          const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
          const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
          return (
            <div key={`${y}-${m}`} style={{ background: '#fff', borderRadius: '10px', padding: '10px', width: '224px', border: '.5px solid #D8DBF0' }}>
              <div style={{ textAlign: 'center', fontSize: '12.5px', fontWeight: 600, color: '#1A1D3A', marginBottom: '6px' }}>{MONTH_NAMES[m]} {y + 543}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                {HEADERS.map((h, i) => (
                  <div key={h} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: i >= 5 ? '#b91c1c' : '#8890B5', paddingBottom: '2px' }}>{h}</div>
                ))}
                {cells.map((d, i) => {
                  if (d == null) return <div key={`b${i}`} />;
                  const date = iso(y, m, d);
                  const holiday = holidays.get(date);
                  const isBooked = bookedSet.has(date);
                  const isRemoved = removedSet.has(date);
                  const clickable = isBooked || isRemoved;
                  let style = { color: '#C2C7E0', background: 'transparent', border: '1px solid transparent' };
                  if (isBooked) style = { color: '#fff', background: '#38419D', border: '1px solid #38419D', fontWeight: 700 };
                  else if (isRemoved) style = { color: '#8890B5', background: '#fff', border: '1px dashed #8890B5', textDecoration: 'line-through' };
                  else if (skippedSet.has(date)) style = { color: holiday ? '#b91c1c' : '#8890B5', background: 'transparent', border: '1px dashed #C2C7E0' };
                  return (
                    <button
                      key={date}
                      type="button"
                      disabled={!clickable}
                      onClick={() => onToggle(date)}
                      title={holiday ? `วันหยุด: ${holiday}` : isBooked ? 'กดเพื่อเอาวันนี้ออก' : isRemoved ? 'กดเพื่อจองวันนี้คืน' : undefined}
                      style={{ ...style, height: '26px', borderRadius: '6px', fontSize: '11.5px', fontFamily: 'Sarabun,sans-serif', padding: 0, cursor: clickable ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                    >
                      {d}
                      {holiday && <span style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: isBooked ? '#fff' : '#b91c1c' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px', fontSize: '10.5px', color: '#4A4F7A' }}>
        <span style={{ fontWeight: 600, color: '#38419D' }}>กดที่วันสีน้ำเงินเพื่อเอาออก · กดอีกครั้งเพื่อจองคืน</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: '#38419D', marginRight: '4px', verticalAlign: '-1px' }} />วันที่จอง</span>
        {(skipped.length > 0 || removed.length > 0) && <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', border: '1px dashed #8890B5', marginRight: '4px', verticalAlign: '-1px' }} />ไม่จอง</span>}
        <span><span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#b91c1c', marginRight: '4px', verticalAlign: '1px' }} />วันหยุดราชการ</span>
      </div>
    </div>
  );
}
