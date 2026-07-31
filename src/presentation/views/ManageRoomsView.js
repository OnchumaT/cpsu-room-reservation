import { openModal, closeModal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';
import { roomStatusMeta } from '../formatters/statusLabels.js';

const EQUIPMENT_ITEMS = [
  { key: 'projector', label: 'Projector', unit: 'เครื่อง' },
  { key: 'whiteboard', label: 'Whiteboard', unit: 'แผ่น' },
  { key: 'ac', label: 'เครื่องปรับอากาศ', unit: 'เครื่อง' },
  { key: 'mic', label: 'ไมโครโฟน', unit: 'ตัว' },
  { key: 'tv', label: 'จอ TV', unit: 'เครื่อง' },
  { key: 'plug', label: 'ปลั๊กไฟ', unit: 'จุด' },
  { key: 'sound', label: 'ระบบเสียง', unit: 'ชุด' },
];
const DEFAULT_EQUIPMENT = { projector: 1, whiteboard: 1, ac: 2, mic: 1, tv: 1, plug: 6, sound: 1 };

/** Admin-only room CRUD. */
export function createManageRoomsView({
  roomRepository, createRoomUseCase, updateRoomUseCase, toggleRoomStatusUseCase, deleteRoomUseCase, router,
}) {
  function render() {
    const rooms = roomRepository.getAll();
    return `
    <div class="sec-hdr">
      <span class="sec-ttl">จัดการห้อง (${rooms.length} ห้อง)</span>
      <button class="btn btn-p" onclick="App.showAddRoom()">+ เพิ่มห้องใหม่</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      ${rooms.map((r) => {
        const meta = roomStatusMeta(r.status);
        return `<div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;overflow:hidden">
          <div style="height:90px;background:${r.grad};display:flex;align-items:center;justify-content:center;position:relative">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"><rect x="2" y="7" width="20" height="14"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
            <div style="position:absolute;top:8px;left:10px;background:rgba(0,0,0,.35);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px">${r.id}</div>
            <div style="position:absolute;top:8px;right:10px;background:${meta.bg};color:${meta.color};font-size:9px;font-weight:600;padding:2px 8px;border-radius:5px">${meta.label}</div>
          </div>
          <div style="padding:12px">
            <div style="font-size:13px;font-weight:500;color:#1A1D3A;margin-bottom:3px">${r.name}</div>
            <div style="font-size:11px;color:#8890B5;margin-bottom:10px">ชั้น ${r.floor} · ${r.cap} ที่นั่ง</div>
            <div style="display:flex;gap:5px">
              <button class="btn btn-o" style="flex:1;font-size:10px;padding:5px" onclick="App.showEditRoom('${r.id}')">แก้ไข</button>
              <button class="btn" style="flex:1;font-size:10px;padding:5px;background:${r.isAvailable() ? '#FEF3C7' : '#dcfce7'};color:${r.isAvailable() ? '#92400e' : '#166534'};border:none;border-radius:6px;cursor:pointer" onclick="App.toggleRoomStatus('${r.id}')">${r.isAvailable() ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
              <button class="btn btn-d" style="font-size:10px;padding:5px 8px" onclick="App.deleteRoom('${r.id}')">ลบ</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function showAddModal() {
    openModal(
      'เพิ่มห้องใหม่',
      `<div class="form-row">
        <div class="form-group"><label class="form-label">รหัสห้อง *</label><input class="form-control" id="newRoomId" placeholder="เช่น 1642"></div>
        <div class="form-group"><label class="form-label">จำนวนที่นั่ง *</label><input type="number" class="form-control" id="newRoomCap" value="20" min="1" max="100"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">ชั้น</label><input type="number" class="form-control" id="newRoomFloor" value="6" min="1"></div>
        <div class="form-group"><label class="form-label">สถานะ</label>
          <select class="form-control" id="newRoomStatus">
            <option value="available">ว่าง (พร้อมใช้งาน)</option>
            <option value="occupied">ไม่ว่าง</option>
          </select>
        </div>
      </div>`,
      `<button class="btn btn-o" onclick="App.closeModal()">ยกเลิก</button>
       <button class="btn btn-p" onclick="App.addRoom()">เพิ่มห้อง</button>`,
    );
  }

  function add() {
    const id = document.getElementById('newRoomId')?.value?.trim();
    const cap = parseInt(document.getElementById('newRoomCap')?.value || '20', 10);
    const floor = parseInt(document.getElementById('newRoomFloor')?.value || '6', 10);
    const status = document.getElementById('newRoomStatus')?.value || 'available';
    const result = createRoomUseCase.execute({ id, cap, floor, status });
    if (!result.success) {
      showToast(result.reason === 'duplicate-id' ? 'รหัสห้องนี้มีอยู่แล้ว' : 'กรุณากรอกรหัสห้อง', 'e');
      return;
    }
    refresh(`เพิ่มห้อง ${id} เรียบร้อย`, 's');
  }

  function showEditModal(id) {
    const room = roomRepository.findById(id);
    if (!room) return;
    const eq = room.equipment || DEFAULT_EQUIPMENT;
    openModal(
      `แก้ไขห้อง ${room.name}`,
      `<div class="form-row">
        <div class="form-group"><label class="form-label">จำนวนที่นั่ง</label><input type="number" class="form-control" id="editCap" value="${room.cap}" min="1"></div>
        <div class="form-group"><label class="form-label">ชั้น</label><input type="number" class="form-control" id="editFloor" value="${room.floor}" min="1"></div>
      </div>
      <div class="form-group"><label class="form-label">สถานะ</label>
        <select class="form-control" id="editStatus">
          <option value="available"${room.status === 'available' ? ' selected' : ''}>ว่าง (พร้อมใช้งาน)</option>
          <option value="occupied"${room.status === 'occupied' ? ' selected' : ''}>ไม่ว่าง</option>
          <option value="pending"${room.status === 'pending' ? ' selected' : ''}>รอดำเนินการ</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">จำนวนอุปกรณ์ในห้อง</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px;background:#F4F5FA;border-radius:8px">
          ${EQUIPMENT_ITEMS.map((e) => `
          <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:8px;padding:7px 10px;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:11px;font-weight:500;color:#1A1D3A">${e.label}</span>
            <div style="display:flex;align-items:center;gap:4px">
              <input type="number" id="eq_${e.key}" value="${eq[e.key] || 0}" min="0" max="50"
                style="width:44px;padding:3px 5px;border:.5px solid #C2C7E0;border-radius:5px;font-size:12px;font-family:Sarabun,sans-serif;text-align:center;color:#1A1D3A;outline:none">
              <span style="font-size:10px;color:#8890B5">${e.unit}</span>
            </div>
          </div>`).join('')}
        </div>
      </div>`,
      `<button class="btn btn-o" onclick="App.closeModal()">ยกเลิก</button>
       <button class="btn btn-p" onclick="App.saveRoom('${id}')">บันทึก</button>`,
    );
  }

  function save(id) {
    const cap = parseInt(document.getElementById('editCap')?.value, 10) || undefined;
    const floor = parseInt(document.getElementById('editFloor')?.value, 10) || undefined;
    const status = document.getElementById('editStatus')?.value;
    const equipment = {};
    EQUIPMENT_ITEMS.forEach((e) => {
      const el = document.getElementById(`eq_${e.key}`);
      if (el) equipment[e.key] = parseInt(el.value, 10) || 0;
    });
    const result = updateRoomUseCase.execute({ roomId: id, cap, floor, status, equipment });
    if (!result.success) return;
    refresh(`แก้ไขห้อง ${result.room.name} เรียบร้อย`, 's');
  }

  function toggleStatus(id) {
    const result = toggleRoomStatusUseCase.execute({ roomId: id });
    if (!result.success) return;
    showToast(`เปลี่ยนสถานะห้อง ${result.room.name} แล้ว`, 'i');
    router.navigate('managerooms');
  }

  function remove(id) {
    if (!confirm(`ต้องการลบห้อง ${id} ใช่หรือไม่?`)) return;
    const result = deleteRoomUseCase.execute({ roomId: id });
    if (!result.success) return;
    showToast(`ลบห้อง ${id} แล้ว`, 'i');
    router.navigate('managerooms');
  }

  function refresh(message, type) {
    closeModal();
    showToast(message, type);
    router.navigate('managerooms');
  }

  return { render, showAddModal, add, showEditModal, save, toggleStatus, remove };
}
