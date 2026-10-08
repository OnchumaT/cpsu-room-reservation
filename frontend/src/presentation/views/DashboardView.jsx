import { useEffect, useState } from 'react';
import { IC } from '../../shared/icons.js';
import { THAI_MONTH_ABBR, getRoomColor } from '../../shared/constants.js';
import { localDateStr } from '../../shared/dateUtils.js';
import { BookingPermissionPolicy } from '../../domain/policies/BookingPermissionPolicy.js';
import { TimeRange } from '../../domain/policies/TimeRange.js';
import { container } from '../../shared/di/container.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { Calendar, CalendarDayDetail, CalendarProvider, useCalendar, useClassSchedulesForDate } from '../components/Calendar.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { bookingRepository, templateRepository, dashboardRepository, roomRepository, holidayRepository } = container.repositories;

// Loaded on every visit, so a newly imported timetable shows the next time the Dashboard opens.
function TodayClassesCard() {
  const classes = useClassSchedulesForDate(localDateStr());
  return (
    <div className="mini-card">
      <div className="mc-hd"><span>ตารางเรียนวันนี้</span></div>
      <div className="day-detail">
        {classes === null && <div className="no-ev">กำลังโหลด…</div>}
        {classes?.length === 0 && <div className="no-ev">วันนี้ไม่มีคาบเรียน</div>}
        {classes?.map((c) => (
          <div className="ev-item" key={c.id}>
            <div className="ev-bar" style={{ background: '#94a3b8' }} />
            <div className="ev-inf">
              <div className="ev-ti">{c.courseCode} · กลุ่ม {c.section}</div>
              <div className="ev-su" style={{ fontWeight: 500, color: '#4A4F7A' }}>{c.roomName} · {c.start}–{c.end}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard stat cards, per role — numbers come from GetDashboardStatsUseCase
// (live counts from the database, see ApiDashboardRepository). "Change" text
// is limited to figures we can compute honestly (real counts within a real
// time window, or a real ratio) — never a fabricated percentage.
function getDashStats(role, canApprove, s) {
  if (canApprove) return [
    { icK: 'clock', ibg: '#d97706', icC: 'white', n: s.pendingBookings, l: 'รออนุมัติ', ch: s.pendingBookingsToday ? `${s.pendingBookingsToday} รายการใหม่วันนี้` : 'ไม่มีรายการใหม่วันนี้', cc: '#92400e' },
    { icK: 'list', ibg: '#38419D', icC: 'white', n: s.totalBookings, l: 'การจองทั้งหมด', ch: `อนุมัติแล้ว ${s.approvedThisMonth} รายการเดือนนี้`, cc: '#16a34a' },
    { icK: 'ok', ibg: '#16a34a', icC: 'white', n: s.approvedThisMonth, l: 'อนุมัติแล้วเดือนนี้', ch: 'เดือนนี้', cc: '#16a34a' },
    { icK: 'door', ibg: '#3887BE', icC: 'white', n: s.roomsAvailable, l: 'ห้องว่างตอนนี้', ch: `${s.roomsAvailable}/${s.totalRooms} ห้อง`, cc: '#8890B5' },
  ];
  if (role === 'teacher') return [
    { icK: 'cal', ibg: '#38419D', icC: 'white', n: s.myBookings, l: 'การจองของฉัน', ch: s.myBookingsThisWeek ? `${s.myBookingsThisWeek} รายการในสัปดาห์นี้` : 'ไม่มีรายการใหม่สัปดาห์นี้', cc: '#16a34a' },
    { icK: 'door', ibg: '#3887BE', icC: 'white', n: s.roomsAvailable, l: 'ห้องว่างตอนนี้', ch: `${s.roomsAvailable}/${s.totalRooms} ห้อง`, cc: '#8890B5' },
    { icK: 'ok', ibg: '#16a34a', icC: 'white', n: s.myApproved, l: 'อนุมัติแล้ว', ch: 'ใช้ได้เลย', cc: '#16a34a' },
    { icK: 'tool', ibg: '#d97706', icC: 'white', n: s.myFacilityRequestsPending, l: 'คำขอสิ่งอำนวยความสะดวกเพิ่มเติม', ch: 'รอดำเนินการ', cc: '#92400e' },
  ];
  if (role === 'staff') return [
    { icK: 'list', ibg: '#38419D', icC: 'white', n: s.totalBookings, l: 'การจองทั้งหมด', ch: `อนุมัติแล้ว ${s.approvedThisMonth} รายการเดือนนี้`, cc: '#16a34a' },
    { icK: 'monitor', ibg: '#d97706', icC: 'white', n: s.roomsInUseToday, l: 'ห้องที่ใช้งานวันนี้', ch: `จาก ${s.totalRooms} ห้อง`, cc: '#8890B5' },
    { icK: 'box', ibg: '#38419D', icC: 'white', n: s.facilityRequestsPending, l: 'คำขอสิ่งอำนวยความสะดวกเพิ่มเติม', ch: 'รอจัดเตรียม', cc: '#92400e' },
    { icK: 'door', ibg: '#16a34a', icC: 'white', n: s.roomsAvailable, l: 'ห้องว่างตอนนี้', ch: `${s.roomsAvailable}/${s.totalRooms} ห้อง`, cc: '#8890B5' },
  ];
  return [
    { icK: 'users', ibg: '#38419D', icC: 'white', n: s.totalUsers, l: 'ผู้ใช้ทั้งหมด', ch: 'ผู้ใช้ที่ยังใช้งานอยู่', cc: '#16a34a' },
    { icK: 'list', ibg: '#3887BE', icC: 'white', n: s.bookingsThisMonth, l: 'การจองเดือนนี้', ch: `อนุมัติแล้ว ${s.approvedThisMonth} รายการ`, cc: '#16a34a' },
    { icK: 'door', ibg: '#16a34a', icC: 'white', n: s.totalRooms, l: 'ห้องทั้งหมด', ch: `ว่าง ${s.roomsAvailable} ห้อง`, cc: '#8890B5' },
    { icK: 'clock', ibg: '#d97706', icC: 'white', n: s.pendingBookings, l: 'รออนุมัติ', ch: 'รอดำเนินการ', cc: '#92400e' },
  ];
}

function UpcomingCard({ upcoming, isOwnBookingRole, navigate }) {
  const { selectDay } = useCalendar();
  return (
    <div className="mini-card">
      <div className="mc-hd"><span>กำลังมาถึง</span><span className="mc-act" onClick={() => navigate('history')}>ดูทั้งหมด</span></div>
      {upcoming.length ? upcoming.map((b) => {
        const d = new Date(`${b.date}T00:00:00`);
        const soon = `${d.getDate()} ${THAI_MONTH_ABBR[d.getMonth()]} ${d.getFullYear() + 543}`;
        const rc = getRoomColor(b.room);
        return (
          <div className="upcoming-item" key={b.id} onClick={() => selectDay(b.date)}>
            <div style={{ minWidth: '36px', textAlign: 'center', borderRadius: '8px', padding: '5px 0', background: `${rc.bar}20`, flexShrink: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: rc.bar, lineHeight: 1 }}>{d.getDate()}</div>
              <div style={{ fontSize: '9.5px', color: rc.bar, marginTop: '1px' }}>{THAI_MONTH_ABBR[d.getMonth()]}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11.5px', fontWeight: 500, color: '#1A1D3A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
              <div style={{ fontSize: '10.5px', color: '#4A4F7A', marginTop: '1px' }}>ห้อง {b.room} · {b.time}</div>
              {!isOwnBookingRole && <div style={{ fontSize: '10.5px', color: '#8890B5', marginTop: '1px' }}>{b.user}</div>}
              <div style={{ fontSize: '10.5px', fontWeight: 500, color: rc.bar, marginTop: '2px' }}>{soon}</div>
            </div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: rc.bar, flexShrink: 0, marginTop: '4px' }} />
          </div>
        );
      }) : <div className="no-ev" style={{ padding: '14px' }}>ไม่มีการจองที่กำลังมาถึง</div>}
    </div>
  );
}

export function DashboardView() {
  const { role, canApprove, user } = useAuth();
  const { navigate, setBookingDateToApply } = useAppShell();
  const isPending = role === 'pending';
  const showStats = !isPending && (canApprove || role !== 'teacher');
  const canBook = BookingPermissionPolicy.canBookRooms(role) || canApprove;

  const { loading, error } = useRepository(() => {
    // A pending (unapproved Google self-signup) account has nothing to
    // fetch here — no bookings, no calendar, no stats — see the early
    // return below.
    if (isPending) return Promise.resolve();
    // roomRepository powers the calendar's room-color legend, holidayRepository
    // the "วันหยุด" markers on the grid (both in Calendar.jsx).
    const tasks = [bookingRepository.refresh(), roomRepository.refresh(), holidayRepository.refresh()];
    if (showStats) tasks.push(dashboardRepository.refresh());
    if (canBook) tasks.push(templateRepository.refresh());
    return Promise.all(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, canApprove]);

  // Keeps "กำลังมาถึง"/the calendar in sync with bookings other users make
  // while this page stays open — polls quietly (no loading flicker, skips
  // while the tab is hidden) instead of requiring a manual refresh.
  const [, setPollTick] = useState(0);
  useEffect(() => {
    if (loading) return undefined;
    const id = setInterval(() => {
      if (document.hidden) return;
      bookingRepository.refresh().then(() => setPollTick((n) => n + 1)).catch(() => {});
    }, 18000);
    return () => clearInterval(id);
  }, [loading]);

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;
  if (isPending) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8890B5', fontSize: '13px', background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1D3A', marginBottom: '6px' }}>บัญชีของคุณรอการอนุมัติจากแอดมิน</div>
        <div>เมื่อแอดมินกำหนดบทบาทให้บัญชีนี้แล้ว คุณจะสามารถจองห้องได้ตามปกติ</div>
      </div>
    );
  }

  const stats = showStats ? getDashStats(role, canApprove, dashboardRepository.getStats()) : [];
  const isOwnBookingRole = role === 'teacher';
  const today = localDateStr();
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const ownBookings = isOwnBookingRole
    ? bookingRepository.getAll().filter((b) => String(b.userId) === String(user.id) && b.isApproved())
    : bookingRepository.getAll().filter((b) => b.isApproved());
  // "กำลังมาถึง" must drop today's bookings once their end time has passed —
  // date >= today alone would keep showing them all day after they're over.
  const upcoming = [...ownBookings]
    .filter((b) => b.date > today || (b.date === today && TimeRange.fromLabel(b.time).end > nowTime))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 3);

  const hasTemplates = canBook;
  const myTemplates = hasTemplates ? templateRepository.getAll() : [];

  return (
    <CalendarProvider>
      {showStats && (
        <div className="stats">
          {stats.map((s) => (
            <div className="stat" key={s.l}>
              <div className="stat-ic" style={{ background: s.ibg, color: s.icC }} dangerouslySetInnerHTML={{ __html: IC[s.icK] || '' }} />
              <div className="stat-n">{s.n}</div><div className="stat-l">{s.l}</div>
              {s.ch && <div className="stat-ch" style={{ color: s.cc }}>{s.ch}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="dash-layout">
        <Calendar canBook={canBook} onBook={(date) => { setBookingDateToApply(date); navigate('book'); }} />
        <div className="right-col">
          <TodayClassesCard />
          <CalendarDayDetail canBook={canBook} onBook={(date) => { setBookingDateToApply(date); navigate('book'); }} />
          <UpcomingCard upcoming={upcoming} isOwnBookingRole={isOwnBookingRole} navigate={navigate} />
          {hasTemplates && (
            <div className="mini-card">
              <div className="mc-hd"><span>เทมเพลตการจอง ({myTemplates.length})</span><span className="mc-act" onClick={() => navigate('templates')}>ดูทั้งหมด</span></div>
              {myTemplates.length ? myTemplates.slice(0, 3).map((t) => (
                <div className="upcoming-item" key={t.id} onClick={() => navigate('templates')}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getRoomColor(t.room).bar, flexShrink: 0, marginTop: '4px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 500, color: '#1A1D3A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                    <div style={{ fontSize: '10.5px', color: getRoomColor(t.room).bar, fontWeight: 500, marginTop: '1px' }}>ห้อง {t.room} · {t.purpose}</div>
                  </div>
                </div>
              )) : (
                <div className="no-ev" style={{ padding: '16px' }}>ยังไม่มีเทมเพลต · <span style={{ color: '#38419D', cursor: 'pointer' }} onClick={() => navigate('book')}>ไปจองห้อง</span></div>
              )}
            </div>
          )}
        </div>
      </div>
    </CalendarProvider>
  );
}
