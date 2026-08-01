import { IC } from '../../shared/icons.js';
import { roomStatusMeta } from '../formatters/statusLabels.js';
import { BookingPermissionPolicy } from '../../domain/policies/BookingPermissionPolicy.js';
import { openModal } from '../components/Modal.js';

const EQUIPMENT_DISPLAY_ROWS = [
  ['proj', 'Projector', 'projector', 1, 'เครื่อง'],
  ['wb', 'Whiteboard', 'whiteboard', 1, 'แผ่น'],
  ['gear', 'A/C', 'ac', 2, 'เครื่อง'],
  ['mic', 'ไมโครโฟน', 'mic', 1, 'ตัว'],
  ['plug', 'ปลั๊กไฟ', 'plug', 6, 'จุด'],
  ['monitor', 'จอ TV', 'tv', 1, 'เครื่อง'],
  ['bell', 'ระบบเสียง', 'sound', 1, 'ชุด'],
];

export function createRoomsView({ appState, roomRepository, searchRoomsUseCase }) {
  function roomCard(room) {
    const meta = roomStatusMeta(room.status);
    const canBook = BookingPermissionPolicy.canBookRooms(appState.role);
    return `<div onclick="App.showRoomDetail('${room.id}')" style="background:#fff;border-radius:18px;overflow:hidden;cursor:pointer;box-shadow:0 1px 3px rgba(42,34,98,.07),0 4px 16px rgba(42,34,98,.05);transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 4px 12px rgba(42,34,98,.12),0 12px 32px rgba(42,34,98,.1)'" onmouseout="this.style.transform='';this.style.boxShadow='0 1px 3px rgba(42,34,98,.07),0 4px 16px rgba(42,34,98,.05)'">
      <div style="height:140px;background:${room.grad};position:relative;display:flex;align-items:center;justify-content:center">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1.2"><rect x="2" y="7" width="20" height="14"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
        <div style="position:absolute;top:12px;left:14px;background:rgba(0,0,0,.3);backdrop-filter:blur(4px);color:white;font-size:13px;font-weight:700;padding:4px 11px;border-radius:20px;letter-spacing:.04em">${room.id}</div>
        <div style="position:absolute;top:12px;right:14px;background:${meta.bg};color:${meta.color};font-size:11px;font-weight:600;padding:4px 11px;border-radius:20px;display:flex;align-items:center;gap:5px">
          <span style="width:7px;height:7px;border-radius:50%;background:${meta.dot};display:inline-block"></span>${meta.label}
        </div>
        <div style="position:absolute;bottom:12px;right:14px;background:rgba(0,0,0,.25);color:rgba(255,255,255,.85);font-size:11px;padding:3px 10px;border-radius:20px">ชั้น ${room.floor}</div>
      </div>
      <div style="padding:18px 20px 20px">
        <div style="font-size:17px;font-weight:600;color:#1A1D3A;margin-bottom:6px">${room.name}</div>
        <div style="font-size:12px;color:#8890B5;margin-bottom:14px;display:flex;align-items:center;gap:14px">
          <span style="display:flex;align-items:center;gap:5px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            ${room.cap} ที่นั่ง
          </span>
          <span style="display:flex;align-items:center;gap:5px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
            อาคาร 1 ชั้น ${room.floor}
          </span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
          ${['Projector', 'Whiteboard', 'A/C', 'Mic'].map((eq) => `<span style="font-size:11px;background:#F4F5FA;color:#4A4F7A;padding:4px 10px;border-radius:20px;border:.5px solid #E8EAF0">${eq}</span>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="event.stopPropagation();App.showRoomDetail('${room.id}')" style="flex:1;padding:10px;background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:9px;font-size:12px;font-weight:500;cursor:pointer;font-family:Sarabun,sans-serif;transition:all .12s" onmouseover="this.style.borderColor='#38419D';this.style.color='#38419D'" onmouseout="this.style.borderColor='#D8DBF0';this.style.color='#4A4F7A'">รายละเอียด</button>
          ${canBook && room.isBookable()
            ? `<button onclick="event.stopPropagation();App.navigate('book')" style="flex:1;padding:10px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;transition:opacity .12s" onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">จองห้องนี้</button>`
            : `<button disabled style="flex:1;padding:10px;background:#F4F5FA;color:#C2C7E0;border:.5px solid #E8EAF0;border-radius:9px;font-size:12px;font-weight:500;cursor:not-allowed;font-family:Sarabun,sans-serif">${room.isOccupied() ? 'ไม่ว่าง' : 'จองห้อง'}</button>`}
        </div>
      </div>
    </div>`;
  }

  function render() {
    const { rooms } = searchRoomsUseCase.execute();
    const avail = rooms.filter((r) => r.status === 'available').length;
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    const pending = rooms.filter((r) => r.status === 'pending').length;

    return `
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:18px;flex-wrap:wrap">
      <div style="flex:1;min-width:220px;display:flex;align-items:center;gap:10px;background:#fff;border:.5px solid #D8DBF0;border-radius:11px;padding:12px 16px;box-shadow:0 1px 4px rgba(42,34,98,.06)">
        <span style="color:#8890B5;flex-shrink:0">${IC.search}</span>
        <input placeholder="ค้นหาห้อง รหัส หรืออุปกรณ์..." oninput="App.filterRooms(this.value)"
          style="border:none;background:none;font-size:14px;font-family:Sarabun,sans-serif;color:#1A1D3A;outline:none;width:100%">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="fchip on" onclick="App.filterRoomsByStatus('all',this)">ทั้งหมด (${rooms.length})</button>
        <button class="fchip" onclick="App.filterRoomsByStatus('available',this)">
          <span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;margin-right:5px"></span>ว่าง (${avail})
        </button>
        <button class="fchip" onclick="App.filterRoomsByStatus('occupied',this)">
          <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;display:inline-block;margin-right:5px"></span>ไม่ว่าง (${occupied})
        </button>
        <button class="fchip" onclick="App.filterRoomsByStatus('pending',this)">
          <span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block;margin-right:5px"></span>รอดำเนินการ (${pending})
        </button>
      </div>
    </div>
    <div id="roomsGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px">
      ${rooms.map(roomCard).join('')}
    </div>`;
  }

  function filterByQuery(query) {
    const grid = document.getElementById('roomsGrid');
    if (!grid) return;
    const { rooms } = searchRoomsUseCase.execute({ query });
    grid.innerHTML = rooms.length ? rooms.map(roomCard).join('') : `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#8890B5;font-size:13px">ไม่พบห้องที่ค้นหา</div>`;
  }

  function filterByStatus(status, buttonEl) {
    document.querySelectorAll('.fchip').forEach((b) => b.classList.remove('on'));
    buttonEl.classList.add('on');
    const grid = document.getElementById('roomsGrid');
    if (!grid) return;
    const { rooms } = searchRoomsUseCase.execute({ status });
    grid.innerHTML = rooms.map(roomCard).join('');
  }

  function showRoomDetail(id) {
    const room = roomRepository.findById(id);
    if (!room) return;
    const canBook = BookingPermissionPolicy.canBookRooms(appState.role);
    const eq = room.getEquipment();
    openModal(
      `รายละเอียด ${room.name}`,
      `<div style="height:80px;background:${room.grad};border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;position:relative">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.5"><rect x="2" y="7" width="20" height="14"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
        <div style="position:absolute;bottom:8px;right:10px;background:rgba(0,0,0,.35);color:white;font-size:10px;padding:2px 8px;border-radius:5px">${roomStatusMeta(room.status).label}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px"><span class="chip chip-a">${room.cap} ที่นั่ง</span><span class="chip chip-a">ชั้น ${room.floor}</span></div>
      <div style="font-size:11px;font-weight:500;color:#4A4F7A;margin-bottom:8px">อุปกรณ์ในห้อง</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
        ${EQUIPMENT_DISPLAY_ROWS.map(([icKey, label, eqKey, fallback, unit]) => {
          const qty = eqKey === 'plug' ? (eq.plug || 6) : (eq[eqKey] || fallback);
          return `<div style="background:#F4F5FA;border:.5px solid #D8DBF0;border-radius:8px;padding:8px 6px;text-align:center">
            <div style="display:flex;justify-content:center;color:#38419D;margin-bottom:4px">${IC[icKey] || ''}</div>
            <div style="font-size:10px;font-weight:500;color:#1A1D3A;margin-bottom:2px">${label}</div>
            <div style="font-size:11px;font-weight:600;color:#38419D">${qty} ${unit}</div>
          </div>`;
        }).join('')}
        <div style="background:#F4F5FA;border:.5px solid #D8DBF0;border-radius:8px;padding:8px 6px;text-align:center">
          <div style="display:flex;justify-content:center;color:#38419D;margin-bottom:4px">${IC.user}</div>
          <div style="font-size:10px;font-weight:500;color:#1A1D3A;margin-bottom:2px">โต๊ะ-เก้าอี้</div>
          <div style="font-size:11px;font-weight:600;color:#38419D">${room.cap} ชุด</div>
        </div>
      </div>`,
      `<button class="btn btn-o" onclick="App.closeModal()">ปิด</button>${canBook ? `<button class="btn btn-p" onclick="App.closeModal();App.navigate('book')">จองห้องนี้</button>` : ''}`,
    );
  }

  return { render, filterByQuery, filterByStatus, showRoomDetail };
}
