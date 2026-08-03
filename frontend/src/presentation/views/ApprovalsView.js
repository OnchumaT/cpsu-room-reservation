import { showToast } from '../components/Toast.js';

/** Queue of pending bookings — visible to anyone holding a can_approve management position. */
export function createApprovalsView({ bookingRepository, approveRejectBookingUseCase, router }) {
  let pending = [];

  async function load() {
    pending = await bookingRepository.getPending();
  }

  function render() {
    return `
    <div class="sec-hdr">
      <span class="sec-ttl">คิวรออนุมัติ (${pending.length})</span>
    </div>
    ${!pending.length ? `<div style="text-align:center;padding:40px;color:#8890B5">ไม่มีรายการรออนุมัติ</div>` : pending.map((b) => `
    <div class="ap-card" onclick="App.showBookingDetail('${b.id}')" style="cursor:pointer" onmouseover="this.style.background='#F9FAFF'" onmouseout="this.style.background=''">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div>
          <div style="font-size:13px;font-weight:500;margin-bottom:3px">${b.user}</div>
          <div style="font-size:11px;color:#8890B5;margin-bottom:8px">${b.title}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="chip chip-a">ห้อง ${b.room}</span><span class="chip chip-a">${b.date}</span><span class="chip chip-a">${b.time}</span>
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">
          <button class="btn btn-s" onclick="event.stopPropagation();App.approvePendingBooking('${b.id}')">อนุมัติ</button>
          <button class="btn btn-d" onclick="event.stopPropagation();App.rejectPendingBooking('${b.id}')">ปฏิเสธ</button>
        </div>
      </div>
    </div>`).join('')}`;
  }

  async function approve(id) {
    try {
      await approveRejectBookingUseCase.approve(id);
      await refresh('อนุมัติแล้ว', 's');
    } catch (err) {
      showToast(err.message || 'อนุมัติไม่สำเร็จ', 'e');
    }
  }

  async function reject(id) {
    const reason = prompt('เหตุผลที่ปฏิเสธ:');
    if (!reason?.trim()) return;
    try {
      await approveRejectBookingUseCase.reject(id, reason.trim());
      await refresh('ปฏิเสธแล้ว', 'i');
    } catch (err) {
      showToast(err.message || 'ปฏิเสธไม่สำเร็จ', 'e');
    }
  }

  async function refresh(message, type) {
    showToast(message, type);
    await router.navigate('approvals');
  }

  return { render, load, approve, reject };
}
