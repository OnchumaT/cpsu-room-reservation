import { openModal, closeModal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';

const STATUS_LABEL = { pending: 'รอดำเนินการ', accepted: 'รับคำขอแล้ว', done: 'จัดการแล้ว' };
const STATUS_BG = { pending: '#FEF3C7', accepted: '#EEF0FF', done: '#dcfce7' };
const STATUS_COLOR = { pending: '#92400e', accepted: '#38419D', done: '#166534' };

/** Staff-only queue of equipment/food requests attached to Teacher bookings. */
export function createFacilityQueueView({ facilityRequestRepository, updateFacilityRequestStatusUseCase, router }) {
  function render() {
    const requests = facilityRequestRepository.getAll();
    return `
    <div class="sec-hdr"><span class="sec-ttl">คำขอสิ่งอำนวยความสะดวก (${requests.length})</span></div>
    <div style="background:#EEF0FF;border-radius:8px;padding:8px 12px;font-size:11px;color:#38419D;margin-bottom:12px">เฉพาะอาจารย์เท่านั้นที่สามารถส่งคำขอได้ · เจ้าหน้าที่จัดการคำขอในหน้านี้</div>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>รหัส</th><th>ผู้ขอ</th><th>ห้อง</th><th>รายการ</th><th>ส่งเมื่อ</th><th>สถานะ</th><th>ดำเนินการ</th></tr></thead>
      <tbody>${requests.map((r) => `<tr>
        <td style="font-weight:500;color:#38419D">${r.id}</td>
        <td style="font-weight:500">${r.who.split(' ')[0]}</td>
        <td>ห้อง ${r.room}</td>
        <td style="font-size:10px;color:#4A4F7A;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${[...r.equip, ...r.food].join(' · ')}</td>
        <td style="font-size:10px;color:#8890B5;white-space:nowrap">${r.submitted}</td>
        <td><span style="font-size:10px;font-weight:500;padding:3px 10px;border-radius:20px;white-space:nowrap;background:${STATUS_BG[r.st]};color:${STATUS_COLOR[r.st]}">${STATUS_LABEL[r.st]}</span></td>
        <td><div style="display:flex;gap:4px;align-items:center">
          <button class="btn btn-o" style="padding:4px 10px;font-size:10px" onclick="App.showFacilityDetail('${r.id}')">ดู</button>
          ${r.isPending() ? `<button class="btn btn-s" style="padding:4px 10px;font-size:10px" onclick="App.acceptFacilityRequest('${r.id}')">รับคำขอ</button>` : ''}
          ${r.isAccepted() ? `<button class="btn btn-p" style="padding:4px 10px;font-size:10px" onclick="App.completeFacilityRequest('${r.id}')">เสร็จสิ้น</button>` : ''}
        </div></td>
      </tr>`).join('')}
      </tbody></table></div>`;
  }

  function showDetail(id) {
    const r = facilityRequestRepository.getAll().find((x) => x.id === id);
    if (!r) return;
    openModal(
      `รายละเอียดคำขอ ${r.id}`,
      `<div style="background:linear-gradient(135deg,#2A2262,#38419D);border-radius:10px;padding:14px 16px;color:white;margin-bottom:14px">
        <div style="font-size:15px;font-weight:600">${r.who}</div>
        <div style="font-size:11px;opacity:.8;margin-top:3px">ห้อง ${r.room} · ${r.date} · ${r.time}</div>
      </div>
      ${r.equip.length ? `
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:600;color:#4A4F7A;margin-bottom:6px">อุปกรณ์ที่ขอ</div>
        ${r.equip.map((e) => `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:.5px solid #D8DBF0">
          <div style="width:6px;height:6px;border-radius:50%;background:#38419D;flex-shrink:0"></div>
          <span style="font-size:12px;color:#1A1D3A">${e}</span>
        </div>`).join('')}
      </div>` : ''}
      ${r.food.length ? `
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:600;color:#4A4F7A;margin-bottom:6px">อาหาร/เครื่องดื่ม</div>
        ${r.food.map((f) => `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:.5px solid #D8DBF0">
          <div style="width:6px;height:6px;border-radius:50%;background:#10b981;flex-shrink:0"></div>
          <span style="font-size:12px;color:#1A1D3A">${f}</span>
        </div>`).join('')}
      </div>` : ''}
      ${r.note ? `<div style="background:#F4F5FA;border-radius:8px;padding:10px 12px;font-size:11px;color:#4A4F7A"><strong>หมายเหตุ:</strong> ${r.note}</div>` : ''}
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:#8890B5">ส่งเมื่อ: ${r.submitted}</span>
        <span style="background:${STATUS_BG[r.st]};color:${STATUS_COLOR[r.st]};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500">${STATUS_LABEL[r.st]}</span>
      </div>`,
      `<button class="btn btn-o" onclick="App.closeModal()">ปิด</button>
       ${r.isPending() ? `<button class="btn btn-s" onclick="App.acceptFacilityRequest('${r.id}')">รับคำขอ</button>` : ''}
       ${r.isAccepted() ? `<button class="btn btn-s" onclick="App.completeFacilityRequest('${r.id}')">เสร็จสิ้น</button>` : ''}`,
    );
  }

  function accept(id) {
    updateFacilityRequestStatusUseCase.accept(id);
    refresh('รับคำขอแล้ว', 's');
  }

  function complete(id) {
    updateFacilityRequestStatusUseCase.markDone(id);
    refresh('จัดการเรียบร้อย', 's');
  }

  function refresh(message, type) {
    closeModal();
    showToast(message, type);
    router.navigate('facilityqueue');
  }

  return { render, showDetail, accept, complete };
}
