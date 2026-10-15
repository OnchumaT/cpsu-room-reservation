import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { MONTHS, DAYS, getRoomColor } from '../../shared/constants.js';
import { bookingStatusLabel } from '../formatters/statusLabels.js';
import { container } from '../../shared/di/container.js';
import { useBookingDetailModal } from './BookingDetailModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const { roomRepository, holidayRepository, timetableRepository } = container.repositories;

/** date string -> holiday name, so a cell/day-detail lookup is O(1). Read
 * fresh on every render (cheap, small list) — same live-cache pattern as
 * roomRepository.getAll() just below, no extra state needed. */
function holidayNameByDate() {
  return new Map(holidayRepository.getAll().map((h) => [h.date, h.name]));
}

function parseLocalDate(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayLabel(d) {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "08:00-09:00" strings sort correctly as plain text (zero-padded 24h),
// so the earliest start time always lands first — including same-room,
// same-day bookings.
const byStartTime = (a, b) => a.time.localeCompare(b.time);

const HOUR_PX = 48;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Hour window for the timeline: at least 08:00–18:00, widened to fit every booking.
function timelineRange(events) {
  const starts = events.map((e) => toMinutes(e.time.split('-')[0]));
  const ends = events.map((e) => toMinutes(e.time.split('-')[1]));
  const from = Math.min(8 * 60, ...starts);
  const to = Math.max(18 * 60, ...ends);
  return { from: Math.floor(from / 60) * 60, to: Math.ceil(to / 60) * 60 };
}

// Greedy column packing so overlapping bookings sit side by side instead of on top of each other.
function packColumns(events) {
  const colEnds = [];
  const placed = [...events].sort(byStartTime).map((e) => {
    const [startStr, endStr] = e.time.split('-');
    const start = toMinutes(startStr);
    const end = toMinutes(endStr);
    let col = colEnds.findIndex((x) => x <= start);
    if (col === -1) { colEnds.push(end); col = colEnds.length - 1; } else { colEnds[col] = end; }
    return { event: e, start, end, col };
  });
  return { placed, cols: Math.max(1, colEnds.length) };
}

const CalendarCtx = createContext(null);

/** Owns the calendar's local state (visible month + selected day) — no more
 * writing into DashboardView's placeholder divs. Scoped to wherever
 * <Calendar>/<CalendarDayDetail> are mounted together (the Dashboard page),
 * not global app state, since nothing outside the calendar needs it. */
export function CalendarProvider({ children }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [roomFilter, setRoomFilter] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  const [dayAnchor, setDayAnchor] = useState(() => new Date());
  const { show: showBookingDetail } = useBookingDetailModal();

  // Class sessions for the visible month and the day being viewed (read-only, not bookings).
  const monthStart = fmtDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1));
  const monthEnd = fmtDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0));
  const anchorStr = fmtDate(dayAnchor);
  const rangeFrom = anchorStr < monthStart ? anchorStr : monthStart;
  const rangeTo = anchorStr > monthEnd ? anchorStr : monthEnd;
  const [classesInRange, setClassesInRange] = useState([]);
  useEffect(() => {
    let cancelled = false;
    timetableRepository.schedulesForRange(rangeFrom, rangeTo)
      .then((list) => { if (!cancelled) setClassesInRange(list); })
      .catch(() => { if (!cancelled) setClassesInRange([]); });
    return () => { cancelled = true; };
  }, [rangeFrom, rangeTo]);

  // "รายการจองของฉัน" mode: only the viewer's own bookings that still hold the room (pending or approved).
  const { user } = useAuth();
  const [mineOnly, setMineOnly] = useState(false);
  const toggleMineOnly = useCallback(() => setMineOnly((v) => !v), []);
  const approvedBookings = useCallback(() => {
    const all = container.repositories.bookingRepository.getAll();
    if (mineOnly) return all.filter((b) => String(b.userId) === String(user.id) && (b.isApproved() || b.isPending()));
    return all.filter((b) => b.isApproved() || b.redacted);
  }, [mineOnly, user.id]);

  // Clicking an already-selected room in the legend clears the filter.
  const toggleRoomFilter = useCallback((roomId) => {
    setRoomFilter((prev) => (prev === roomId ? null : roomId));
  }, []);

  const selectDay = useCallback((dateStr) => setSelectedDate(dateStr), []);
  // Tapping a date in the month grid opens that day's timeline.
  const openDay = useCallback((dateStr) => {
    setSelectedDate(dateStr);
    setDayAnchor(parseLocalDate(dateStr));
    setViewMode('day');
  }, []);
  const goToPrevMonth = useCallback(() => {
    setVisibleMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setDayAnchor((d) => addDays(d, viewMode === 'day' ? -1 : -30));
    setSelectedDate(null);
  }, [viewMode]);
  const goToNextMonth = useCallback(() => {
    setVisibleMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setDayAnchor((d) => addDays(d, viewMode === 'day' ? 1 : 30));
    setSelectedDate(null);
  }, [viewMode]);
  // "วันนี้" toggles: from the month grid it opens today's day timeline, and from
  // the day timeline it returns to the month grid.
  const goToToday = useCallback(() => {
    if (viewMode === 'day') { setViewMode('month'); return; }
    setVisibleMonth(new Date());
    setDayAnchor(new Date());
    setSelectedDate(fmtDate(new Date()));
    setViewMode('day');
  }, [viewMode]);
  const backToMonth = useCallback(() => setViewMode('month'), []);

  const value = useMemo(() => ({
    visibleMonth, selectedDate, approvedBookings, selectDay,
    goToPrevMonth, goToNextMonth, goToToday, showBookingDetail,
    roomFilter, toggleRoomFilter, viewMode, backToMonth, openDay, dayAnchor, classesInRange: mineOnly ? [] : classesInRange,
    mineOnly, toggleMineOnly,
  }), [visibleMonth, selectedDate, approvedBookings, selectDay, goToPrevMonth, goToNextMonth, goToToday, showBookingDetail, roomFilter, toggleRoomFilter, viewMode, backToMonth, openDay, dayAnchor, classesInRange, mineOnly, toggleMineOnly]);

  return <CalendarCtx.Provider value={value}>{children}</CalendarCtx.Provider>;
}

