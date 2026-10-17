import { useEffect, useState } from 'react';
import { container } from '../../shared/di/container.js';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';
import { formatDateDMY, formatDateTimeDMY } from '../../shared/dateFormat.js';
import { ThaiDateInput } from '../components/ThaiDateInput.jsx';

// Admin-only. The server checks every row (format, room match, duplicates) and
// refuses an import unless all rows pass; this page shows those results.

const { timetableRepository, buildingRepository, roomRepository } = container.repositories;

// Computed from today's date, not hardcoded — otherwise this silently runs
// out of years (it did: '2568','2569' stopped covering reality once 2570
// arrived) and nobody can import anything for the new year until a code
// change ships. Thai Buddhist year = Gregorian year + 543; one year back
// covers a late import for the term just ending, two years ahead covers
// early planning for terms not yet started.
const CURRENT_BE_YEAR = new Date().getFullYear() + 543;
const ACADEMIC_YEARS = [CURRENT_BE_YEAR - 1, CURRENT_BE_YEAR, CURRENT_BE_YEAR + 1, CURRENT_BE_YEAR + 2].map(String);
const SEMESTERS = ['ภาคต้น', 'ภาคปลาย', 'ภาคฤดูร้อน'];
const CSV_HEADER = ['วัน', 'ห้อง', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'รหัสวิชา', 'กลุ่มเรียน'];

const STATUS_COLOR = { ok: '#166534', unmatched: '#92400e', invalid: '#991b1b' };

