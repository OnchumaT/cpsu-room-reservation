import { useState, useEffect } from 'react';
import { IC } from '../../shared/icons.js';

/** A fully-controlled number input (value={equipment[e.k]}) snaps back to
 * "0" on every keystroke once the field is cleared — the re-render beats
 * the next digit, so deleting the 0 to type a fresh number silently does
 * nothing. Local text state fixes it: the field can sit empty mid-edit,
 * only committing (and re-syncing from outside changes, e.g. the +/-
 * buttons) through the effect/blur below. */
// Digits only — a sign, decimal point or letter can't be typed or pasted in, so
// no field using this can go negative. Over `max` is clamped while typing; under
// `min` only on blur, so a field with min 30 can still be typed as "9" -> "90".
export function QtyInput({ value, max = Infinity, min = 0, onCommit, style, className, disabled }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);

  function handleChange(e) {
    const raw = e.target.value;
    if (raw !== '' && !/^\d+$/.test(raw)) return;
    if (raw === '') { setText(''); return; }
    // Clamp what's shown, not just what's committed — otherwise the field
    // can display "99" while the actual request silently caps at the real
    // stock count, which looks like typing just doesn't work right.
    const clamped = Math.min(max, parseInt(raw, 10));
    setText(String(clamped));
    onCommit(clamped);
  }
  function handleBlur() {
    const n = text === '' ? min : Math.max(min, parseInt(text, 10));
    setText(String(n));
    onCommit(n);
  }

  return (
    <input
      type="text" inputMode="numeric" value={text}
      onChange={handleChange} onBlur={handleBlur}
      style={style} className={className} disabled={disabled}
    />
  );
}

function FoodTagInput({ food, onAdd, onRemove }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);

  function submit() {
    if (!name.trim()) return;
    onAdd(qty > 1 ? `${name.trim()} ×${qty}` : name.trim());
    setName('');
    setQty(1);
  }

  return (
    <div className="form-group">
      <label className="form-label">อาหาร / เครื่องดื่ม</label>
      <div style={{ border: '.5px solid #C2C7E0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="เช่น กาแฟร้อน"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            style={{ flex: 1, border: 'none', padding: '9px 12px', fontSize: '13px', fontFamily: 'Sarabun,sans-serif', color: '#1A1D3A', outline: 'none', background: '#fff' }}
          />
          <span style={{ fontSize: '11px', color: '#8890B5', padding: '0 6px', flexShrink: 0 }}>จำนวน</span>
          <QtyInput
            value={qty} min={1} max={99} onCommit={setQty}
            style={{ width: '40px', padding: '7px 2px', border: 'none', borderLeft: '.5px solid #C2C7E0', fontSize: '13px', fontWeight: 600, textAlign: 'center', color: '#38419D', fontFamily: 'Sarabun,sans-serif', outline: 'none', background: '#fff', flexShrink: 0 }}
          />
          <button onClick={submit} style={{ padding: '0 14px', alignSelf: 'stretch', background: '#38419D', color: 'white', border: 'none', fontSize: '11px', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif', fontWeight: 600, flexShrink: 0 }}>+ เพิ่ม</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px', background: '#F4F5FA', minHeight: '44px' }}>
          {food.length
            ? food.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '8px', padding: '9px 12px' }}>
                <span style={{ fontSize: '13px', color: '#1A1D3A' }}>{item}</span>
                <span onClick={() => onRemove(i)} style={{ color: '#991b1b', cursor: 'pointer', fontSize: '16px', fontWeight: 600, lineHeight: 1, flexShrink: 0 }}>×</span>
              </div>
            ))
            : <span style={{ fontSize: '12px', color: '#8890B5', alignSelf: 'center' }}>ยังไม่มีรายการ</span>}
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
  equipmentOptions, equipment, onEquipmentDelta, onEquipmentSet, food, onAddFood, onRemoveFood,
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
                <QtyInput
                  value={equipment[e.k] || 0} max={e.max || 5} onCommit={(n) => onEquipmentSet(e.k, n)}
                  style={{ width: '38px', padding: '4px 2px', border: '.5px solid #C2C7E0', borderRadius: '6px', fontSize: '13px', fontWeight: 700, textAlign: 'center', color: '#38419D', fontFamily: 'Sarabun,sans-serif', outline: 'none' }}
                />
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
              <QtyInput
                value={equipment[e.k] || 0} max={e.max || 5} onCommit={(n) => onEquipmentSet(e.k, n)}
                style={{ width: '32px', padding: '2px', border: '.5px solid #C2C7E0', borderRadius: '5px', fontSize: '12px', fontWeight: 600, textAlign: 'center', color: '#38419D', fontFamily: 'Sarabun,sans-serif', outline: 'none' }}
              />
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
