import { useState } from 'react';
import { container } from '../../shared/di/container.js';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { QtyInput } from '../components/FacilityRequestFields.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { equipmentRepository } = container.repositories;
const { updateEquipmentUseCase } = container.useCases;

function EquipmentRow({ e, onSaved }) {
  const { showToast } = useToast();
  const [total, setTotal] = useState(e.total);
  const [damaged, setDamaged] = useState(e.damaged);
  const dirty = total !== e.total || damaged !== e.damaged;
  const avail = Math.max(0, total - damaged);

  async function save() {
    if (damaged > total) { showToast('จำนวนชำรุดต้องไม่เกินจำนวนทั้งหมด', 'e'); return; }
    const result = await updateEquipmentUseCase.execute({ key: e.key, total, damaged });
    if (!result.success) { showToast('บันทึกไม่สำเร็จ', 'e'); return; }
    showToast(`อัปเดต${e.name}แล้ว`, 's');
    onSaved();
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderBottom: '.5px solid #E8EAF0' }}>
      <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#1A1D3A' }}>{e.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <label style={{ fontSize: '11px', color: '#8890B5' }}>ทั้งหมด</label>
        <QtyInput
          value={total} min={0} max={999} onCommit={setTotal}
          style={{ width: '64px', padding: '6px 8px', border: '.5px solid #C2C7E0', borderRadius: '6px', fontSize: '12px', fontFamily: 'Sarabun,sans-serif', textAlign: 'center', outline: 'none' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <label style={{ fontSize: '11px', color: '#8890B5' }}>ชำรุด</label>
        <QtyInput
          value={damaged} min={0} max={total} onCommit={setDamaged}
          style={{ width: '64px', padding: '6px 8px', border: '.5px solid #C2C7E0', borderRadius: '6px', fontSize: '12px', fontFamily: 'Sarabun,sans-serif', textAlign: 'center', outline: 'none' }}
        />
      </div>
      <div style={{ minWidth: '110px', fontSize: '12px', fontWeight: 600, color: avail > 0 ? '#166534' : '#991b1b' }}>
        คงเหลือ {avail} {e.unit}
      </div>
      <button className="btn btn-p" style={{ padding: '7px 14px', fontSize: '12px', opacity: dirty ? 1 : .4, cursor: dirty ? 'pointer' : 'default' }} disabled={!dirty} onClick={save}>บันทึก</button>
    </div>
  );
}

/** Staff-only live equipment pool — replaces what used to be
 * hardcoded "คงเหลือ" numbers in the booking form's facility panel with
 * real counts, and lets Staff mark units damaged/out of service. */
export function ManageEquipmentView() {
  const { loading, error, refetch } = useRepository(() => equipmentRepository.refresh());

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const list = equipmentRepository.getAll();

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-ttl">จัดการอุปกรณ์ ({list.length} รายการ)</span>
      </div>
      <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '11px', color: '#38419D' }}>
        "ทั้งหมด" คือจำนวนที่ภาควิชามีอยู่จริง "ชำรุด" คือจำนวนที่ใช้งานไม่ได้ตอนนี้ (ซ่อม/เสีย/สูญหาย) — "คงเหลือ" (ทั้งหมด − ชำรุด) คือตัวเลขที่อาจารย์จะเห็นตอนขอสิ่งอำนวยความสะดวกในฟอร์มจองห้อง
      </div>
      <div style={{ background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '12px', overflow: 'hidden' }}>
        {list.map((e) => <EquipmentRow key={e.key} e={e} onSaved={refetch} />)}
      </div>
    </>
  );
}
