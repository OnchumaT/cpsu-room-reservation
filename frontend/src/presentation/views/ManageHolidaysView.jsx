import { useState } from 'react';
import { container } from '../../shared/di/container.js';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';
import { MONTHS } from '../../shared/constants.js';
import { formatDateDMY, THAI_WEEKDAY_ABBR } from '../../shared/dateFormat.js';
import { ThaiDateInput } from '../components/ThaiDateInput.jsx';

const { holidayRepository } = container.repositories;
const { createHolidayUseCase, deleteHolidayUseCase } = container.useCases;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekdayOf(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

const CSV_HEADER = ['วันที่', 'ชื่อวันหยุด'];
const CSV_SAMPLE = [
  ['01/01/2569', 'วันขึ้นปีใหม่'],
  ['13/04/2569', 'วันสงกรานต์'],
  ['10/12/2569', 'วันรัฐธรรมนูญ'],
];

function downloadCsvTemplate() {
  const text = [CSV_HEADER, ...CSV_SAMPLE].map((row) => row.join(',')).join('\n');
  // BOM so Excel opens the Thai text as UTF-8.
  const blob = new Blob([`\uFEFF${text}\n`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ตัวอย่างวันหยุดราชการ.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Excel for Windows in Thai saves "CSV" as Windows-874 (TIS-620), not UTF-8 —
// decoding that as UTF-8 leaves replacement characters, so fall back to it.
async function readCsvFile(file) {
  const bytes = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  return utf8.includes('\uFFFD') ? new TextDecoder('windows-874').decode(bytes) : utf8;
}

const PREVIEW_LIMIT = 50;

// Pick a CSV -> preview (nothing saved yet) -> confirm. Holds its own
// state, so it lives in the modal body as a component.
function HolidayImport({ onClose, onImported }) {
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setError('');
    setBusy(true);
    try {
      const text = await readCsvFile(file);
      setCsv(text);
      setPreview(await holidayRepository.importCsv(text, { dryRun: true }));
    } catch (err) {
      setError(err.message || 'อ่านไฟล์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    try {
      const result = await holidayRepository.importCsv(csv);
      onImported(result);
    } catch (err) {
      setError(err.message || 'นำเข้าไม่สำเร็จ');
      setBusy(false);
    }
  }

  const row = (key, left, right, color) => (
    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '5px 0', borderBottom: '.5px solid #E8EAF0', fontSize: '12px', color }}>
      <span>{left}</span><span style={{ textAlign: 'right' }}>{right}</span>
    </div>
  );

  return (
    <>
      <div style={{ fontSize: '12px', color: '#4A4F7A', lineHeight: 1.6, marginBottom: '10px' }}>
        ไฟล์ CSV มี 2 คอลัมน์: <b>วันที่</b>, <b>ชื่อวันหยุด</b> (แถวหัวตารางมีหรือไม่มีก็ได้)<br />
        วันที่ใช้รูปแบบ วว/ดด/ปปปป (พ.ศ. หรือ ค.ศ.) หรือ ปปปป-ดด-วว · วันที่ที่มีอยู่แล้วจะถูกข้าม
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label className="btn btn-o" style={{ cursor: busy ? 'wait' : 'pointer' }}>
          เลือกไฟล์ CSV
          <input type="file" accept=".csv,text/csv" onChange={handleFile} disabled={busy} style={{ display: 'none' }} />
        </label>
        <button type="button" className="btn btn-o" onClick={downloadCsvTemplate}>ดาวน์โหลดไฟล์ตัวอย่าง</button>
        <span style={{ fontSize: '12px', color: '#4A4F7A' }}>{fileName || 'ยังไม่ได้เลือกไฟล์'}</span>
      </div>

      {error && <div style={{ marginTop: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>{error}</div>}
      {busy && !preview && <div style={{ marginTop: '10px', fontSize: '12px', color: '#8890B5' }}>กำลังตรวจสอบไฟล์...</div>}

      {preview && (
        <div style={{ marginTop: '12px', maxHeight: '320px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className="chip" style={{ background: '#dcfce7', color: '#166534' }}>จะเพิ่ม {preview.toAdd.length} วัน</span>
            {preview.skipped.length > 0 && <span className="chip" style={{ background: '#F4F5FA', color: '#4A4F7A' }}>ข้าม {preview.skipped.length} แถว</span>}
            {preview.errors.length > 0 && <span className="chip" style={{ background: '#fee2e2', color: '#991b1b' }}>ผิดพลาด {preview.errors.length} แถว</span>}
          </div>
          {preview.errors.map((e) => row(`e${e.lineNo}`, `แถว ${e.lineNo}: ${e.raw || '(ว่าง)'}`, e.reason, '#991b1b'))}
          {preview.toAdd.slice(0, PREVIEW_LIMIT).map((h) => row(`a${h.lineNo}`, formatDateDMY(h.date), h.name, '#1A1D3A'))}
          {preview.toAdd.length > PREVIEW_LIMIT && <div style={{ fontSize: '11px', color: '#8890B5', padding: '5px 0' }}>และอีก {preview.toAdd.length - PREVIEW_LIMIT} วัน</div>}
          {preview.skipped.map((h) => row(`s${h.lineNo}`, `${formatDateDMY(h.date)} · ${h.name}`, h.reason, '#8890B5'))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
        <button className="btn btn-o" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-p" disabled={busy || !preview?.toAdd.length} style={busy || !preview?.toAdd.length ? { opacity: .5, cursor: 'not-allowed' } : undefined} onClick={runImport}>
          {preview?.toAdd.length ? `นำเข้า ${preview.toAdd.length} วัน` : 'นำเข้า'}
        </button>
      </div>
    </>
  );
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
        <div className="form-group"><label className="form-label">วันที่ *</label><ThaiDateInput defaultValue={defaultDate} onChange={(e) => { form.date = e.target.value; }} /></div>
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

  function showImportModal() {
    openModal(
      'นำเข้าวันหยุดราชการจาก CSV',
      <HolidayImport
        onClose={closeModal}
        onImported={(result) => {
          closeModal();
          showToast(`นำเข้าวันหยุด ${result.added} วันเรียบร้อย`, 's');
          if (result.toAdd.length) setYear(Number(result.toAdd[0].date.slice(0, 4)));
          refetch();
        }}
      />,
      <></>,
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-o hol-add" onClick={showImportModal}>นำเข้า CSV</button>
          <button className="btn btn-p hol-add" onClick={() => showAddModal()}>+ เพิ่มวันหยุด</button>
        </div>
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
            ? <div className="hol-stat-next-v">{upcoming.name} <span>· {formatDateDMY(upcoming.date.slice(0, 10))}</span></div>
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
                        <span className="hol-date-w">{THAI_WEEKDAY_ABBR[wd]}</span>
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
