import { useState } from 'react';
import { container } from '../../shared/di/container.js';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';
import { QtyInput } from '../components/FacilityRequestFields.jsx';

const { settingsRepository } = container.repositories;
const { setMaxAdvanceDaysUseCase, setRetentionDaysUseCase, archiveOldBookingsUseCase, setSystemToggleUseCase } = container.useCases;

const TOGGLE_META = [
  { key: 'email', title: 'การแจ้งเตือนทางอีเมล', desc: 'ส่งอีเมลยืนยันทุกการจอง' },
  { key: 'reminder30', title: 'แจ้งเตือนก่อนถึงเวลา 30 นาที', desc: 'แจ้งผู้จองก่อนถึงเวลาใช้ห้อง' },
  { key: 'noOverlap', title: 'ป้องกันการจองทับซ้อน', desc: 'ตรวจสอบและบล็อกการจองที่ซ้ำกัน' },
];

/** Admin-only system settings — every field here (toggles included) is
 * read from/written to booking_settings and actually enforced on the
 * backend (Create/ApproveRejectBookingUseCase, jobs/reminderJob.js). */
export function SettingsView() {
  const { showToast } = useToast();
  const [toggles, setToggles] = useState(() => TOGGLE_META.map((t) => ({ ...t, on: false })));
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(60);
  const [retentionDays, setRetentionDays] = useState(365);
  const [archiving, setArchiving] = useState(false);
  const { loading, error } = useRepository(async () => {
    setMaxAdvanceDays(await settingsRepository.getMaxAdvanceDays());
    setRetentionDays(await settingsRepository.getRetentionDays());
    const savedToggles = await settingsRepository.getToggles();
    setToggles(TOGGLE_META.map((t) => ({ ...t, on: Boolean(savedToggles[t.key]) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(key) {
    const next = !toggles.find((t) => t.key === key).on;
    setToggles((cur) => cur.map((t) => (t.key === key ? { ...t, on: next } : t)));
    try {
      await setSystemToggleUseCase.execute({ key, value: next });
      showToast('บันทึกแล้ว', 's');
    } catch (err) {
      setToggles((cur) => cur.map((t) => (t.key === key ? { ...t, on: !next } : t)));
      showToast(err.message || 'บันทึกไม่สำเร็จ', 'e');
    }
  }

  async function saveAll() {
    const advanceResult = await setMaxAdvanceDaysUseCase.execute({ days: maxAdvanceDays });
    if (!advanceResult.success) { showToast('จำนวนวันจองล่วงหน้าต้องอยู่ระหว่าง 1-365', 'e'); return; }
    const retentionResult = await setRetentionDaysUseCase.execute({ days: retentionDays });
    if (!retentionResult.success) { showToast('จำนวนวันเก็บข้อมูลต้องอยู่ระหว่าง 30-3650', 'e'); return; }
    showToast('บันทึกการตั้งค่า', 's');
  }

  async function archiveNow() {
    setArchiving(true);
    try {
      const result = await archiveOldBookingsUseCase.execute();
      showToast(`เก็บข้อมูลเก่าเข้าคลังแล้ว ${result.archivedCount} รายการ`, 's');
    } finally {
      setArchiving(false);
    }
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
            <QtyInput className="form-control" value={maxAdvanceDays} min={1} max={365} onCommit={setMaxAdvanceDays} />
          </div>
        </div>
        <div style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1A1D3A', marginBottom: '2px' }}>การเก็บข้อมูล</div>
          <div style={{ fontSize: '11px', color: '#8890B5', marginBottom: '10px' }}>
            ข้อมูลการจองที่เก่ากว่าจำนวนวันนี้จะถูกเก็บเข้าคลัง (ไม่แสดงในแดชบอร์ด/วิเคราะห์ข้อมูล แต่ยังดูได้ในประวัติ)
          </div>
          <div style={{ maxWidth: '280px', marginBottom: '12px' }}>
            <label className="form-label">จำนวนวันที่เก็บข้อมูลไว้</label>
            <QtyInput className="form-control" value={retentionDays} min={30} max={3650} onCommit={setRetentionDays} />
          </div>
          <button className="btn btn-s" onClick={archiveNow} disabled={archiving}>
            {archiving ? 'กำลังเก็บข้อมูล...' : 'เก็บข้อมูลเก่าเข้าคลังตอนนี้'}
          </button>
        </div>
      </div>
    </>
  );
}
