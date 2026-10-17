import { useState } from 'react';
import { roomStatusMeta } from '../formatters/statusLabels.js';
import { getRoomColor } from '../../shared/constants.js';
import { container } from '../../shared/di/container.js';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

// A room's fixed equipment *inventory* (how many mics/plugs/etc. the room
// physically has) — a different concept from a booking's requested
// equipment, deliberately not forced into FacilityRequestFields/useFacilityRequestFields.
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

const { roomRepository, buildingRepository } = container.repositories;
const { createRoomUseCase, updateRoomUseCase, toggleRoomStatusUseCase, deleteRoomUseCase, createBuildingUseCase } = container.useCases;

// Card hero background — matches the calendar/dashboard room-color legend
// instead of the admin-set `room.grad` (a separate, unrelated field).
function roomGradient(roomId) {
  const rc = getRoomColor(roomId);
  return `linear-gradient(135deg, ${rc.text}, ${rc.bar})`;
}

// Building picker for the add/edit room forms — admin-managed list (see
// Building entity), with a "+ เพิ่มตึกใหม่..." option that creates one on
// the fly instead of making the admin go set up buildings separately
// first. Its own component (not inline JSX) so it can hold the small bit
// of state the room forms otherwise avoid (buildingRepository.getAll() is
// seeded once on mount; "add new" needs to re-render this list locally).
function BuildingField({ form, initialBuildingId }) {
  const [buildings, setBuildings] = useState(buildingRepository.getAll());
  const [value, setValue] = useState(initialBuildingId ? String(initialBuildingId) : '');

  async function handleChange(e) {
    const v = e.target.value;
    if (v === '__new__') {
      const name = window.prompt('ชื่อตึกใหม่ เช่น ตึก 16');
      if (!name || !name.trim()) return;
      const result = await createBuildingUseCase.execute({ name });
      if (!result.success) {
        window.alert(result.reason === 'duplicate-name' ? 'มีตึกนี้อยู่แล้ว' : 'เพิ่มตึกไม่สำเร็จ');
        return;
      }
      setBuildings(buildingRepository.getAll());
      setValue(String(result.building.id));
      form.buildingId = result.building.id;
      return;
    }
    setValue(v);
    form.buildingId = v || null;
  }

  return (
    <div className="form-group">
      <label className="form-label">ตึก/อาคาร</label>
      <select className="form-control" value={value} onChange={handleChange}>
        <option value="">-- ไม่ระบุ --</option>
        {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        <option value="__new__">+ เพิ่มตึกใหม่...</option>
      </select>
    </div>
  );
}

/** Admin/staff room CRUD. */
export function ManageRoomsView() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { loading, error, refetch } = useRepository(() => Promise.all([roomRepository.refresh(), buildingRepository.refresh()]));

  // Seat counts and floors are whole numbers of at least 1, equipment counts at
  // least 0. Blocks typing a sign, decimal point or exponent; a pasted value is
  // still checked on submit.
  const blockNonDigitKeys = (e) => { if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault(); };
  const isValidCap = (value) => /^\d+$/.test(String(value).trim()) && Number(value) >= 1;
  const isValidFloor = isValidCap;
  const isValidCount = (value) => /^\d+$/.test(String(value).trim());

  function showAddModal() {
    const form = { id: '', cap: 20, floor: 6, status: 'available', buildingId: null };
    openModal(
      'เพิ่มห้องใหม่',
      <>
        <div className="form-row">
          <div className="form-group"><label className="form-label">รหัสห้อง *</label><input className="form-control" placeholder="เช่น 1642" onChange={(e) => { form.id = e.target.value; }} /></div>
          <div className="form-group"><label className="form-label">จำนวนที่นั่ง *</label><input type="number" className="form-control" defaultValue={20} min="1" max="100" onKeyDown={blockNonDigitKeys} onChange={(e) => { form.cap = e.target.value; }} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">ชั้น</label><input type="number" className="form-control" defaultValue={6} min="1" onKeyDown={blockNonDigitKeys} onChange={(e) => { form.floor = e.target.value; }} /></div>
          <div className="form-group">
            <label className="form-label">สถานะ</label>
            <select className="form-control" defaultValue="available" onChange={(e) => { form.status = e.target.value; }}>
              <option value="available">ว่าง (พร้อมใช้งาน)</option>
              <option value="occupied">ไม่พร้อมใช้งาน</option>
            </select>
          </div>
        </div>
        <BuildingField form={form} />
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ยกเลิก</button>
        <button
          className="btn btn-p"
          onClick={async () => {
            const id = form.id.trim();
            if (!isValidCap(form.cap)) { showToast('จำนวนที่นั่งต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป', 'e'); return; }
            if (!isValidFloor(form.floor)) { showToast('ชั้นต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป', 'e'); return; }
            const result = await createRoomUseCase.execute({ id, cap: parseInt(form.cap, 10) || 20, floor: parseInt(form.floor, 10) || 6, status: form.status, buildingId: form.buildingId });
            if (!result.success) {
              showToast(result.reason === 'duplicate-id' ? 'รหัสห้องนี้มีอยู่แล้ว' : 'กรุณากรอกรหัสห้อง', 'e');
              return;
            }
            closeModal();
            showToast(`เพิ่มห้อง ${id} เรียบร้อย`, 's');
            refetch();
          }}
        >
          เพิ่มห้อง
        </button>
      </>,
    );
  }

  function showEditModal(id) {
    const room = roomRepository.findById(id);
    if (!room) return;
    const eq = room.equipment || DEFAULT_EQUIPMENT;
    const form = { cap: room.cap, floor: room.floor, status: room.status, equipment: { ...eq }, buildingId: room.building?.id ?? null };
    openModal(
      `แก้ไขห้อง ${room.name}`,
      <>
        <div className="form-row">
          <div className="form-group"><label className="form-label">จำนวนที่นั่ง</label><input type="number" className="form-control" defaultValue={room.cap} min="1" onKeyDown={blockNonDigitKeys} onChange={(e) => { form.cap = e.target.value; }} /></div>
          <div className="form-group"><label className="form-label">ชั้น</label><input type="number" className="form-control" defaultValue={room.floor} min="1" onKeyDown={blockNonDigitKeys} onChange={(e) => { form.floor = e.target.value; }} /></div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">สถานะ</label>
            <select className="form-control" defaultValue={room.status} onChange={(e) => { form.status = e.target.value; }}>
              <option value="available">ว่าง (พร้อมใช้งาน)</option>
              <option value="occupied">ไม่พร้อมใช้งาน</option>
            </select>
          </div>
        </div>
        <BuildingField form={form} initialBuildingId={room.building?.id} />
        <div className="form-group">
          <label className="form-label">จำนวนอุปกรณ์ในห้อง</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '10px', background: '#F4F5FA', borderRadius: '8px' }}>
            {EQUIPMENT_ITEMS.map((e) => (
              <div key={e.key} style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '8px', padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#1A1D3A' }}>{e.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    defaultValue={eq[e.key] || 0}
                    min="0"
                    max="50"
                    onKeyDown={blockNonDigitKeys}
                    onChange={(ev) => { form.equipment[e.key] = ev.target.value === '' ? 0 : ev.target.value; }}
                    style={{ width: '44px', padding: '3px 5px', border: '.5px solid #C2C7E0', borderRadius: '5px', fontSize: '12px', fontFamily: 'Sarabun,sans-serif', textAlign: 'center', color: '#1A1D3A', outline: 'none' }}
                  />
                  <span style={{ fontSize: '10px', color: '#8890B5' }}>{e.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ยกเลิก</button>
        <button
          className="btn btn-p"
          onClick={async () => {
            if (!isValidCap(form.cap)) { showToast('จำนวนที่นั่งต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป', 'e'); return; }
            if (!isValidFloor(form.floor)) { showToast('ชั้นต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป', 'e'); return; }
            if (!Object.values(form.equipment).every(isValidCount)) { showToast('จำนวนอุปกรณ์ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป', 'e'); return; }
            const result = await updateRoomUseCase.execute({
              roomId: id,
              cap: parseInt(form.cap, 10) || undefined,
              floor: parseInt(form.floor, 10) || undefined,
              status: form.status,
              equipment: Object.fromEntries(Object.entries(form.equipment).map(([k, v]) => [k, Number(v)])),
              buildingId: form.buildingId,
            });
            if (!result.success) return;
            closeModal();
            showToast(`แก้ไขห้อง ${result.room.name} เรียบร้อย`, 's');
            refetch();
          }}
        >
          บันทึก
        </button>
      </>,
    );
  }

  async function toggleStatus(id) {
    const result = await toggleRoomStatusUseCase.execute({ roomId: id });
    if (!result.success) return;
    showToast(`เปลี่ยนสถานะห้อง ${result.room.name} แล้ว`, 'i');
    refetch();
  }

  async function remove(id) {
    if (!confirm(`ต้องการลบห้อง ${id} ใช่หรือไม่?`)) return;
    try {
      await deleteRoomUseCase.execute({ roomId: id });
    } catch (err) {
      showToast(err.message || 'ลบห้องไม่สำเร็จ', 'e');
      return;
    }
    showToast(`ลบห้อง ${id} แล้ว`, 'i');
    refetch();
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const rooms = roomRepository.getAll();

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-ttl">จัดการห้อง ({rooms.length} ห้อง)</span>
        <button className="btn btn-p" onClick={showAddModal}>+ เพิ่มห้องใหม่</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '18px' }}>
        {rooms.map((r) => {
          const meta = roomStatusMeta(r.status);
          return (
            <div key={r.id} style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(42,34,98,.06),0 4px 14px rgba(42,34,98,.04)' }}>
              <div style={{ height: '140px', background: roomGradient(r.id), display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.3"><rect x="2" y="7" width="20" height="14" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
                <div style={{ position: 'absolute', top: '12px', left: '14px', background: 'rgba(0,0,0,.35)', color: 'white', fontSize: '13px', fontWeight: 700, padding: '4px 11px', borderRadius: '20px' }}>{r.id}</div>
                <div style={{ position: 'absolute', top: '12px', right: '14px', background: meta.bg, color: meta.color, fontSize: '11px', fontWeight: 600, padding: '4px 11px', borderRadius: '20px' }}>{meta.label}</div>
              </div>
              <div style={{ padding: '18px 20px 20px' }}>
                <div style={{ fontSize: '17px', fontWeight: 600, color: '#1A1D3A', marginBottom: '4px' }}>{r.name}</div>
                <div style={{ fontSize: '12.5px', color: '#8890B5', marginBottom: '16px' }}>{r.building ? `${r.building.name} · ` : ''}ชั้น {r.floor} · {r.cap} ที่นั่ง</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-o" style={{ flex: 1, fontSize: '12.5px', padding: '9px' }} onClick={() => showEditModal(r.id)}>แก้ไข</button>
                  <button style={{ flex: 1, fontSize: '12.5px', padding: '9px', fontWeight: 500, fontFamily: 'Sarabun,sans-serif', background: r.isAvailable() ? '#FEF3C7' : '#dcfce7', color: r.isAvailable() ? '#92400e' : '#166534', border: 'none', borderRadius: '9px', cursor: 'pointer' }} onClick={() => toggleStatus(r.id)}>{r.isAvailable() ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
                  <button className="btn btn-d" style={{ fontSize: '12.5px', padding: '9px 14px' }} onClick={() => remove(r.id)}>ลบ</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
