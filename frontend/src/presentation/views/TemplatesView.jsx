import { useState } from 'react';
import { IC } from '../../shared/icons.js';
import { BOOKING_PURPOSES, TEACHER_ONLY_PURPOSES, OTHER_PURPOSE, BOOKING_EQUIPMENT_OPTIONS, getRoomColor } from '../../shared/constants.js';
import { BookingPermissionPolicy } from '../../domain/policies/BookingPermissionPolicy.js';
import { container } from '../../shared/di/container.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { useFacilityRequestFields } from '../hooks/useFacilityRequestFields.js';
import { FacilityRequestFields, QtyInput } from '../components/FacilityRequestFields.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const EQUIPMENT_NAMES = Object.fromEntries(BOOKING_EQUIPMENT_OPTIONS.map((e) => [e.k, e.nm]));

const { roomRepository, templateRepository, equipmentRepository } = container.repositories;

// Merges live equipment-pool counts (see ManageEquipmentView) onto
// BOOKING_EQUIPMENT_OPTIONS' static name/icon, same as BookingView —
// falls back to the static avail/max for any key not yet loaded.
function liveEquipmentOptions() {
  return BOOKING_EQUIPMENT_OPTIONS.map((e) => {
    const live = equipmentRepository.getAll().find((l) => l.key === e.k);
    return live ? { ...e, avail: `${live.avail} ${live.unit}`, max: live.avail } : e;
  });
}
const {
  saveTemplateUseCase, applyTemplateUseCase, updateTemplateUseCase, duplicateTemplateUseCase, deleteTemplateUseCase,
} = container.useCases;

function TemplateCard({ template, onBook, onRename, onEdit, onDuplicate, onDelete }) {
  const room = roomRepository.findById(template.room);
  const rc = getRoomColor(template.room);
  const eqBadges = Object.entries(template.equipment || {}).filter(([, qty]) => qty > 0).map(([key, qty]) => `${EQUIPMENT_NAMES[key] || key} ${qty}`);
  const badges = [...eqBadges, ...(template.food || [])];

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 1px 3px rgba(42,34,98,.07),0 4px 16px rgba(42,34,98,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: rc.bg, color: rc.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: IC.bookmark }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1A1D3A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{template.name}</div>
          <div style={{ fontSize: '12.5px', color: '#8890B5', marginTop: '3px' }}>{room ? room.name : `ห้อง ${template.room}`} · {template.purpose} · {template.participants || 10} คน</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px', minHeight: badges.length ? 0 : '0' }}>
        {badges.map((b, i) => <span key={i} style={{ fontSize: '11px', background: '#F4F5FA', color: '#4A4F7A', padding: '4px 11px', borderRadius: '20px', border: '.5px solid #E8EAF0' }}>{b}</span>)}
      </div>
      <button onClick={onBook} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#2A2262,#38419D)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun,sans-serif', marginBottom: '10px' }}>จองจากเทมเพลต</button>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={onRename} style={{ flex: 1, minWidth: '90px', padding: '9px 12px', background: '#F4F5FA', color: '#4A4F7A', border: '.5px solid #D8DBF0', borderRadius: '9px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif' }}>แก้ไขชื่อ</button>
        <button onClick={onEdit} style={{ flex: 1, minWidth: '90px', padding: '9px 12px', background: '#F4F5FA', color: '#4A4F7A', border: '.5px solid #D8DBF0', borderRadius: '9px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif' }}>แก้ไขข้อมูล</button>
        <button onClick={onDuplicate} style={{ flex: 1, minWidth: '90px', padding: '9px 12px', background: '#F4F5FA', color: '#4A4F7A', border: '.5px solid #D8DBF0', borderRadius: '9px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif' }}>ทำสำเนา</button>
        <button onClick={onDelete} style={{ padding: '9px 16px', background: '#fee2e2', color: '#991b1b', border: '.5px solid #fca5a5', borderRadius: '9px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif' }}>ลบ</button>
      </div>
    </div>
  );
}

/** Self-contained edit form mounted inside the modal — owns its own
 * equipment/food/text state so typing and stepper clicks re-render without
 * needing TemplatesView itself to re-render the (otherwise frozen) modal
 * snapshot. Renders its own action row instead of using the modal's footer
 * slot, since Save needs to read this component's own state. */
