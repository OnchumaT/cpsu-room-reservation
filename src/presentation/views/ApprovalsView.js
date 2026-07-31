import { showToast } from '../components/Toast.js';

/** Head-only queue of pending bookings. */
export function createApprovalsView({ bookingRepository, approveRejectBookingUseCase, router }) {
  function render() {
    const pending = bookingRepository.getAll().filter((b) => b.isPending());
    return `
    <div class="sec-hdr">
      <span class="sec-ttl">คิวรออนุมัติ (${pending.length})</span>
      ${pending.length ? `<button class="btn btn-s" onclick="App.approveAllPending()">อนุมัติทั้งหมด</button>` : ''}
    </div>
    ${!pending.length ? `<div style="text-align:center;padding:40px;color:#8890B5">ไม่มีรายการรออนุมัติ</div>` : pending.map((b) => `
    <div class="ap-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div>
          <div style="font-size:13px;font-weight:500;margin-bottom:3px">${b.user}</div>
          <div style="font-size:11px;color:#8890B5;margin-bottom:8px">${b.title}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="chip chip-a">ห้อง ${b.room}</span><span class="chip chip-a">${b.date}</span><span class="chip chip-a">${b.time}</span>
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">
          <button class="btn btn-s" onclick="App.approvePendingBooking('${b.id}')">อนุมัติ</button>
          <button class="btn btn-d" onclick="App.rejectPendingBooking('${b.id}')">ปฏิเสธ</button>
        </div>
      </div>
    </div>`).join('')}`;
  }

  function approveAll() {
    approveRejectBookingUseCase.approveAllPending();
    refresh('อนุมัติทั้งหมดแล้ว', 's');
  }

  function approve(id) {
    approveRejectBookingUseCase.approve(id);
    refresh('อนุมัติแล้ว', 's');
  }

  function reject(id) {
    approveRejectBookingUseCase.reject(id);
    refresh('ปฏิเสธแล้ว', 'i');
  }

  function refresh(message, type) {
    showToast(message, type);
    router.navigate('approvals');
  }

  return { render, approveAll, approve, reject };
}
