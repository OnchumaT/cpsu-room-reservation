import { useState } from 'react';
import { container } from '../../shared/di/container.js';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';
import { MONTHS } from '../../shared/constants.js';

const { holidayRepository } = container.repositories;
const { createHolidayUseCase, deleteHolidayUseCase } = container.useCases;

const WEEKDAY_ABBR = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekdayOf(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * Staff-managed calendar of annual/special (ครม.-announced) Thai public
 * holidays — e.g. Songkran, New Year, a royal birthday. Weekends (Sat/Sun)
 * are out-of-hours too, but the backend computes that directly from the
 * date — this list only covers the holidays that vary by year. Feeds
 * OfficeHoursPolicy, which decides whether a booking needs manual
 * (department: head/vice-head) approval (see BookingView's
 * "out-of-hours" hint). Shown one year at a time, grouped by month.
 */
export function ManageHolidaysView() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { loading, error, refetch } = useRepository(() => holidayRepository.refresh());
  const [year, setYear] = useState(() => new Date().getFullYear());

  function showAddModal(defaultDate = '') {
    const form = { date: defaultDate, name: '' };
    openModal(
      'เพิ่มวันหยุดราชการ',
      <>
        <div className="form-group"><label className="form-label">วันที่ *</label><input type="date" className="form-control" defaultValue={defaultDate} onChange={(e) => { form.date = e.target.value; }} /></div>
        <div className="form-group"><label className="form-label">ชื่อวันหยุด *</label><input className="form-control" placeholder="เช่น วันขึ้นปีใหม่" autoFocus onChange={(e) => { form.name = e.target.value; }} /></div>
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
            setYear(Number(form.date.slice(0, 4)));
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
  const today = todayIso();
  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth();

  const yearHolidays = holidays.filter((h) => h.date.startsWith(`${year}-`));
  const byMonth = MONTHS.map(() => []);
  for (const h of yearHolidays) byMonth[Number(h.date.slice(5, 7)) - 1].push(h);

  const upcoming = holidays.find((h) => h.date.slice(0, 10) >= today);
  const remaining = yearHolidays.filter((h) => h.date.slice(0, 10) >= today).length;

  return (
    <>
      <div className="sec-hdr hol-hdr">
        <div className="hol-year">
          <button className="hol-year-btn" onClick={() => setYear(year - 1)} aria-label="ปีก่อนหน้า">‹</button>
          <span className="hol-year-lbl">ปี {year + 543}</span>
          <button className="hol-year-btn" onClick={() => setYear(year + 1)} aria-label="ปีถัดไป">›</button>
          {year !== thisYear && <button className="btn btn-o" onClick={() => setYear(thisYear)}>ปีนี้</button>}
        </div>
        <button className="btn btn-p hol-add" onClick={() => showAddModal()}>+ เพิ่มวันหยุด</button>
      </div>

      <div className="hol-stats">
        <div className="hol-stat">
          <div className="hol-stat-num">{yearHolidays.length}</div>
          <div className="hol-stat-lbl">วันหยุดทั้งปี {year + 543}</div>
        </div>
        <div className="hol-stat">
          <div className="hol-stat-num">{year === thisYear ? remaining : '–'}</div>
          <div className="hol-stat-lbl">วันหยุดที่เหลือในปีนี้</div>
        </div>
        <div className="hol-stat hol-stat-next">
          <div className="hol-stat-lbl">วันหยุดถัดไป</div>
          {upcoming
            ? <div className="hol-stat-next-v">{upcoming.name} <span>· {Number(upcoming.date.slice(8, 10))} {MONTHS[Number(upcoming.date.slice(5, 7)) - 1]} {Number(upcoming.date.slice(0, 4)) + 543}</span></div>
            : <div className="hol-stat-next-v"><span>ยังไม่มีในระบบ</span></div>}
        </div>
      </div>

      <div className="hol-note">
        <strong>หมายเหตุ:</strong> การจองในวันที่อยู่ในรายการนี้ (ไม่ว่าเวลาใด) ถือเป็น "นอกเวลาราชการ" และต้องได้รับอนุมัติจากหัวหน้า/รองหัวหน้าภาควิชา
        ส่วนวันเสาร์-อาทิตย์และการจองนอกช่วง 08:30–16:30 ระบบนับให้อัตโนมัติ ไม่ต้องเพิ่มในรายการนี้
      </div>

      <div className="hol-grid">
        {byMonth.map((list, m) => {
          const isCurrent = year === thisYear && m === thisMonth;
          return (
            <div key={m} className={`hol-month${isCurrent ? ' cur' : ''}${list.length ? '' : ' empty'}`}>
              <div className="hol-month-hdr">
                <span className="hol-month-name">{MONTHS[m]}</span>
                {list.length > 0 && <span className="hol-month-count">{list.length} วัน</span>}
                <button
                  className="hol-month-add"
                  title={`เพิ่มวันหยุดใน${MONTHS[m]}`}
                  onClick={() => showAddModal(`${year}-${String(m + 1).padStart(2, '0')}-01`)}
                >+</button>
              </div>
              {!list.length
                ? <div className="hol-month-none">ไม่มีวันหยุด</div>
                : list.map((h) => {
                  const iso = h.date.slice(0, 10);
                  const wd = weekdayOf(iso);
                  return (
                    <div key={h.id} className={`hol-item${iso < today ? ' past' : ''}`}>
                      <div className={`hol-date${wd === 0 || wd === 6 ? ' wknd' : ''}`}>
                        <span className="hol-date-d">{Number(iso.slice(8, 10))}</span>
                        <span className="hol-date-w">{WEEKDAY_ABBR[wd]}</span>
                      </div>
                      <div className="hol-name">{h.name}</div>
                      <button className="hol-del" title="ลบวันหยุด" onClick={() => remove(h.id, h.name)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                      </button>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </>
  );
}
