import { useState } from 'react';
import { container } from '../../shared/di/container.js';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { settingsRepository } = container.repositories;
const { setMaxAdvanceDaysUseCase } = container.useCases;

const INITIAL_TOGGLES = [
  { key: 'email', title: 'การแจ้งเตือนทางอีเมล', desc: 'ส่งอีเมลยืนยันทุกการจอง', on: true },
  { key: 'reminder30', title: 'แจ้งเตือนก่อนถึงเวลา 30 นาที', desc: 'แจ้งผู้จองก่อนถึงเวลาใช้ห้อง', on: false },
  { key: 'noOverlap', title: 'ป้องกันการจองทับซ้อน', desc: 'ตรวจสอบและบล็อกการจองที่ซ้ำกัน', on: true },
];

/** Admin-only system settings. The notification toggles are still
 * cosmetic-only (not backed by real server state) — but "จำนวนวันสูงสุดที่
 * จองล่วงหน้า" is real: it's read from/written to booking_settings and
 * actually enforced by Create/EditBookingUseCase on the backend. */
export function SettingsView() {
  const { showToast } = useToast();
  const [toggles, setToggles] = useState(INITIAL_TOGGLES);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(60);
  const { loading, error } = useRepository(async () => {
    setMaxAdvanceDays(await settingsRepository.getMaxAdvanceDays());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(key) {
    setToggles((cur) => cur.map((t) => (t.key === key ? { ...t, on: !t.on } : t)));
    showToast('บันทึกแล้ว', 's');
  }

  async function saveAll() {
    const result = await setMaxAdvanceDaysUseCase.execute({ days: maxAdvanceDays });
    if (!result.success) { showToast('จำนวนวันต้องอยู่ระหว่าง 1-365', 'e'); return; }
    showToast('บันทึกการตั้งค่า', 's');
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  return (
    <>
      <div className="sec-hdr"><span className="sec-ttl">ตั้งค่าระบบ</span>
        <button className="btn btn-p" onClick={saveAll}>บันทึกทั้งหมด</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
        {toggles.map((s) => (
          <div key={s.key} style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1A1D3A' }}>{s.title}</div>
              <div style={{ fontSize: '11px', color: '#8890B5', marginTop: '2px' }}>{s.desc}</div>
            </div>
            <label style={{ position: 'relative', width: '42px', height: '24px', cursor: 'pointer', flexShrink: 0, marginLeft: '16px' }}>
              <input type="checkbox" checked={s.on} onChange={() => toggle(s.key)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: s.on ? '#38419D' : '#D8DBF0', transition: '.25s' }} />
              <em style={{ position: 'absolute', left: s.on ? '20px' : '2px', top: '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: '.25s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
            </label>
          </div>
        ))}
        <div style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1A1D3A', marginBottom: '10px' }}>จำนวนวันสูงสุดที่จองล่วงหน้า</div>
          <div style={{ maxWidth: '280px' }}>
            <label className="form-label">อาจารย์</label>
            <input
              type="number"
              className="form-control"
              value={maxAdvanceDays}
              min="1"
              max="365"
              onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </>
  );
}
