import { useState } from 'react';
import { IC } from '../../shared/icons.js';

function FoodTagInput({ food, onAdd, onRemove }) {
  const [value, setValue] = useState('');

  function submit() {
    if (!value.trim()) return;
    onAdd(value);
    setValue('');
  }

  return (
    <div className="form-group">
      <label className="form-label">อาหาร / เครื่องดื่ม (พิมพ์แล้วกด Enter)</label>
      <div style={{ border: '.5px solid #C2C7E0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          <input
            type="text"
            placeholder="เช่น กาแฟร้อน 5 แก้ว..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            style={{ flex: 1, border: 'none', padding: '9px 12px', fontSize: '12px', fontFamily: 'Sarabun,sans-serif', color: '#1A1D3A', outline: 'none', background: '#fff' }}
          />
          <button onClick={submit} style={{ padding: '0 14px', background: '#38419D', color: 'white', border: 'none', fontSize: '11px', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif', fontWeight: 600 }}>+ เพิ่ม</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', padding: '8px 10px', background: '#F4F5FA', minHeight: '36px' }}>
          {food.length
            ? food.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '.5px solid #C2C7E0', borderRadius: '20px', padding: '3px 9px', fontSize: '11px', color: '#1A1D3A' }}>
                <span>{item}</span>
                <span onClick={() => onRemove(i)} style={{ color: '#8890B5', cursor: 'pointer', fontSize: '13px' }}>×</span>
              </div>
            ))
            : <span style={{ fontSize: '11px', color: '#8890B5', alignSelf: 'center' }}>ยังไม่มีรายการ</span>}
        </div>
      </div>
    </div>
  );
}

/** The equipment-stepper + food-tag-input panel, deduplicated out of
 * BookingView/TemplatesView/HistoryView. `variant="detailed"` is Booking's
 * icon+availability-count row style; `variant="compact"` is the 2-column
 * grid Templates/History both used. `facilityNote`/`onFacilityNoteChange`
 * are optional — omit to drop the textarea (History's case). */
export function FacilityRequestFields({
  equipmentOptions, equipment, onEquipmentDelta, food, onAddFood, onRemoveFood,
  facilityNote, onFacilityNoteChange, variant = 'compact', showFood = true,
}) {
  if (variant === 'detailed') {
    return (
      <>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.06em' }}>อุปกรณ์เพิ่มเติม</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
          {equipmentOptions.map((e) => (
            <div key={e.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#F4F5FA', borderRadius: '9px', border: '.5px solid #E8EAF0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '28px', height: '28px', background: '#EEF0FF', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38419D', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: IC[e.ic] || '' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#1A1D3A' }}>{e.nm}</div>
                  <div style={{ fontSize: '10px', color: '#8890B5' }}>คงเหลือ {e.avail}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => onEquipmentDelta(e.k, -1)} style={{ width: '26px', height: '26px', background: '#fff', border: '.5px solid #C2C7E0', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38419D' }}>−</button>
                <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '22px', textAlign: 'center', color: '#38419D' }}>{equipment[e.k] || 0}</span>
                <button onClick={() => onEquipmentDelta(e.k, 1)} style={{ width: '26px', height: '26px', background: '#EEF0FF', border: '.5px solid #c7cbf0', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38419D' }}>+</button>
              </div>
            </div>
          ))}
        </div>
        {showFood && <FoodTagInput food={food} onAdd={onAddFood} onRemove={onRemoveFood} />}
        {showFood && onFacilityNoteChange && (
          <div className="form-group" style={{ marginTop: '10px' }}>
            <label className="form-label">หมายเหตุถึงเจ้าหน้าที่</label>
            <textarea className="form-control" rows="3" placeholder="เช่น ต้องการก่อน 08:30 น. / มีผู้แพ้อาหาร..." value={facilityNote || ''} onChange={(e) => onFacilityNoteChange(e.target.value)} />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
        {equipmentOptions.map((e) => (
          <div key={e.k} style={{ background: '#F4F5FA', border: '.5px solid #D8DBF0', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#1A1D3A' }}>{e.nm}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button onClick={() => onEquipmentDelta(e.k, -1)} style={{ width: '22px', height: '22px', border: '.5px solid #C2C7E0', borderRadius: '5px', background: '#fff', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '16px', textAlign: 'center', color: '#38419D' }}>{equipment[e.k] || 0}</span>
              <button onClick={() => onEquipmentDelta(e.k, 1)} style={{ width: '22px', height: '22px', border: '.5px solid #C2C7E0', borderRadius: '5px', background: '#fff', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
        ))}
      </div>
      <FoodTagInput food={food} onAdd={onAddFood} onRemove={onRemoveFood} />
      {onFacilityNoteChange && (
        <div className="form-group">
          <label className="form-label">หมายเหตุถึงเจ้าหน้าที่</label>
          <textarea className="form-control" rows="2" placeholder="เช่น ต้องการก่อน 08:30 น. / มีผู้แพ้อาหาร..." value={facilityNote || ''} onChange={(e) => onFacilityNoteChange(e.target.value)} />
        </div>
      )}
    </>
  );
}