export function useCalendar() {
  const ctx = useContext(CalendarCtx);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}

// Class sessions shown in the same slots as bookings; they are read-only.
function toClassEvent(c) {
  return { id: `cls-${c.id}`, cls: true, room: c.roomId, roomName: c.roomName, time: `${c.start}-${c.end}`, courseCode: c.courseCode, section: c.section };
}

function classDayItem(e) {
  return (
    <div className="ev-item" key={e.id}>
      <div className="ev-bar" style={{ background: getRoomColor(e.room).bar }} />
      <div className="ev-inf">
        <div className="ev-ti">{e.courseCode}</div>
        <div className="ev-su" style={{ fontWeight: 500, color: '#4A4F7A' }}>ห้อง {e.room} · {e.time}</div>
        <div className="ev-su">กลุ่ม {e.section}</div>
      </div>
      <div className="ev-bdg" style={{ background: '#f1f5f9', color: '#475569' }}>ตารางเรียน</div>
    </div>
  );
}

// Someone else's booking: only whether the slot is taken or still awaiting approval.
function redactedLabel(e) {
  return e.isPending() ? 'รออนุมัติ' : 'ไม่ว่าง';
}

function eventTitle(e) {
  if (e.cls) return e.courseCode;
  return e.redacted ? redactedLabel(e) : `${e.user} · ${e.title}`;
}

function eventTooltip(e) {
  if (e.cls) return `${e.courseCode} · ห้อง ${e.room} · ${e.time}`;
  return e.redacted ? `ห้อง ${e.room} · ${e.time} · ${redactedLabel(e)}` : `${e.user} | ${e.title} | ${e.time}`;
}

