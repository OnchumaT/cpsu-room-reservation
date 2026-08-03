import { MONTHS, DAYS, ROOM_COLORS } from '../../shared/constants.js';
import { bookingStatusLabel } from '../formatters/statusLabels.js';

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The month-grid calendar + "selected day" panel on the Dashboard. Bound
 * once to its dependencies by the composition root (bookingRepository,
 * appState, and the shared booking-detail modal), so views just call
 * renderGrid()/renderDayDetail() after they've inserted the calendar's
 * container markup into the DOM. */
export function createCalendar({ bookingRepository, appState, bookingDetailModal }) {
  function approvedBookings() {
    return bookingRepository.getAll().filter((b) => b.isApproved());
  }

  function renderGrid() {
    const y = appState.calendarDate.getFullYear();
    const m = appState.calendarDate.getMonth();
    const moEl = document.getElementById('calMo');
    const yrEl = document.getElementById('calYr');
    if (moEl) moEl.textContent = MONTHS[m];
    if (yrEl) yrEl.textContent = y + 543;

    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const todStr = fmtDate(new Date());
    const visible = approvedBookings();
    const moStr = `${y}-${String(m + 1).padStart(2, '0')}`;
    const monthEvents = visible.filter((b) => b.date.startsWith(moStr));

    let cells = '';
    for (let i = 0; i < first; i += 1) {
      cells += `<div class="dc oth"><span class="dn">${new Date(y, m, 0).getDate() - first + i + 1}</span></div>`;
    }
    for (let day = 1; day <= total; day += 1) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const evs = visible.filter((b) => b.date === ds).sort((a, b) => a.time.localeCompare(b.time));
      let pills = '';
      evs.slice(0, 3).forEach((e) => {
        const rc = ROOM_COLORS[e.room] || { bg: '#E0E7FF', text: '#3730a3' };
        pills += `<div class="ep" style="background:${rc.bg};color:${rc.text};cursor:pointer;font-weight:600" title="${e.user} | ${e.title} | ${e.time}" onclick="event.stopPropagation();App.showBookingDetail('${e.id}')">ห้อง ${e.room} · ${e.time.split('–')[0]}</div>`;
      });
      if (evs.length > 3) pills += `<div class="ep-more" style="font-size:9.5px;color:#38419D;font-weight:600;padding:1px 3px">+${evs.length - 3} อื่นๆ</div>`;
      cells += `<div class="dc${ds === todStr ? ' tod' : ''}${appState.selectedDate === ds ? ' sel' : ''}" onclick="App.selectDay('${ds}')"><span class="dn">${day}</span><div class="eps">${pills}</div></div>`;
    }
    for (let i = 1; i <= 42 - first - total; i += 1) {
      cells += `<div class="dc oth"><span class="dn">${i}</span></div>`;
    }

    const daysEl = document.getElementById('calDays');
    if (daysEl) daysEl.innerHTML = cells;
    const statEl = document.getElementById('calStat');
    if (statEl) statEl.textContent = `${monthEvents.length} การจองในเดือนนี้`;
  }

  function renderDayDetail() {
    const labelEl = document.getElementById('selLabel');
    const bodyEl = document.getElementById('dayDetail');
    if (!labelEl || !bodyEl) return;
    if (!appState.selectedDate) {
      labelEl.textContent = 'เลือกวันที่';
      bodyEl.innerHTML = '<div class="no-ev">คลิกวันที่ในปฏิทิน</div>';
      return;
    }
    const d = new Date(`${appState.selectedDate}T00:00:00`);
    labelEl.textContent = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const evs = approvedBookings().filter((b) => b.date === appState.selectedDate).sort((a, b) => a.time.localeCompare(b.time));
    if (!evs.length) {
      bodyEl.innerHTML = '<div class="no-ev">ไม่มีการจองวันนี้</div>';
      return;
    }
    bodyEl.innerHTML = evs.map((e) => `<div class="ev-item" style="cursor:pointer" onclick="App.showBookingDetail('${e.id}')">
      <div class="ev-bar" style="background:${(ROOM_COLORS[e.room] || { bar: '#3b82f6' }).bar}"></div>
      <div class="ev-inf">
        <div class="ev-ti">${e.title}</div>
        <div class="ev-su" style="font-weight:500;color:#4A4F7A">ห้อง ${e.room} · ${e.time}</div>
        <div class="ev-su">${e.user} · <span style="color:${e.role === 'teacher' ? '#38419D' : '#1e40af'}">${e.role === 'teacher' ? 'อาจารย์' : 'นักศึกษา'}</span></div>
      </div>
      <div class="ev-bdg" style="background:${e.status === 'approved' ? '#dcfce7' : e.status === 'pending' ? '#FEF3C7' : '#fee2e2'};color:${e.status === 'approved' ? '#166534' : e.status === 'pending' ? '#92400e' : '#991b1b'}">${bookingStatusLabel(e.status)}</div>
    </div>`).join('');
  }

  function selectDay(dateStr) {
    appState.selectedDate = dateStr;
    renderGrid();
    renderDayDetail();
  }

  function goToPrevMonth() {
    appState.calendarDate = new Date(appState.calendarDate.getFullYear(), appState.calendarDate.getMonth() - 1, 1);
    appState.selectedDate = null;
    renderGrid();
    renderDayDetail();
  }

  function goToNextMonth() {
    appState.calendarDate = new Date(appState.calendarDate.getFullYear(), appState.calendarDate.getMonth() + 1, 1);
    appState.selectedDate = null;
    renderGrid();
    renderDayDetail();
  }

  function goToToday() {
    appState.calendarDate = new Date();
    appState.selectedDate = fmtDate(new Date());
    renderGrid();
    renderDayDetail();
  }

  function showBookingDetail(bookingId) {
    bookingDetailModal.show(bookingId);
  }

  return { renderGrid, renderDayDetail, selectDay, goToPrevMonth, goToNextMonth, goToToday, showBookingDetail };
}