export function TimetableImportView() {
  const { showToast } = useToast();
  const [year, setYear] = useState(ACADEMIC_YEARS[1]);
  const [semester, setSemester] = useState(SEMESTERS[0]);
  // '' until buildingRepository loads below, then set to the first real
  // building — was hardcoded to a single "อาคารวิทยาศาสตร์ 1" string before,
  // ignoring every other building admins have since added.
  const [building, setBuilding] = useState('');
  // Native date inputs produce YYYY-MM-DD directly — no free-text DD-MM-YYYY
  // typing/parsing needed, and no malformed-date state is reachable.
  const [termStartDate, setTermStartDate] = useState('');
  const [termEndDate, setTermEndDate] = useState('');
  const [clearExisting, setClearExisting] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [imports, setImports] = useState([]);
  const { loading, error } = useRepository(async () => {
    const [, buildings] = await Promise.all([
      timetableRepository.history().then(setImports),
      buildingRepository.refresh(),
      roomRepository.refresh(),
    ]);
    setBuilding((cur) => cur || buildings[0]?.name || '');
  });
  const buildings = buildingRepository.getAll();

  // Example rows drawn from the ACTUAL rooms in whichever building is
  // selected — not a generic placeholder — so what the admin sees (and can
  // download) is guaranteed to pass validation for their real setup, and
  // never mixes rooms from a different building into one import file (the
  // exact mistake the first hand-written sample made).
  const SAMPLE_DAYS = ['จันทร์', 'อังคาร', 'พุธ'];
  const SAMPLE_TIMES = [['08:30', '10:30'], ['13:00', '15:00'], ['09:00', '11:00']];
  const roomsInBuilding = roomRepository.getAll().filter((r) => r.building?.name === building);
  const exampleRows = roomsInBuilding.slice(0, 3).map((r, i) => ({
    day: SAMPLE_DAYS[i], room: r.id, start: SAMPLE_TIMES[i][0], end: SAMPLE_TIMES[i][1],
    courseCode: `CS${101 + i * 10}`, section: '1',
  }));
  const exampleCsv = [CSV_HEADER.join(','), ...exampleRows.map((r) => [r.day, r.room, r.start, r.end, r.courseCode, r.section].join(','))].join('\n');

  function downloadExample() {
    const blob = new Blob([`﻿${exampleCsv}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ตัวอย่างตารางการใช้ห้อง-${building || 'sample'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
    return (value) => { setter(value); setPreview(null); setResult(null); setClearExisting(false); };
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
    if (clearExisting && !confirm(`ต้องการลบตารางเดิมทั้งหมดของ ${year} ${semester} · ${building} ก่อนนำเข้าไฟล์นี้ใช่หรือไม่? การลบนี้ย้อนกลับไม่ได้`)) return;
    if (termChanged && !confirm(`${year} ${semester} มีการนำเข้าไว้แล้วช่วง ${formatDateDMY(existingTerm.termStartDate)} ถึง ${formatDateDMY(existingTerm.termEndDate)} เปลี่ยนเป็นช่วงใหม่นี้ใช่หรือไม่? แถวเดิมที่ตรงกันจะถูกผูกกับช่วงวันที่ใหม่`)) return;
    setBusy(true);
    try {
      const outcome = await timetableRepository.importTimetable({ academicYear: year, semester, building, ...termPayload, fileName, csv, clearExisting });
      setResult(outcome);
      setPreview(null);
      setImports(await timetableRepository.history());
      const removedMsg = outcome.removedCount ? ` · ลบของเดิม ${outcome.removedCount}` : '';
      showToast(`นำเข้าแล้ว: เพิ่ม ${outcome.addedCount} · ปรับปรุง ${outcome.updatedCount}${removedMsg}`, 's');
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
  const canConfirm = Boolean(preview?.canImport) && termDatesOk && !busy;

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
              {buildings.length === 0 && <option value="">-- ยังไม่มีตึกในระบบ --</option>}
              {buildings.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginTop: '4px' }}>
          <div className="form-group">
            <label className="form-label">วันเริ่มภาคเรียน *</label>
            <ThaiDateInput value={termStartDate} onChange={(e) => changed(setTermStartDate)(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">วันสิ้นสุดภาคเรียน *</label>
            <ThaiDateInput value={termEndDate} onChange={(e) => changed(setTermEndDate)(e.target.value)} />
          </div>
        </div>
        {termStartDate && termEndDate && !termDatesOk && (
          <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '6px' }}>วันสิ้นสุดภาคเรียนต้องไม่ก่อนวันเริ่มภาคเรียน</div>
        )}

        {termChanged && (
          <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '10px 12px', marginTop: '10px', fontSize: '12px', color: '#92400e' }}>
            มีการนำเข้า {year} {semester} แล้ว ช่วง {formatDateDMY(existingTerm.termStartDate)} ถึง {formatDateDMY(existingTerm.termEndDate)} — กด "ยืนยันการนำเข้า" ด้านล่างแล้วระบบจะถามยืนยันอีกครั้งก่อนเปลี่ยนช่วงวันที่
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
          <label className="btn btn-o" style={{ cursor: 'pointer' }}>
            เลือกไฟล์ CSV
            <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          <span style={{ fontSize: '12px', color: '#4A4F7A' }}>{fileName || 'ยังไม่ได้เลือกไฟล์'}</span>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12px', color: '#991b1b' }}>
          <input type="checkbox" checked={clearExisting} onChange={(e) => setClearExisting(e.target.checked)} />
          ลบตารางเดิมของ {year} {semester} · {building} ทั้งหมดก่อนนำเข้า (ย้อนกลับไม่ได้)
        </label>
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            onClick={() => setShowExample((v) => !v)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '11px', color: '#38419D', fontFamily: 'Sarabun,sans-serif', textDecoration: 'underline' }}
          >
            {showExample ? '▾ ซ่อนตัวอย่างไฟล์ CSV' : '▸ ดูตัวอย่างไฟล์ CSV'}
          </button>
          {showExample && (
            <div style={{ marginTop: '8px', background: '#F4F5FA', border: '.5px solid #D8DBF0', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1A1D3A' }}>ตัวอย่างรูปแบบไฟล์ CSV ({building || 'เลือกอาคารก่อน'})</span>
                {exampleRows.length > 0 && (
                  <button type="button" className="btn btn-o" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={downloadExample}>ดาวน์โหลดไฟล์ตัวอย่าง</button>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#8890B5', margin: '6px 0 8px' }}>
                คอลัมน์ที่ต้องมี: {CSV_HEADER.join(', ')} (แถวแรกเป็นหัวคอลัมน์ได้) — "วัน" สะกดเต็ม ไม่ย่อ, เวลาเป็น HH:MM แบบ 24 ชั่วโมง, "ห้อง" ต้องเป็นรหัสห้องที่มีอยู่จริงในอาคารที่เลือก
              </div>
              {exampleRows.length > 0 ? (
                <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
                  <table className="tbl" style={{ fontSize: '11px' }}>
                    <thead><tr>{CSV_HEADER.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {exampleRows.map((r, i) => (
                        <tr key={i}><td>{r.day}</td><td>{r.room}</td><td>{r.start}</td><td>{r.end}</td><td>{r.courseCode}</td><td>{r.section}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#991b1b' }}>อาคารนี้ยังไม่มีห้องในระบบ เพิ่มห้องที่ "จัดการห้อง" ก่อน จึงจะสร้างตัวอย่างได้</div>
              )}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', fontSize: '12px', color: '#166534' }}>
          นำเข้าสำเร็จ (ครั้งที่ {result.importId}): ทั้งหมด {result.totalRows} แถว · เพิ่มใหม่ {result.addedCount} · ปรับปรุง {result.updatedCount}
          {result.removedCount ? ` · ลบของเดิม ${result.removedCount}` : ' · ไม่มีการลบรายการเดิม'}
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
                <td style={{ whiteSpace: 'nowrap' }}>{formatDateTimeDMY(h.importedAt)}</td>
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
