import { openModal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';
import { bookingStatusChipHtml } from '../formatters/statusLabels.js';
import { ROLE_INFO } from '../../shared/constants.js';

const EDIT_TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const FACILITY_EQUIPMENT = { mic: 'ไมโครโฟน', proj: 'โปรเจกเตอร์', wb: 'ไวท์บอร์ดเพิ่ม', ext: 'ปลั๊กพ่วง' };
const FACILITY_EQUIPMENT_MAX = { mic: 3, proj: 2, wb: 2, ext: 5 };

const STATUS_FILTERS = [
  ['all', 'ทั้งหมด'], ['approved', 'อนุมัติแล้ว'], ['pending', 'รอดำเนินการ'],
  ['rejected', 'ปฏิเสธ'], ['cancelled', 'ยกเลิก'],
];

/**
 * Shared by teacher/student ("history"), staff/head ("reservations"), and
 * admin ("allbookings") menu keys — mirrors the old renderHistory()'s
 * single implementation branching on role.
 */
export function createHistoryView({
  appState, bookingRepository, bookingDetailModal,
  editBookingUseCase, cancelBookingUseCase, approveRejectBookingUseCase,
  router,
}) {
  let editEqQty = {};
  let editFoodItems = [];

  function visibleBookings() {
    const all = bookingRepository.getAll();
    if (appState.role === 'teacher') return all.filter((b) => b.role === 'teacher');
    if (appState.role === 'student') return all.filter((b) => b.role === 'student');
    return all;
  }

  function render() {
    const isStaffGroup = ['staff', 'admin', 'head'].includes(appState.role);
    const isStaff = appState.role === 'staff';
    const isHead = appState.role === 'head';
    const canEdit = appState.role === 'teacher' || appState.role === 'student';
    const mine = visibleBookings();
    const rows = mine.filter((b) => appState.filterStatus === 'all' || b.status === appState.filterStatus);
    const today = new Date().toISOString().slice(0, 10);

    const upcoming = rows.filter((b) => b.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    const past = rows.filter((b) => b.date < today)
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

    function tableHead() {
      return `<thead><tr>
        <th style="width:64px">รหัส</th><th style="width:80px">ห้อง</th>${isStaffGroup ? '<th style="width:150px">ผู้จอง</th>' : ''}
        <th style="width:100px">วันที่</th><th style="width:100px">เวลา</th><th>วัตถุประสงค์</th><th style="width:90px">สถานะ</th><th style="width:230px">ดำเนินการ</th>
      </tr></thead>`;
    }

    function row(b, { isPast }) {
      return `<tr onclick="App.showBookingDetail('${b.id}')" style="cursor:pointer">
        <td style="font-weight:600;color:${isPast ? '#8890B5' : '#38419D'}">${b.id}</td>
        <td style="white-space:nowrap;font-weight:500;color:${isPast ? '#8890B5' : '#1A1D3A'}">ห้อง ${b.room}</td>
        ${isStaffGroup ? `<td style="white-space:nowrap;color:${isPast ? '#8890B5' : '#1A1D3A'}">${b.user}</td>` : ''}
        <td style="white-space:nowrap;color:${isPast ? '#8890B5' : '#1A1D3A'}">${b.date}</td><td style="white-space:nowrap;color:${isPast ? '#8890B5' : '#1A1D3A'}">${b.time}</td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${isPast ? '#8890B5' : '#1A1D3A'}">${b.title}</td>
        <td>${bookingStatusChipHtml(b.status)}</td>
        <td><div style="display:flex;align-items:center;gap:6px;white-space:nowrap">
          ${isPast ? '' : canEdit && b.isPending()
            ? `<button style="padding:6px 13px;font-size:12px;background:#EEF0FF;color:#38419D;border:1px solid #c7cbf0;border-radius:7px;cursor:pointer;font-family:Sarabun,sans-serif;font-weight:500;white-space:nowrap" onclick="event.stopPropagation();App.editHistoryBooking('${b.id}')">แก้ไข</button>`
            : isHead && b.isPending()
              ? `<button class="btn btn-s" style="padding:6px 13px;font-size:12px;white-space:nowrap" onclick="event.stopPropagation();App.approveHistoryBooking('${b.id}')">อนุมัติ</button><button class="btn btn-d" style="padding:6px 13px;font-size:12px;white-space:nowrap" onclick="event.stopPropagation();App.rejectHistoryBooking('${b.id}')">ปฏิเสธ</button>`
              : isStaff && b.isApproved()
                ? `<button class="btn btn-d" style="padding:6px 13px;font-size:12px;white-space:nowrap" onclick="event.stopPropagation();App.cancelHistoryBooking('${b.id}')">ยกเลิก</button>`
                : !isStaffGroup && (b.isPending() || b.isApproved())
                  ? `<button class="btn btn-d" style="padding:6px 13px;font-size:12px;white-space:nowrap" onclick="event.stopPropagation();App.cancelHistoryBooking('${b.id}')">ยกเลิก</button>`
                  : ''}
        </div></td>
      </tr>`;
    }

    function section(title, dotColor, list, { isPast }) {
      return `
      <div style="display:flex;align-items:center;gap:8px;margin:18px 0 10px">
        <span style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0"></span>
        <span style="font-size:13px;font-weight:600;color:${isPast ? '#8890B5' : '#1A1D3A'}">${title} (${list.length})</span>
      </div>
      ${list.length ? `<div class="tbl-wrap"${isPast ? ' style="opacity:.75"' : ''}><table class="tbl">
        ${tableHead()}
        <tbody>${list.map((b) => row(b, { isPast })).join('')}</tbody>
      </table></div>` : `<div style="text-align:center;padding:20px;color:#8890B5;font-size:12.5px;background:#fff;border:.5px solid #D8DBF0;border-radius:12px">ไม่มีรายการ</div>`}`;
    }

    return `
    <div class="sec-hdr">
      <span class="sec-ttl">ประวัติการจอง (${mine.length})</span>
      <div style="display:flex;gap:6px">
        ${!isStaffGroup ? `<button class="btn btn-p" onclick="App.navigate('book')">+ จองใหม่</button>` : ''}
      </div>
    </div>
    <div class="filter-row">
      ${STATUS_FILTERS.map(([key, label]) => `<button class="fchip${appState.filterStatus === key ? ' on' : ''}" onclick="App.setHistoryFilter('${key}',this)">${label}</button>`).join('')}
    </div>
    ${section('กำลังจะถึง', '#10b981', upcoming, { isPast: false })}
    ${section('ผ่านไปแล้ว', '#C2C7E0', past, { isPast: true })}`;
  }

  function setFilter(status, buttonEl) {
    appState.filterStatus = status;
    document.querySelectorAll('.fchip').forEach((b) => b.classList.remove('on'));
    buttonEl.classList.add('on');
    router.navigate(appState.page);
  }

  function editBooking(id) {
    const booking = bookingRepository.findById(id);
    if (!booking) { showToast('ไม่พบข้อมูลการจอง', 'e'); return; }
    const isTeacher = appState.role === 'teacher';
    editEqQty = { mic: 0, proj: 0, wb: 0, ext: 0 };
    editFoodItems = [];
    const [startVal, endVal] = booking.time.split(/[–-]/);
    const today = new Date().toISOString().slice(0, 10);

    const facilityHtml = isTeacher ? `
      <div style="border-top:0.5px solid #D8DBF0;margin:12px 0 10px"></div>
      <div style="font-size:11px;font-weight:600;color:#4A4F7A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">ขอสิ่งอำนวยความสะดวก <span style="font-size:10px;color:#38419D;font-weight:400">(เฉพาะอาจารย์)</span></div>
      <div style="background:#EEF0FF;border-radius:8px;padding:8px 12px;font-size:11px;color:#38419D;margin-bottom:10px">เมื่อบันทึก เจ้าหน้าที่จะได้รับแจ้งเตือนทันที</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
        ${Object.entries(FACILITY_EQUIPMENT).map(([k, nm]) => `
        <div style="background:#F4F5FA;border:0.5px solid #D8DBF0;border-radius:8px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:11px;font-weight:500;color:#1A1D3A">${nm}</span>
          <div style="display:flex;align-items:center;gap:5px">
            <button onclick="App.changeHistoryEditQty('${k}',-1)" style="width:22px;height:22px;border:0.5px solid #C2C7E0;border-radius:5px;background:#fff;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center">−</button>
            <span id="heq-${k}" style="font-size:12px;font-weight:600;min-width:16px;text-align:center;color:#38419D">0</span>
            <button onclick="App.changeHistoryEditQty('${k}',1)" style="width:22px;height:22px;border:0.5px solid #C2C7E0;border-radius:5px;background:#fff;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center">+</button>
          </div>
        </div>`).join('')}
      </div>
      <div class="form-group">
        <label class="form-label">อาหาร / เครื่องดื่ม (พิมพ์แล้วกด Enter)</label>
        <div style="border:0.5px solid #C2C7E0;border-radius:8px;overflow:hidden">
          <div style="display:flex">
            <input type="text" id="editFoodInp" placeholder="เช่น กาแฟร้อน 5 แก้ว..." style="flex:1;border:none;padding:8px 10px;font-size:12px;font-family:Sarabun,sans-serif;outline:none;color:#1A1D3A" onkeydown="if(event.key==='Enter')App.addHistoryEditFood()">
            <button onclick="App.addHistoryEditFood()" style="padding:0 12px;background:#38419D;color:white;border:none;font-size:11px;cursor:pointer;font-family:Sarabun,sans-serif;font-weight:500">+ เพิ่ม</button>
          </div>
          <div id="editFoodTags" style="display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;background:#F4F5FA;min-height:34px">
            <span style="font-size:11px;color:#8890B5">ยังไม่มีรายการอาหาร</span>
          </div>
        </div>
      </div>` : '';

    openModal(
      `แก้ไขการจอง ${booking.id}`,
      `<div style="background:#EEF0FF;border-radius:8px;padding:8px 12px;font-size:11px;color:#38419D;margin-bottom:14px">
        กำลังแก้ไข: <strong>ห้อง ${booking.room}</strong> · ${booking.date} · ${booking.time}
      </div>
      <div class="form-group">
        <label class="form-label">วันที่ *</label>
        <input type="date" class="form-control" id="editDate" value="${booking.date}" min="${today}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group">
          <label class="form-label">เวลาเริ่มต้น *</label>
          <select class="form-control" id="editStart">${EDIT_TIMES.map((t) => `<option${t === startVal ? ' selected' : ''}>${t}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label class="form-label">เวลาสิ้นสุด *</label>
          <select class="form-control" id="editEnd">${EDIT_TIMES.map((t) => `<option${t === endVal ? ' selected' : ''}>${t}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">เหตุผลการใช้ห้อง / วัตถุประสงค์ *</label>
        <input type="text" class="form-control" id="editTitle" value="${booking.title}" placeholder="ระบุวัตถุประสงค์...">
      </div>
      <div class="form-group">
        <label class="form-label">รายละเอียดเพิ่มเติม</label>
        <textarea class="form-control" id="editNote" rows="2" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)">${booking.note || ''}</textarea>
      </div>
      ${facilityHtml}`,
      `<button class="btn btn-o" onclick="App.closeModal()">ยกเลิก</button>
       <button class="btn btn-p" onclick="App.saveHistoryEdit('${booking.id}')">บันทึกการแก้ไข</button>`,
    );
  }

  function changeEditQty(key, delta) {
    const max = FACILITY_EQUIPMENT_MAX[key] || 5;
    editEqQty[key] = Math.max(0, Math.min(max, (editEqQty[key] || 0) + delta));
    const el = document.getElementById(`heq-${key}`);
    if (el) el.textContent = editEqQty[key];
  }

  function addEditFood() {
    const input = document.getElementById('editFoodInp');
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    editFoodItems.push(value);
    input.value = '';
    renderEditFoodTags();
    input.focus();
  }

  function removeEditFood(index) {
    editFoodItems.splice(index, 1);
    renderEditFoodTags();
  }

  function renderEditFoodTags() {
    const wrap = document.getElementById('editFoodTags');
    if (!wrap) return;
    wrap.innerHTML = editFoodItems.length
      ? editFoodItems.map((item, i) => `<div style="display:flex;align-items:center;gap:4px;background:#fff;border:0.5px solid #C2C7E0;border-radius:20px;padding:3px 9px;font-size:11px;color:#1A1D3A"><span>${item}</span><span onclick="App.removeHistoryEditFood(${i})" style="color:#8890B5;cursor:pointer;font-size:14px;line-height:1">×</span></div>`).join('')
      : '<span style="font-size:11px;color:#8890B5">ยังไม่มีรายการอาหาร</span>';
  }

  function saveEdit(id) {
    const date = document.getElementById('editDate')?.value;
    const start = document.getElementById('editStart')?.value;
    const end = document.getElementById('editEnd')?.value;
    const title = document.getElementById('editTitle')?.value?.trim();
    const note = document.getElementById('editNote')?.value;
    if (!date || !start || !end || !title) { showToast('กรุณากรอกข้อมูลให้ครบ', 'e'); return; }
    if (start >= end) { showToast('เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น', 'e'); return; }

    const result = editBookingUseCase.execute({
      bookingId: id, date, start, end, title, note,
      role: appState.role,
      facility: { equipment: { ...editEqQty }, food: [...editFoodItems] },
    });
    if (!result.success) { showToast('ไม่พบข้อมูลการจอง', 'e'); return; }

    closeAndRefresh('บันทึกการแก้ไขเรียบร้อยแล้ว', 's');
    if (result.notifiedStaff) {
      setTimeout(() => showToast('แจ้งเตือนเจ้าหน้าที่เรียบร้อยแล้ว', 'i'), 600);
    }
    editEqQty = { mic: 0, proj: 0, wb: 0, ext: 0 };
    editFoodItems = [];
  }

  function cancelBooking(id) {
    if (!confirm('ต้องการยกเลิก?')) return;
    cancelBookingUseCase.execute({
      bookingId: id,
      actorRole: appState.role,
      actorName: ROLE_INFO[appState.role].name,
    });
    closeAndRefresh('ยกเลิกแล้ว', 'i');
  }

  function approveBooking(id) {
    approveRejectBookingUseCase.approve(id);
    closeAndRefresh('อนุมัติแล้ว', 's');
  }

  function rejectBooking(id) {
    approveRejectBookingUseCase.reject(id);
    closeAndRefresh('ปฏิเสธแล้ว', 'i');
  }

  function closeAndRefresh(message, type) {
    showToast(message, type);
    router.navigate(appState.page);
  }

  return {
    render,
    setFilter,
    editBooking,
    changeEditQty,
    addEditFood,
    removeEditFood,
    saveEdit,
    cancelBooking,
    approveBooking,
    rejectBooking,
  };
}
