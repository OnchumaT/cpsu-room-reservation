import { IC } from '../../shared/icons.js';
import { ROOM_COLORS, THAI_MONTH_ABBR } from '../../shared/constants.js';
import { BookingPermissionPolicy } from '../../domain/policies/BookingPermissionPolicy.js';

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
  if (role === 'student') return [
    { icK: 'cal', ibg: '#38419D', icC: 'white', n: s.myBookings, l: 'การจองของฉัน', ch: s.myBookingsThisWeek ? `${s.myBookingsThisWeek} รายการในสัปดาห์นี้` : 'ไม่มีรายการใหม่สัปดาห์นี้', cc: '#16a34a' },
    { icK: 'door', ibg: '#3887BE', icC: 'white', n: s.roomsAvailable, l: 'ห้องว่างตอนนี้', ch: `${s.roomsAvailable}/${s.totalRooms} ห้อง`, cc: '#8890B5' },
    { icK: 'clock', ibg: '#d97706', icC: 'white', n: s.myPending, l: 'รออนุมัติ', ch: 'รอผู้มีสิทธิ์อนุมัติ', cc: '#92400e' },
    { icK: 'ok', ibg: '#16a34a', icC: 'white', n: s.myApproved, l: 'อนุมัติแล้ว', ch: 'ใช้ได้เลย', cc: '#16a34a' },
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

export function createDashboardView({ appState, bookingRepository, templateRepository, dashboardRepository }) {
  async function load() {
    const { role, canApprove } = appState;
    const showStats = canApprove || (role !== 'teacher' && role !== 'student');
    const tasks = [bookingRepository.refresh()];
    if (showStats) tasks.push(dashboardRepository.refresh());
    if (BookingPermissionPolicy.canBookRooms(role) || canApprove) {
      tasks.push(templateRepository.refresh());
    }
    await Promise.all(tasks);
  }

  function render() {
    const { role, canApprove } = appState;
    const showStats = canApprove || (role !== 'teacher' && role !== 'student');
    const stats = showStats ? getDashStats(role, canApprove, dashboardRepository.getStats()) : [];

    const isOwnBookingRole = role === 'teacher' || role === 'student';
    const ownBookings = isOwnBookingRole
      ? bookingRepository.getAll().filter((b) => b.role === role && (b.isApproved() || b.isPending()))
      : bookingRepository.getAll().filter((b) => b.isApproved());
    const upcoming = [...ownBookings].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

    const canBook = BookingPermissionPolicy.canBookRooms(role) || canApprove;
    const hasTemplates = canBook;
    const myTemplates = hasTemplates ? templateRepository.getAll() : [];

    return `
    ${showStats ? `<div class="stats">${stats.map((s) => `<div class="stat">
      <div class="stat-ic" style="background:${s.ibg};color:${s.icC}">${IC[s.icK] || ''}</div>
      <div class="stat-n">${s.n}</div><div class="stat-l">${s.l}</div>
      ${s.ch ? `<div class="stat-ch" style="color:${s.cc}">${s.ch}</div>` : ''}
    </div>`).join('')}</div>` : ''}
    <div class="dash-layout">
      <div class="cal-card">
        <div class="cal-hd">
          <div><span class="cal-mo-txt" id="calMo"></span><span class="cal-yr-txt" id="calYr"></span></div>
          <div class="cal-hd-right">
            <div class="cnb" onclick="App.prevMonth()">‹</div>
            <div class="cnb" onclick="App.nextMonth()">›</div>
            <div class="today-chip" onclick="App.goToday()">วันนี้</div>
            ${canBook ? `<button class="add-chip" onclick="App.navigate('book')">${IC.plus} จอง</button>` : ''}
          </div>
        </div>
        <div class="cal-body">
          <div class="dow-row">${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => `<div class="dow">${d}</div>`).join('')}</div>
          <div class="days" id="calDays"></div>
        </div>
        <div class="cal-footer" style="flex-direction:column;align-items:flex-start;gap:7px;padding:12px 18px 14px">
          <div style="font-size:10.5px;font-weight:600;color:#8890B5;margin-bottom:2px">สัญลักษณ์ห้อง</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px">
            <div class="leg"><div style="width:22px;height:8px;border-radius:4px;background:#3b82f6;flex-shrink:0"></div><span style="font-size:11px;color:#1e3a8a;font-weight:500">ห้อง 1637</span></div>
            <div class="leg"><div style="width:22px;height:8px;border-radius:4px;background:#10b981;flex-shrink:0"></div><span style="font-size:11px;color:#065f46;font-weight:500">ห้อง 1638</span></div>
            <div class="leg"><div style="width:22px;height:8px;border-radius:4px;background:#f59e0b;flex-shrink:0"></div><span style="font-size:11px;color:#92400e;font-weight:500">ห้อง 1639</span></div>
            <div class="leg"><div style="width:22px;height:8px;border-radius:4px;background:#a855f7;flex-shrink:0"></div><span style="font-size:11px;color:#6b21a8;font-weight:500">ห้อง 1640</span></div>
            <div class="leg"><div style="width:22px;height:8px;border-radius:4px;background:#f43f5e;flex-shrink:0"></div><span style="font-size:11px;color:#9f1239;font-weight:500">ห้อง 1641</span></div>
          </div>
          <div style="font-size:10.5px;color:#8890B5;margin-top:2px" id="calStat"></div>
        </div>
      </div>
      <div class="right-col">
        <div class="mini-card">
          <div class="mc-hd"><span id="selLabel">เลือกวันที่</span>${canBook ? `<span class="mc-act" onclick="App.navigate('book')">+ จอง</span>` : '<span></span>'}</div>
          <div class="day-detail" id="dayDetail"><div class="no-ev">คลิกวันที่ในปฏิทิน</div></div>
        </div>
        <div class="mini-card">
          <div class="mc-hd"><span>กำลังมาถึง</span><span class="mc-act" onclick="App.navigate('history')">ดูทั้งหมด</span></div>
          ${upcoming.length ? upcoming.map((b) => {
            const d = new Date(`${b.date}T00:00:00`);
            const soon = `${d.getDate()} ${THAI_MONTH_ABBR[d.getMonth()]} ${d.getFullYear() + 543}`;
            const rc = ROOM_COLORS[b.room] || { bar: '#38419D' };
            return `<div class="upcoming-item" onclick="App.selectDay('${b.date}')">
              <div style="min-width:36px;text-align:center;border-radius:8px;padding:5px 0;background:${rc.bar}20;flex-shrink:0">
                <div style="font-size:15px;font-weight:600;color:${rc.bar};line-height:1">${d.getDate()}</div>
                <div style="font-size:9.5px;color:${rc.bar};margin-top:1px">${THAI_MONTH_ABBR[d.getMonth()]}</div>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:11.5px;font-weight:500;color:#1A1D3A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.title}</div>
                <div style="font-size:10.5px;color:#4A4F7A;margin-top:1px">ห้อง ${b.room} · ${b.time}</div>
                ${!isOwnBookingRole ? `<div style="font-size:10.5px;color:#8890B5;margin-top:1px">${b.user}</div>` : ''}
                <div style="font-size:10.5px;font-weight:500;color:${rc.bar};margin-top:2px">${soon}</div>
              </div>
              <div style="width:6px;height:6px;border-radius:50%;background:${rc.bar};flex-shrink:0;margin-top:4px"></div>
            </div>`;
          }).join('') : '<div class="no-ev" style="padding:14px">ไม่มีการจองที่กำลังมาถึง</div>'}
        </div>
        ${hasTemplates ? `<div class="mini-card">
          <div class="mc-hd"><span>เทมเพลตการจอง (${myTemplates.length})</span><span class="mc-act" onclick="App.navigate('templates')">ดูทั้งหมด</span></div>
          ${myTemplates.length ? myTemplates.slice(0, 3).map((t) => `<div class="upcoming-item" onclick="App.bookFromTemplate('${t.id}')">
              <div style="width:6px;height:6px;border-radius:50%;background:#38419D;flex-shrink:0;margin-top:4px"></div>
              <div style="flex:1;min-width:0">
                <div style="font-size:11.5px;font-weight:500;color:#1A1D3A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</div>
                <div style="font-size:10.5px;color:#4A4F7A;margin-top:1px">ห้อง ${t.room} · ${t.purpose}</div>
              </div>
            </div>`).join('') : `<div class="no-ev" style="padding:16px">ยังไม่มีเทมเพลต · <span style="color:#38419D;cursor:pointer" onclick="App.navigate('book')">ไปจองห้อง</span></div>`}
        </div>` : ''}
      </div>
    </div>`;
  }

  return { render, load };
}
