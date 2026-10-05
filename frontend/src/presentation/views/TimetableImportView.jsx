import { useEffect, useState } from 'react';
import { container } from '../../shared/di/container.js';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';
import { formatDateDMY } from '../../shared/dateFormat.js';

// DD-MM-YYYY (as displayed) -> YYYY-MM-DD (as sent to the API), or null if not a real date.
function parseDMY(text) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Admin-only. The server checks every row (format, room match, duplicates) and
// refuses an import unless all rows pass; this page shows those results.

const { timetableRepository } = container.repositories;

const ACADEMIC_YEARS = ['2568', '2569'];
const SEMESTERS = ['ภาคต้น', 'ภาคปลาย', 'ภาคฤดูร้อน'];
const BUILDINGS = ['อาคารวิทยาศาสตร์ 1'];
const CSV_HEADER = ['วัน', 'ห้อง', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'รหัสวิชา', 'กลุ่มเรียน'];

const STATUS_COLOR = { ok: '#166534', unmatched: '#92400e', invalid: '#991b1b' };

export function TimetableImportView() {
  const { showToast } = useToast();
  const [year, setYear] = useState(ACADEMIC_YEARS[1]);
  const [semester, setSemester] = useState(SEMESTERS[0]);
  const [building, setBuilding] = useState(BUILDINGS[0]);
  const [startText, setStartText] = useState('');
  const [endText, setEndText] = useState('');
  const [acknowledgedTermChange, setAcknowledgedTermChange] = useState(false);
  const termStartDate = parseDMY(startText) ?? '';
  const termEndDate = parseDMY(endText) ?? '';
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [imports, setImports] = useState([]);
  const { loading, error } = useRepository(async () => setImports(await timetableRepository.history()));

  const termDatesOk = Boolean(termStartDate && termEndDate && termEndDate >= termStartDate);
  const termPayload = { termStartDate, termEndDate };

  // Re-checks the file automatically whenever the file or any input changes, so the
  // import button only enables against a preview of the current inputs.
  useEffect(() => {
    if (!csv || !termDatesOk) return undefined;
    let cancelled = false;
    setBusy(true);
    timetableRepository.preview({ academicYear: year, semester, building, ...termPayload, fileName, csv })
      .then((p) => { if (!cancelled) setPreview(p); })
      .catch((err) => { if (!cancelled) showToast(err.message || 'ตรวจไฟล์ไม่สำเร็จ', 'e'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [csv, year, semester, building, termStartDate, termEndDate, fileName]);

  // Changing the input makes an existing result stale; the preview effect above re-checks it.
  function changed(setter) {
    return (value) => { setter(value); setPreview(null); setResult(null); };
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
    setFileName(file.name);
    setPreview(null);
    setResult(null);
  }

  async function runImport() {
    setBusy(true);
    try {
      const outcome = await timetableRepository.importTimetable({ academicYear: year, semester, building, ...termPayload, fileName, csv });
      setResult(outcome);
      setPreview(null);
      setImports(await timetableRepository.history());
      showToast(`นำเข้าแล้ว: เพิ่ม ${outcome.addedCount} · ปรับปรุง ${outcome.updatedCount}`, 's');
    } catch (err) {
      showToast(err.message || 'นำเข้าไม่สำเร็จ', 'e');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const existingTerm = imports.find((h) => h.academicYear === year && h.semester === semester && h.termStartDate);
  const termChanged = Boolean(existingTerm) && (existingTerm.termStartDate !== termStartDate || existingTerm.termEndDate !== termEndDate);
  const canConfirm = Boolean(preview?.canImport) && termDatesOk && (!termChanged || acknowledgedTermChange) && !busy;

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-ttl">นำเข้าตารางการใช้ห้อง</span>
        <span style={{ fontSize: '11px', color: '#4A4F7A' }}>ผู้ใช้ทุกคนเห็นตารางเดียวกันหลังนำเข้า</span>
      </div>

      <div style={{ background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">ปีการศึกษา</label>
            <select className="form-control" value={year} onChange={(e) => changed(setYear)(e.target.value)}>
              {ACADEMIC_YEARS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ภาคเรียน</label>
            <select className="form-control" value={semester} onChange={(e) => changed(setSemester)(e.target.value)}>
              {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">อาคาร</label>
            <select className="form-control" value={building} onChange={(e) => changed(setBuilding)(e.target.value)}>
              {BUILDINGS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginTop: '4px' }}>
          <div className="form-group">
            <label className="form-label">วันเริ่มภาคเรียน *</label>
            <input type="text" className="form-control" placeholder="DD-MM-YYYY" value={startText} onChange={(e) => changed(setStartText)(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">วันสิ้นสุดภาคเรียน *</label>
            <input type="text" className="form-control" placeholder="DD-MM-YYYY" value={endText} onChange={(e) => changed(setEndText)(e.target.value)} />
          </div>
        </div>
        {termStartDate && termEndDate && !termDatesOk && (
          <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '6px' }}>วันสิ้นสุดภาคเรียนต้องไม่ก่อนวันเริ่มภาคเรียน</div>
        )}

        {startText && !termStartDate && <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '6px' }}>วันเริ่มภาคเรียนต้องเป็น DD-MM-YYYY</div>}
        {endText && !termEndDate && <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '6px' }}>วันสิ้นสุดภาคเรียนต้องเป็น DD-MM-YYYY</div>}
        {termChanged && (
          <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '10px 12px', marginTop: '10px', fontSize: '12px', color: '#92400e' }}>
            มีการนำเข้า {year} {semester} แล้ว ช่วง {formatDateDMY(existingTerm.termStartDate)} ถึง {formatDateDMY(existingTerm.termEndDate)} ถ้าเปลี่ยนช่วงวันที่ แถวที่ตรงกับของเดิมจะผูกกับช่วงใหม่
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
              <input type="checkbox" checked={acknowledgedTermChange} onChange={(e) => setAcknowledgedTermChange(e.target.checked)} />
              ยืนยันว่าต้องการเปลี่ยนช่วงวันที่ของภาคเรียนนี้
            </label>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
          <label className="btn btn-o" style={{ cursor: 'pointer' }}>
            เลือกไฟล์ CSV
            <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          <span style={{ fontSize: '12px', color: '#4A4F7A' }}>{fileName || 'ยังไม่ได้เลือกไฟล์'}</span>
        </div>
        <div style={{ fontSize: '11px', color: '#8890B5', marginTop: '10px' }}>
          คอลัมน์ที่ต้องมี: {CSV_HEADER.join(', ')} (แถวแรกเป็นหัวคอลัมน์ได้)
        </div>
      </div>

      {result && (
        <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', fontSize: '12px', color: '#166534' }}>
          นำเข้าสำเร็จ (ครั้งที่ {result.importId}): ทั้งหมด {result.totalRows} แถว · เพิ่มใหม่ {result.addedCount} · ปรับปรุง {result.updatedCount} · ไม่มีการลบรายการเดิม
        </div>
      )}

      {preview && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span className="chip chip-a">ทั้งหมด {preview.summary.total} แถว</span>
            <span className="chip chip-a">พร้อมนำเข้า {preview.summary.ok}</span>
            <span className="chip chip-p">ยังไม่จับคู่ {preview.summary.unmatched}</span>
            <span className="chip chip-r">ข้อมูลไม่ถูกต้อง {preview.summary.invalid}</span>
            <span style={{ fontSize: '11px', color: '#8890B5', alignSelf: 'center' }}>{year} · {semester} · {building} · {formatDateDMY(termStartDate)} ถึง {formatDateDMY(termEndDate)}</span>
          </div>

          <div className="tbl-wrap" style={{ overflowX: 'auto', marginBottom: '14px' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>แถว</th><th>วัน</th><th>ห้องในไฟล์</th><th>ห้องในระบบ</th><th>เวลา</th><th>รหัสวิชา</th><th>กลุ่มเรียน</th><th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.lineNo} style={r.status === 'ok' ? undefined : { background: '#fef2f2' }}>
                    <td>{r.lineNo}</td>
                    <td>{r.day}</td>
                    <td>{r.roomRaw}</td>
                    <td>{r.roomName ? `${r.roomName} (${r.roomId})` : '—'}</td>
                    <td>{r.start}–{r.end}</td>
                    <td>{r.courseCode}</td>
                    <td>{r.section}</td>
                    <td style={{ color: STATUS_COLOR[r.status], fontWeight: 500 }}>{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            {!preview.canImport && (
              <span style={{ fontSize: '12px', color: '#991b1b' }}>แก้ไขแถวที่มีปัญหาก่อน จึงจะนำเข้าได้</span>
            )}
            <button
              className="btn btn-p"
              onClick={runImport}
              disabled={!canConfirm}
              style={{ opacity: canConfirm ? 1 : 0.4, cursor: canConfirm ? 'pointer' : 'not-allowed' }}
            >
              ยืนยันการนำเข้า
            </button>
          </div>
        </>
      )}

      <div className="sec-hdr"><span className="sec-ttl">ประวัติการนำเข้า</span></div>
      <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>วัน-เวลา</th><th>ผู้นำเข้า</th><th>ไฟล์</th><th>ปี/ภาค</th><th>ช่วงภาคเรียน</th><th>แถว</th><th>เพิ่ม</th><th>ปรับปรุง</th>
            </tr>
          </thead>
          <tbody>
            {imports.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#8890B5' }}>ยังไม่มีประวัติการนำเข้า</td></tr>
            )}
            {imports.map((h) => (
              <tr key={h.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(h.importedAt).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td>{h.importedBy}</td>
                <td>{h.fileName}</td>
                <td>{h.academicYear} · {h.semester}</td>
                <td>{h.termStartDate && h.termEndDate ? `${formatDateDMY(h.termStartDate)} ถึง ${formatDateDMY(h.termEndDate)}` : 'ไม่ระบุ'}</td>
                <td>{h.totalRows}</td>
                <td>{h.addedCount}</td>
                <td>{h.updatedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