/** The month-grid calendar card. */
export function Calendar({ canBook, onBook }) {
  const { visibleMonth, selectedDate, approvedBookings, selectDay, goToPrevMonth, goToNextMonth, goToToday, showBookingDetail, roomFilter, toggleRoomFilter, viewMode, backToMonth, openDay, dayAnchor, classesInRange, mineOnly, toggleMineOnly } = useCalendar();
  const isDay = viewMode === 'day';

  const y = visibleMonth.getFullYear();
  const m = visibleMonth.getMonth();
  const first = new Date(y, m, 1).getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const todStr = fmtDate(new Date());
  const visible = (roomFilter ? approvedBookings().filter((b) => b.room === roomFilter) : approvedBookings());
  const moStr = `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthEvents = visible.filter((b) => b.date.startsWith(moStr));
  // วันหยุดนักขัตฤกษ์ (admin-managed, see ManageHolidaysView) — any booking
  // on one of these dates counts as นอกเวลาราชการ regardless of time, so
  // it's worth surfacing right on the grid, not just after picking a date
  // in the booking form.
  const holidayNames = holidayNameByDate();

  const cells = [];
  for (let i = 0; i < first; i += 1) {
    cells.push(<div className="dc oth" key={`p${i}`}><span className="dn">{new Date(y, m, 0).getDate() - first + i + 1}</span></div>);
  }
  for (let day = 1; day <= total; day += 1) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const holidayName = holidayNames.get(ds);
    const evs = visible.filter((b) => b.date === ds).sort(byStartTime);
    const dayClasses = classesInRange.filter((c) => c.date === ds && (!roomFilter || c.roomId === roomFilter));
    const cellItems = [...evs, ...dayClasses.map(toClassEvent)];
    const shown = cellItems.slice(0, 3);
    cells.push(
      <div
        className={`dc${ds === todStr ? ' tod' : ''}${selectedDate === ds ? ' sel' : ''}`}
        key={ds}
        onClick={() => openDay(ds)}
        title={holidayName ? `วันหยุด: ${holidayName}` : undefined}
        style={holidayName ? { background: '#fef2f2' } : undefined}
      >
        <span className="dn" style={holidayName ? { color: '#991b1b' } : undefined}>{day}</span>
        {holidayName && (
          <div style={{ fontSize: '8.5px', fontWeight: 600, color: '#991b1b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            🔴 {holidayName}
          </div>
        )}
        <div className="eps">
          {shown.map((e) => {
            const rc = getRoomColor(e.room);
            return (
              <div
                className="ep"
                key={e.id}
                style={{ background: rc.bg, color: rc.text, cursor: 'pointer', fontWeight: 600 }}
                title={eventTooltip(e)}
                onClick={(ev) => { ev.stopPropagation(); if (!e.cls) showBookingDetail(e.id); }}
              >
                ห้อง {e.room} · {e.time}
              </div>
            );
          })}
          {cellItems.length > 3 && <div className="ep-more" style={{ fontSize: '9.5px', color: '#38419D', fontWeight: 600, padding: '1px 3px' }}>+{cellItems.length - 3} อื่นๆ</div>}
        </div>
      </div>,
    );
  }
  for (let i = 1; i <= 42 - first - total; i += 1) {
    cells.push(<div className="dc oth" key={`n${i}`}><span className="dn">{i}</span></div>);
  }

  const anchorDate = dayAnchor;
  const anchorStr = fmtDate(anchorDate);
  const dayEvents = visible.filter((b) => b.date === anchorStr).sort(byStartTime);
  const dayHoliday = holidayNames.get(anchorStr);
  const dayClassEvents = classesInRange
    .filter((c) => c.date === anchorStr && (!roomFilter || c.roomId === roomFilter))
    .map((c) => ({ id: `cls-${c.id}`, cls: true, room: c.roomId, roomName: c.roomName, time: `${c.start}-${c.end}`, courseCode: c.courseCode }));
  const timelineEvents = [...dayEvents, ...dayClassEvents];
  const dayCell = (() => {
    const { from, to } = timelineRange(timelineEvents);
    const { placed, cols } = packColumns(timelineEvents);
    const pad2 = (n) => String(n).padStart(2, '0');
    const hours = [];
    for (let h = from; h <= to; h += 60) hours.push(h);
    return (
      <div className={`dc${anchorStr === todStr ? ' tod' : ''}`} style={{ padding: '8px 10px', ...(dayHoliday ? { background: '#fef2f2' } : {}) }}>
        {dayHoliday && (
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#991b1b', marginBottom: '6px' }}>🔴 วันหยุด: {dayHoliday}</div>
        )}
        {dayEvents.length === 0 && <div style={{ fontSize: '12px', color: '#8890B5', padding: '12px 4px' }}>ไม่มีการจองในวันนี้</div>}
        <div style={{ position: 'relative', height: ((to - from) / 60) * HOUR_PX, marginLeft: '44px' }}>
          {hours.map((h) => (
            <div key={h} style={{ position: 'absolute', left: '-44px', right: 0, top: ((h - from) / 60) * HOUR_PX, borderTop: '.5px solid #E2E5F2' }}>
              <span style={{ position: 'absolute', left: 0, top: -7, fontSize: '10px', color: '#8890B5' }}>{pad2(h / 60)}:00</span>
            </div>
          ))}
          {placed.map(({ event: e, start, end, col }) => {
            const rc = getRoomColor(e.room);
            return (
              <div
                key={e.id}
                title={eventTooltip(e)}
                onClick={(ev) => { ev.stopPropagation(); if (!e.cls) showBookingDetail(e.id); }}
                style={{
                  position: 'absolute',
                  top: ((start - from) / 60) * HOUR_PX,
                  height: Math.max(((end - start) / 60) * HOUR_PX - 2, 24),
                  left: `calc(${(col / cols) * 100}% + 2px)`,
                  width: `calc(${100 / cols}% - 4px)`,
                  background: rc.bg, color: rc.text, borderLeft: `4px solid ${rc.bar}`,
                  borderRadius: '6px', padding: '4px 6px', fontSize: '11px', fontWeight: 600,
                  overflow: 'hidden', cursor: 'pointer', lineHeight: 1.35,
                }}
              >
                <div>ห้อง {e.room} · {e.time}</div>
                <div style={{ fontWeight: 400, opacity: .85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eventTitle(e)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  })();


  return (
    <div className="cal-card">
      <div className="cal-hd">
        <div>{isDay
          ? <span className="cal-mo-txt" onClick={backToMonth} title="กลับไปมุมมองเดือน" style={{ cursor: 'pointer' }}>{dayLabel(anchorDate)}</span>
          : <><span className="cal-mo-txt">{MONTHS[m]}</span><span className="cal-yr-txt">{y + 543}</span></>}</div>
        <div className="cal-hd-right">
          <div className="cnb" onClick={goToPrevMonth}>‹</div>
          <div className="cnb" onClick={goToNextMonth}>›</div>
          <div className="today-chip" onClick={goToToday} style={isDay ? { background: '#38419D', color: '#fff' } : undefined}>วันนี้</div>
          <div className="today-chip" onClick={toggleMineOnly} style={mineOnly ? { background: '#38419D', color: '#fff' } : undefined}>รายการจองของฉัน</div>
          {canBook && <button className="add-chip" onClick={() => onBook(selectedDate ?? undefined)}>+ จอง</button>}
        </div>
      </div>
      <div className="cal-footer" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '7px', padding: '12px 18px 14px', borderTop: 'none', borderBottom: '.5px solid #D8DBF0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#8890B5' }}>สัญลักษณ์ห้อง</span>
          <span style={{ fontSize: '10px', color: '#8890B5' }}>· คลิกเพื่อกรองเฉพาะห้องนั้น</span>
          {roomFilter && (
            <span style={{ fontSize: '10px', color: '#38419D', fontWeight: 600, cursor: 'pointer' }} onClick={() => toggleRoomFilter(roomFilter)}>ล้างตัวกรอง ✕</span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {roomRepository.getAll().map((room) => {
            const rc = getRoomColor(room.id);
            const active = roomFilter === room.id;
            const dimmed = roomFilter && !active;
            return (
              <div
                className="leg"
                key={room.id}
                onClick={() => toggleRoomFilter(room.id)}
                style={{
                  cursor: 'pointer', padding: '3px 8px 3px 6px', borderRadius: '20px',
                  background: active ? rc.bg : 'transparent',
                  border: `1px solid ${active ? rc.bar : 'transparent'}`,
                  opacity: dimmed ? .4 : 1,
                  transition: 'opacity .15s, background .15s',
                }}
              >
                <div style={{ width: '22px', height: '8px', borderRadius: '4px', background: rc.bar, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: rc.text, fontWeight: 500 }}>ห้อง {room.id}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: '10.5px', color: '#8890B5', marginTop: '2px' }}>{isDay ? `${dayEvents.length} การจองในวันนี้` : `${monthEvents.length} การจองในเดือนนี้`}{roomFilter ? ` · ห้อง ${roomFilter}` : ''}</div>
      </div>
      <div className="cal-body">
        <div className="dow-row">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => <div className="dow" key={d}>{d}</div>)}</div>
        {isDay
          ? <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>{dayCell}</div>
          : <div className="days">{cells}</div>}
      </div>
    </div>
  );
}

/** Class sessions for one date, read-only. Returns null until loaded. Refetched when
 * the date changes; a failed fetch shows no classes rather than blocking the booking list. */
export function useClassSchedulesForDate(date) {
  const [classes, setClasses] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setClasses(null);
    if (!date) return undefined;
    timetableRepository.schedulesForDate(date)
      .then((list) => { if (!cancelled) setClasses(list); })
      .catch(() => { if (!cancelled) setClasses([]); });
    return () => { cancelled = true; };
  }, [date]);
  return classes;
}

/** The "selected day" detail panel — was DashboardView's #selLabel/#dayDetail
 * placeholders; now a real sibling component sharing CalendarProvider's
 * state instead of being written into by direct DOM access. */
export function CalendarDayDetail({ canBook, onBook }) {
  const { selectedDate, approvedBookings, showBookingDetail, roomFilter, mineOnly } = useCalendar();
  const classSchedules = useClassSchedulesForDate(selectedDate) ?? [];
  const classes = mineOnly ? [] : classSchedules.filter((c) => !roomFilter || c.roomId === roomFilter);

  if (!selectedDate) {
    return (
      <div className="mini-card">
        <div className="mc-hd"><span>เลือกวันที่</span>{canBook ? <span className="mc-act" onClick={() => onBook()}>+ จอง</span> : <span />}</div>
        <div className="day-detail"><div className="no-ev">คลิกวันที่ในปฏิทิน</div></div>
      </div>
    );
  }

  const d = new Date(`${selectedDate}T00:00:00`);
  const label = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const evs = approvedBookings().filter((b) => b.date === selectedDate && (!roomFilter || b.room === roomFilter)).sort(byStartTime);
  const items = [...evs, ...classes.map(toClassEvent)].sort(byStartTime);
  const holidayName = holidayNameByDate().get(selectedDate);
  const bookable = canBook && selectedDate >= fmtDate(new Date());

  return (
    <div className="mini-card">
      <div className="mc-hd"><span>{label}</span>{bookable ? <span className="mc-act" onClick={() => onBook(selectedDate)}>+ จอง</span> : <span />}</div>
      {holidayName && (
        <div style={{ margin: '0 14px', background: '#fee2e2', border: '.5px solid #fca5a5', borderRadius: '7px', padding: '7px 11px', fontSize: '11px', color: '#991b1b' }}>
          🔴 วันหยุด: {holidayName} — การจองในวันนี้ถือเป็นนอกเวลาราชการ ต้องผ่านการอนุมัติจากหัวหน้า/รองหัวหน้าภาควิชา
        </div>
      )}
      <div className="day-detail">
        {!items.length && <div className="no-ev">ไม่มีการจองวันนี้</div>}
        {items.map((e) => (e.cls ? classDayItem(e) : (
          <div className="ev-item" style={{ cursor: 'pointer' }} key={e.id} onClick={() => showBookingDetail(e.id)}>
            <div className="ev-bar" style={{ background: getRoomColor(e.room).bar }} />
            <div className="ev-inf">
              <div className="ev-ti">{e.redacted ? redactedLabel(e) : e.title}</div>
              <div className="ev-su" style={{ fontWeight: 500, color: '#4A4F7A' }}>ห้อง {e.room} · {e.time}</div>
              {!e.redacted && <div className="ev-su">{e.user} · <span style={{ color: e.role === 'teacher' ? '#38419D' : '#1e40af' }}>{e.role === 'teacher' ? 'อาจารย์' : 'นักศึกษา'}</span></div>}
            </div>
            <div className="ev-bdg" style={{ background: e.status === 'approved' ? '#dcfce7' : e.status === 'pending' ? '#FEF3C7' : '#fee2e2', color: e.status === 'approved' ? '#166534' : e.status === 'pending' ? '#92400e' : '#991b1b' }}>{e.redacted ? redactedLabel(e) : bookingStatusLabel(e.status)}</div>
          </div>
        )))}
      </div>
    </div>
  );
}
