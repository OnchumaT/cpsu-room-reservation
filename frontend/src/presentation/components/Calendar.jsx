import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { MONTHS, DAYS, getRoomColor } from '../../shared/constants.js';
import { bookingStatusLabel } from '../formatters/statusLabels.js';
import { container } from '../../shared/di/container.js';
import { useBookingDetailModal } from './BookingDetailModal.jsx';

const { roomRepository, holidayRepository } = container.repositories;

/** date string -> holiday name, so a cell/day-detail lookup is O(1). Read
 * fresh on every render (cheap, small list) — same live-cache pattern as
 * roomRepository.getAll() just below, no extra state needed. */
function holidayNameByDate() {
  return new Map(holidayRepository.getAll().map((h) => [h.date, h.name]));
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "08:00-09:00" strings sort correctly as plain text (zero-padded 24h),
// so the earliest start time always lands first — including same-room,
// same-day bookings.
const byStartTime = (a, b) => a.time.localeCompare(b.time);

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
  const { show: showBookingDetail } = useBookingDetailModal();

  const approvedBookings = useCallback(
    () => container.repositories.bookingRepository.getAll().filter((b) => b.isApproved()),
    [],
  );

  // Clicking an already-selected room in the legend clears the filter.
  const toggleRoomFilter = useCallback((roomId) => {
    setRoomFilter((prev) => (prev === roomId ? null : roomId));
  }, []);

  const selectDay = useCallback((dateStr) => setSelectedDate(dateStr), []);
  const goToPrevMonth = useCallback(() => {
    setVisibleMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setSelectedDate(null);
  }, []);
  const goToNextMonth = useCallback(() => {
    setVisibleMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setSelectedDate(null);
  }, []);
  const goToToday = useCallback(() => {
    setVisibleMonth(new Date());
    setSelectedDate(fmtDate(new Date()));
  }, []);

  const value = useMemo(() => ({
    visibleMonth, selectedDate, approvedBookings, selectDay,
    goToPrevMonth, goToNextMonth, goToToday, showBookingDetail,
    roomFilter, toggleRoomFilter,
  }), [visibleMonth, selectedDate, approvedBookings, selectDay, goToPrevMonth, goToNextMonth, goToToday, showBookingDetail, roomFilter, toggleRoomFilter]);

  return <CalendarCtx.Provider value={value}>{children}</CalendarCtx.Provider>;
}

export function useCalendar() {
  const ctx = useContext(CalendarCtx);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}

/** The month-grid calendar card. */
export function Calendar({ canBook, onBook }) {
  const { visibleMonth, selectedDate, approvedBookings, selectDay, goToPrevMonth, goToNextMonth, goToToday, showBookingDetail, roomFilter, toggleRoomFilter } = useCalendar();

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
    const shown = evs.slice(0, 3);
    cells.push(
      <div
        className={`dc${ds === todStr ? ' tod' : ''}${selectedDate === ds ? ' sel' : ''}`}
        key={ds}
        onClick={() => selectDay(ds)}
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
                title={`${e.user} | ${e.title} | ${e.time}`}
                onClick={(ev) => { ev.stopPropagation(); showBookingDetail(e.id); }}
              >
                ห้อง {e.room} · {e.time}
              </div>
            );
          })}
          {evs.length > 3 && <div className="ep-more" style={{ fontSize: '9.5px', color: '#38419D', fontWeight: 600, padding: '1px 3px' }}>+{evs.length - 3} อื่นๆ</div>}
        </div>
      </div>,
    );
  }
  for (let i = 1; i <= 42 - first - total; i += 1) {
    cells.push(<div className="dc oth" key={`n${i}`}><span className="dn">{i}</span></div>);
  }

  return (
    <div className="cal-card">
      <div className="cal-hd">
        <div><span className="cal-mo-txt">{MONTHS[m]}</span><span className="cal-yr-txt">{y + 543}</span></div>
        <div className="cal-hd-right">
          <div className="cnb" onClick={goToPrevMonth}>‹</div>
          <div className="cnb" onClick={goToNextMonth}>›</div>
          <div className="today-chip" onClick={goToToday}>วันนี้</div>
          {canBook && <button className="add-chip" onClick={onBook}>+ จอง</button>}
        </div>
      </div>
      <div className="cal-body">
        <div className="dow-row">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => <div className="dow" key={d}>{d}</div>)}</div>
        <div className="days">{cells}</div>
      </div>
      <div className="cal-footer" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '7px', padding: '12px 18px 14px' }}>
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
        <div style={{ fontSize: '10.5px', color: '#8890B5', marginTop: '2px' }}>{monthEvents.length} การจองในเดือนนี้{roomFilter ? ` · ห้อง ${roomFilter}` : ''}</div>
      </div>
    </div>
  );
}

/** The "selected day" detail panel — was DashboardView's #selLabel/#dayDetail
 * placeholders; now a real sibling component sharing CalendarProvider's
 * state instead of being written into by direct DOM access. */
export function CalendarDayDetail({ canBook, onBook }) {
  const { selectedDate, approvedBookings, showBookingDetail, roomFilter } = useCalendar();

  if (!selectedDate) {
    return (
      <div className="mini-card">
        <div className="mc-hd"><span>เลือกวันที่</span>{canBook ? <span className="mc-act" onClick={onBook}>+ จอง</span> : <span />}</div>
        <div className="day-detail"><div className="no-ev">คลิกวันที่ในปฏิทิน</div></div>
      </div>
    );
  }

  const d = new Date(`${selectedDate}T00:00:00`);
  const label = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const evs = approvedBookings().filter((b) => b.date === selectedDate && (!roomFilter || b.room === roomFilter)).sort(byStartTime);
  const holidayName = holidayNameByDate().get(selectedDate);

  return (
    <div className="mini-card">
      <div className="mc-hd"><span>{label}</span>{canBook ? <span className="mc-act" onClick={onBook}>+ จอง</span> : <span />}</div>
      {holidayName && (
        <div style={{ margin: '0 14px', background: '#fee2e2', border: '.5px solid #fca5a5', borderRadius: '7px', padding: '7px 11px', fontSize: '11px', color: '#991b1b' }}>
          🔴 วันหยุด: {holidayName} — การจองในวันนี้ถือเป็นนอกเวลาราชการ ต้องผ่านอนุมัติ 2 ขั้น (ภาควิชา แล้วจึงคณะ)
        </div>
      )}
      <div className="day-detail">
        {!evs.length && <div className="no-ev">ไม่มีการจองวันนี้</div>}
        {evs.map((e) => (
          <div className="ev-item" style={{ cursor: 'pointer' }} key={e.id} onClick={() => showBookingDetail(e.id)}>
            <div className="ev-bar" style={{ background: getRoomColor(e.room).bar }} />
            <div className="ev-inf">
              <div className="ev-ti">{e.title}</div>
              <div className="ev-su" style={{ fontWeight: 500, color: '#4A4F7A' }}>ห้อง {e.room} · {e.time}</div>
              <div className="ev-su">{e.user} · <span style={{ color: e.role === 'teacher' ? '#38419D' : '#1e40af' }}>{e.role === 'teacher' ? 'อาจารย์' : 'นักศึกษา'}</span></div>
            </div>
            <div className="ev-bdg" style={{ background: e.status === 'approved' ? '#dcfce7' : e.status === 'pending' ? '#FEF3C7' : '#fee2e2', color: e.status === 'approved' ? '#166534' : e.status === 'pending' ? '#92400e' : '#991b1b' }}>{bookingStatusLabel(e.status)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