function EditTemplateForm({ template, canRequestFacilities, onSave, onCancel }) {
  const [name, setName] = useState(template.name);
  const [room, setRoom] = useState(template.room);
  const [purpose, setPurpose] = useState(template.purpose);
  const [participants, setParticipants] = useState(template.participants || 10);
  const [note, setNote] = useState(template.note || '');
  const facility = useFacilityRequestFields(liveEquipmentOptions(), template.equipment || {}, template.food ? [...template.food] : [], template.facilityNote || '');
  const purposes = [...BOOKING_PURPOSES, ...(canRequestFacilities ? TEACHER_ONLY_PURPOSES : []), OTHER_PURPOSE];

  function handleSave() {
    if (!name.trim() || !room || !purpose) { onSave.onError('กรุณากรอกข้อมูลให้ครบ'); return; }
    const changes = {
      name: name.trim(), room, purpose, participants: Number(participants) || 10, note,
      equipment: { ...facility.equipment }, food: [...facility.food],
    };
    if (canRequestFacilities) changes.facilityNote = facility.facilityNote;
    onSave.onSubmit(changes);
  }

  return (
    <>
      <div className="form-group"><label className="form-label">ชื่อเทมเพลต *</label><input className="form-control" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="form-group">
        <label className="form-label">ห้อง *</label>
        <select className="form-control" value={room} onChange={(e) => setRoom(e.target.value)}>
          {roomRepository.getAll().map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label className="form-label">วัตถุประสงค์ *</label>
          <select className="form-control" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            {purposes.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">จำนวนผู้เข้าร่วม</label>
          <QtyInput className="form-control" value={participants} min={1} max={20} onCommit={setParticipants} />
        </div>
      </div>
      <div className="form-group"><label className="form-label">รายละเอียดเพิ่มเติม</label><textarea className="form-control" rows="2" value={note} onChange={(e) => setNote(e.target.value)} /></div>

      {canRequestFacilities && (
        <>
          <div style={{ borderTop: '0.5px solid #D8DBF0', margin: '12px 0 10px' }} />
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>ขอสิ่งอำนวยความสะดวกเพิ่มเติม</div>
          <FacilityRequestFields
            variant="compact"
            equipmentOptions={liveEquipmentOptions()}
            equipment={facility.equipment}
            onEquipmentDelta={facility.setEquipmentQty}
            onEquipmentSet={facility.setEquipmentValue}
            food={facility.food}
            onAddFood={facility.addFood}
            onRemoveFood={facility.removeFood}
            facilityNote={facility.facilityNote}
            onFacilityNoteChange={facility.setFacilityNote}
          />
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        <button className="btn btn-o" onClick={onCancel}>ยกเลิก</button>
        <button className="btn btn-p" onClick={handleSave}>บันทึก</button>
      </div>
    </>
  );
}

export function TemplatesView() {
  const { role, canApprove } = useAuth();
  const { navigate, setTemplateToApply } = useAppShell();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { loading, error, refetch } = useRepository(() => Promise.all([templateRepository.refresh(), roomRepository.refresh(), equipmentRepository.refresh()]));

  const canRequestFacilities = BookingPermissionPolicy.canRequestFacilities(role, canApprove);

  async function bookFromTemplate(templateId) {
    const result = await applyTemplateUseCase.execute({ templateId });
    if (!result.success) { showToast('ไม่พบเทมเพลต', 'e'); return; }
    setTemplateToApply(result.draft);
    navigate('book');
  }

  async function duplicateTemplate(templateId) {
    await duplicateTemplateUseCase.execute({ templateId });
    showToast('ทำสำเนาเทมเพลตแล้ว', 's');
    refetch();
  }

  async function deleteTemplate(templateId) {
    if (!confirm('ต้องการลบเทมเพลตนี้หรือไม่?')) return;
    await deleteTemplateUseCase.execute({ templateId });
    showToast('ลบเทมเพลตแล้ว', 'i');
    refetch();
  }

  function showRenameTemplate(templateId) {
    const template = templateRepository.findById(templateId);
    if (!template) return;
    let nameValue = template.name;
    openModal(
      'แก้ไขชื่อเทมเพลต',
      <div className="form-group"><label className="form-label">ชื่อเทมเพลต *</label><input className="form-control" defaultValue={template.name} onChange={(e) => { nameValue = e.target.value; }} /></div>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ยกเลิก</button>
        <button
          className="btn btn-p"
          onClick={async () => {
            const name = nameValue.trim();
            if (!name) { showToast('กรุณาตั้งชื่อเทมเพลต', 'e'); return; }
            const result = await updateTemplateUseCase.rename({ templateId, name });
            if (!result.success) return;
            closeModal();
            showToast('เปลี่ยนชื่อเทมเพลตแล้ว', 's');
            refetch();
          }}
        >
          บันทึก
        </button>
      </>,
    );
  }

  function showEditTemplate(templateId) {
    const template = templateRepository.findById(templateId);
    if (!template) return;
    openModal(
      'แก้ไขข้อมูลเทมเพลต',
      <EditTemplateForm
        template={template}
        canRequestFacilities={canRequestFacilities}
        onCancel={closeModal}
        onSave={{
          onError: (msg) => showToast(msg, 'e'),
          onSubmit: async (changes) => {
            const result = await updateTemplateUseCase.execute({ templateId, changes });
            if (!result.success) { showToast('กรุณากรอกข้อมูลให้ครบ', 'e'); return; }
            closeModal();
            showToast('บันทึกเทมเพลตเรียบร้อย', 's');
            refetch();
          },
        }}
      />,
      <></>,
    );
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const list = templateRepository.getAll();

  return (
    <>
      <div className="sec-hdr"><span className="sec-ttl">เทมเพลตการจองของฉัน ({list.length})</span></div>
      {list.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: '18px' }}>
          {list.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onBook={() => bookFromTemplate(template.id)}
              onRename={() => showRenameTemplate(template.id)}
              onEdit={() => showEditTemplate(template.id)}
              onDuplicate={() => duplicateTemplate(template.id)}
              onDelete={() => deleteTemplate(template.id)}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#8890B5' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: '#D8DBF0' }} dangerouslySetInnerHTML={{ __html: IC.bookmark }} />
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#4A4F7A', marginBottom: '4px' }}>ยังไม่มีเทมเพลตการจอง</div>
          <div style={{ fontSize: '12px', marginBottom: '14px' }}>จองห้องให้สำเร็จ แล้วกด "บันทึกเป็นรายการโปรด" เพื่อสร้างเทมเพลตแรกของคุณ</div>
          <button className="btn btn-p" onClick={() => navigate('book')}>ไปจองห้อง</button>
        </div>
      )}
    </>
  );
}
