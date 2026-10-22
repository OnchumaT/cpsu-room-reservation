import { useEffect, useState } from 'react';
import { container } from '../../shared/di/container.js';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { QtyInput } from '../components/FacilityRequestFields.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { equipmentRepository } = container.repositories;
const { updateEquipmentUseCase, createEquipmentUseCase, deleteEquipmentUseCase } = container.useCases;

// Icons the booking form can draw for an item (shared/icons.js).
const ICON_CHOICES = [
  ['box', 'ทั่วไป'], ['mic', 'ไมโครโฟน'], ['proj', 'โปรเจกเตอร์'], ['wb', 'ไวท์บอร์ด'],
  ['plug', 'ปลั๊ก'], ['hdmi', 'สาย'], ['laser', 'เลเซอร์พอยเตอร์'], ['monitor', 'จอ'], ['tool', 'เครื่องมือ'],
];
const INPUT_STYLE = { width: '64px', padding: '6px 8px', border: '.5px solid #C2C7E0', borderRadius: '6px', fontSize: '12px', fontFamily: 'Sarabun,sans-serif', textAlign: 'center', outline: 'none' };

function AddEquipmentForm({ onAdded }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [iconKey, setIconKey] = useState('box');
  const [total, setTotal] = useState(1);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) { showToast('กรุณาระบุชื่ออุปกรณ์', 'e'); return; }
    if (!unit.trim()) { showToast('กรุณาระบุหน่วยนับ', 'e'); return; }
    setSaving(true);
    const result = await createEquipmentUseCase.execute({ name, unit, iconKey, total });
    setSaving(false);
    if (!result.success) {
      showToast(result.reason === 'duplicate-name' ? `มีอุปกรณ์ "${name.trim()}" อยู่แล้ว` : 'เพิ่มอุปกรณ์ไม่สำเร็จ', 'e');
      return;
    }
    showToast(`เพิ่ม${result.equipment.name}แล้ว`, 's');
    setName(''); setUnit(''); setIconKey('box'); setTotal(1);
    onAdded();
  }

  return (
    <div className="eq-row" style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '14px 16px', background: '#F4F5FA', border: '.5px solid #D8DBF0', borderRadius: '12px', marginBottom: '14px' }}>
      <div style={{ flex: 1, minWidth: '160px' }}>
        <label className="form-label">ชื่ออุปกรณ์</label>
        <input className="form-control" placeholder="เช่น โปรเจกเตอร์พกพา" value={name} onChange={(ev) => setName(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') submit(); }} />
      </div>
      <div style={{ width: '90px' }}>
        <label className="form-label">หน่วยนับ</label>
        <input className="form-control" placeholder="เช่น เครื่อง" value={unit} onChange={(ev) => setUnit(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') submit(); }} />
      </div>
      <div style={{ width: '140px' }}>
        <label className="form-label">ไอคอน</label>
        <select className="form-control" value={iconKey} onChange={(ev) => setIconKey(ev.target.value)}>
          {ICON_CHOICES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">ทั้งหมด</label>
        <QtyInput value={total} min={0} max={999} onCommit={setTotal} style={{ ...INPUT_STYLE, padding: '8px' }} />
      </div>
      <button className="btn btn-p" style={{ padding: '8px 16px', fontSize: '12px' }} disabled={saving} onClick={submit}>+ เพิ่มอุปกรณ์</button>
    </div>
  );
}

function EquipmentRow({ e, onSaved }) {
  const { showToast } = useToast();
  const [total, setTotal] = useState(e.total);
  const [damaged, setDamaged] = useState(e.damaged);
  const dirty = total !== e.total || damaged !== e.damaged;
  // A refetch (after save, or after a request is accepted/finished
  // elsewhere) brings new counts — resync the inputs to them.
  useEffect(() => { setTotal(e.total); setDamaged(e.damaged); }, [e.total, e.damaged]);
  const inUse = e.inUse || 0;
  const avail = Math.max(0, total - damaged - inUse);

  async function remove() {
    if (!window.confirm(`ต้องการลบ ${e.name} ใช่หรือไม่? การจองเก่าที่เคยขอไว้จะยังแสดงชื่อเดิม`)) return;
    const result = await deleteEquipmentUseCase.execute({ key: e.key });
    if (!result.success) { showToast(result.reason === 'in-use' ? result.message : 'ลบไม่สำเร็จ', 'e'); return; }
    showToast(`ลบ${e.name}แล้ว`, 's');
    onSaved();
  }

  async function save() {
    if (damaged > total) { showToast('จำนวนชำรุดต้องไม่เกินจำนวนทั้งหมด', 'e'); return; }
    const result = await updateEquipmentUseCase.execute({ key: e.key, total, damaged });
    if (!result.success) { showToast('บันทึกไม่สำเร็จ', 'e'); return; }
    showToast(`อัปเดต${e.name}แล้ว`, 's');
    onSaved();
  }

  return (
    <div className="eq-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderBottom: '.5px solid #E8EAF0' }}>
      <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#1A1D3A' }}>{e.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <label style={{ fontSize: '11px', color: '#8890B5' }}>ทั้งหมด</label>
        <QtyInput
          value={total} min={0} max={999} onCommit={setTotal}
          style={INPUT_STYLE}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <label style={{ fontSize: '11px', color: '#8890B5' }}>ชำรุด</label>
        <QtyInput
          value={damaged} min={0} max={total} onCommit={setDamaged}
          style={INPUT_STYLE}
        />
      </div>
      <div style={{ minWidth: '110px', fontSize: '12px', color: inUse > 0 ? '#38419D' : '#8890B5' }}>
        กำลังใช้งาน {inUse} {e.unit}
      </div>
      <div style={{ minWidth: '110px', fontSize: '12px', fontWeight: 600, color: avail > 0 ? '#166534' : '#991b1b' }}>
        คงเหลือ {avail} {e.unit}
      </div>
      <button className="btn btn-p" style={{ padding: '7px 14px', fontSize: '12px', opacity: dirty ? 1 : .4, cursor: dirty ? 'pointer' : 'default' }} disabled={!dirty} onClick={save}>บันทึก</button>
      <button
        className="btn btn-d" style={{ padding: '7px 14px', fontSize: '12px', opacity: inUse > 0 ? .4 : 1 }}
        title={inUse > 0 ? 'ยังมีการจองที่ใช้อุปกรณ์นี้อยู่ ลบได้เมื่อการจองสิ้นสุด' : undefined}
        onClick={remove}
      >ลบ</button>
    </div>
  );
}

/** Staff-only live equipment pool — the list the booking form's facility
 * panel offers, with real "คงเหลือ" counts. Staff add/remove items here and
 * mark units damaged/out of service. */
export function ManageEquipmentView() {
  const { loading, error, refetch } = useRepository(() => equipmentRepository.refresh());

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const list = equipmentRepository.getActive();

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-ttl">จัดการอุปกรณ์ ({list.length} รายการ)</span>
      </div>
      <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '11px', color: '#38419D' }}>
        "ทั้งหมด" คือจำนวนที่ภาควิชามีอยู่จริง "ชำรุด" คือจำนวนที่ใช้งานไม่ได้ตอนนี้ (ซ่อม/เสีย/สูญหาย) "กำลังใช้งาน" คือจำนวนที่ถูกจองไว้กับการจองที่ยังไม่สิ้นสุด (คืนเข้าคลังอัตโนมัติเมื่อหมดเวลาการจอง หรือการจองถูกยกเลิก) — "คงเหลือ" (ทั้งหมด − ชำรุด − กำลังใช้งาน) คือตัวเลขที่อาจารย์จะเห็นตอนขอสิ่งอำนวยความสะดวกในฟอร์มจองห้อง
      </div>
      <AddEquipmentForm onAdded={refetch} />
      <div style={{ background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '12px', overflow: 'hidden' }}>
        {list.length
          ? list.map((e) => <EquipmentRow key={e.key} e={e} onSaved={refetch} />)
          : <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#8890B5' }}>ยังไม่มีอุปกรณ์</div>}
      </div>
    </>
  );
}
