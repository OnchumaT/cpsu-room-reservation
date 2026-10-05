import { container } from '../../shared/di/container.js';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';
import { formatDateDMY } from '../../shared/dateFormat.js';

const { holidayRepository } = container.repositories;
const { createHolidayUseCase, deleteHolidayUseCase } = container.useCases;

/**
 * Admin-only calendar of annual/special (ครม.-announced) Thai public
 * holidays — e.g. Songkran, New Year, a royal birthday. Weekends (Sat/Sun)
 * are out-of-hours too, but the backend computes that directly from the
 * date — this list only covers the holidays that vary by year. Feeds
 * OfficeHoursPolicy, which decides whether a booking needs manual
 * (department: head/vice-head) approval (see BookingView's
 * "out-of-hours" hint).
 */
export function ManageHolidaysView() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { loading, error, refetch } = useRepository(() => holidayRepository.refresh());

  function showAddModal() {
    const form = { date: '', name: '' };
    openModal(
      'เพิ่มวันหยุดนักขัตฤกษ์',
      <>
        <div className="form-group"><label className="form-label">วันที่ *</label><input type="date" className="form-control" onChange={(e) => { form.date = e.target.value; }} /></div>
        <div className="form-group"><label className="form-label">ชื่อวันหยุด *</label><input className="form-control" placeholder="เช่น วันขึ้นปีใหม่" onChange={(e) => { form.name = e.target.value; }} /></div>
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ยกเลิก</button>
        <button
          className="btn btn-p"
          onClick={async () => {
            const result = await createHolidayUseCase.execute(form);
            if (!result.success) {
              showToast(result.reason === 'duplicate-date' ? 'มีวันหยุดของวันที่นี้อยู่แล้ว' : 'กรุณากรอกวันที่และชื่อวันหยุด', 'e');
              return;
            }
            closeModal();
            showToast('เพิ่มวันหยุดเรียบร้อย', 's');
            refetch();
          }}
        >
          เพิ่มวันหยุด
        </button>
      </>,
    );
  }

  async function remove(id, name) {
    if (!confirm(`ต้องการลบวันหยุด "${name}" ใช่หรือไม่?`)) return;
    await deleteHolidayUseCase.execute({ holidayId: id });
    showToast('ลบวันหยุดแล้ว', 'i');
    refetch();
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const holidays = holidayRepository.getAll();

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-ttl">จัดการวันหยุดราชการ ({holidays.length} วัน)</span>
        <button className="btn btn-p" onClick={showAddModal}>+ เพิ่มวันหยุด</button>
      </div>
      <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '11px', color: '#38419D' }}>
        การจองในวันที่อยู่ในรายการนี้ (ไม่ว่าเวลาใด) จะถือเป็น "นอกเวลาราชการ" และต้องผ่านการอนุมัติจากหัวหน้า/รองหัวหน้าภาควิชา — เช่นเดียวกับวันเสาร์-อาทิตย์ (ทั้งวัน) และการจองที่เริ่มนอกช่วงเวลาราชการปกติ (08:30–18:00) ในวันทำการ ไม่ต้องเพิ่มวันเสาร์-อาทิตย์ในรายการนี้ ระบบนับให้อัตโนมัติ
      </div>
      {!holidays.length
        ? <div style={{ textAlign: 'center', padding: '40px', color: '#8890B5' }}>ยังไม่มีวันหยุดในระบบ</div>
        : (
          <div style={{ background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '12px', overflow: 'hidden' }}>
            {holidays.map((h) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '.5px solid #E8EAF0' }}>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#1A1D3A' }}>{h.name}</div>
                  <div style={{ fontSize: '11px', color: '#8890B5' }}>{formatDateDMY(h.date)}</div>
                </div>
                <button className="btn btn-d" style={{ fontSize: '12px', padding: '7px 12px' }} onClick={() => remove(h.id, h.name)}>ลบ</button>
              </div>
            ))}
          </div>
        )}
    </>
  );
}
