import { useState, useEffect, useRef } from 'react';
import { IC } from '../../shared/icons.js';
import {
  BOOKING_EQUIPMENT_OPTIONS, BOOKING_PURPOSES, TEACHER_ONLY_PURPOSES, OTHER_PURPOSE,
  TIME_SLOTS_START, TIME_SLOTS_END, PARTICIPATING_TEACHERS,
} from '../../shared/constants.js';
import { localDateStr } from '../../shared/dateUtils.js';
import { BookingPermissionPolicy } from '../../domain/policies/BookingPermissionPolicy.js';
import { ApprovalPolicy } from '../../domain/policies/ApprovalPolicy.js';
import { bookingStatusLongLabel } from '../formatters/statusLabels.js';
import { container } from '../../shared/di/container.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFacilityRequestFields } from '../hooks/useFacilityRequestFields.js';
import { FacilityRequestFields } from '../components/FacilityRequestFields.jsx';
import { printBookingReceipt } from '../print/printBookingReceipt.js';

const DEFAULT_START = TIME_SLOTS_START[0];
const DEFAULT_END = '12:00';

/** Name + student-ID pair entry, mirroring FacilityRequestFields' FoodTagInput
 * (input row + removable chip list) but for two fields instead of one. */
function StudentTagInput({ students, onAdd, onRemove }) {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');

  function submit() {
    if (!name.trim() || !studentId.trim()) return;
    onAdd({ name: name.trim(), studentId: studentId.trim() });
    setName('');
    setStudentId('');
  }

  return (
    <div style={{ border: '.5px solid #C2C7E0', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>
        <input
          type="text"
          placeholder="ชื่อนักศึกษา"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          style={{ flex: 1, border: 'none', borderRight: '.5px solid #C2C7E0', padding: '9px 12px', fontSize: '12px', fontFamily: 'Sarabun,sans-serif', color: '#1A1D3A', outline: 'none', background: '#fff' }}
        />
        <input
          type="text"
          placeholder="รหัสนักศึกษา"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          style={{ width: '140px', border: 'none', padding: '9px 12px', fontSize: '12px', fontFamily: 'Sarabun,sans-serif', color: '#1A1D3A', outline: 'none', background: '#fff' }}
        />
        <button onClick={submit} style={{ padding: '0 14px', background: '#38419D', color: 'white', border: 'none', fontSize: '11px', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif', fontWeight: 600 }}>+ เพิ่ม</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', padding: '8px 10px', background: '#F4F5FA', minHeight: '36px' }}>
        {students.length
          ? students.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '.5px solid #C2C7E0', borderRadius: '20px', padding: '3px 9px', fontSize: '11px', color: '#1A1D3A' }}>
              <span>{s.name} ({s.studentId})</span>
              <span onClick={() => onRemove(i)} style={{ color: '#8890B5', cursor: 'pointer', fontSize: '13px' }}>×</span>
            </div>
          ))
          : <span style={{ fontSize: '11px', color: '#8890B5', alignSelf: 'center' }}>ยังไม่มีรายชื่อ</span>}
      </div>
    </div>
  );
}

const { roomRepository, settingsRepository } = container.repositories;
const { createBookingUseCase, checkRoomAvailabilityUseCase, saveTemplateUseCase } = container.useCases;

// setDate() rolls over months/years correctly (unlike raw ms arithmetic,
// which can drift a day around DST) — used to cap the date picker at
// "today + admin's max advance days".
function addDaysLocal(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// "HH:MM", zero-padded to match TIME_SLOTS_START's format so plain string
// comparison ("14:05" >= "14:00") works for filtering past slots.
function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function BookingView() {
  const { role, canApprove, user } = useAuth();
  const { approvalMode, navigate, setLastBookingSnapshot, takeTemplateToApply } = useAppShell();
  const { showToast } = useToast();
  const { openModal, closeModal } = useModal();

  const canBook = BookingPermissionPolicy.canBookRooms(role) || canApprove;
  const showFacilityPanel = BookingPermissionPolicy.canRequestFacilities(role, canApprove);
  const autoApprove = ApprovalPolicy.willAutoApprove({ canApprove, approvalMode });
  const today = localDateStr();

  // Admin-configured cap (บันทึกข้อความ setting), fetched once — null until
  // loaded, so the date picker has no `max` yet and submitBooking's check
  // is skipped rather than false-rejecting on a slow network.
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(null);
  useEffect(() => {
    settingsRepository.getMaxAdvanceDays().then(setMaxAdvanceDays).catch(() => {});
  }, []);
  const maxDateStr = maxAdvanceDays != null ? localDateStr(addDaysLocal(new Date(), maxAdvanceDays)) : undefined;

  // Consumed exactly once on mount — a template handed off by TemplatesView.
  const [template] = useState(() => takeTemplateToApply());

  const [date, setDate] = useState(today);
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [roomId, setRoomId] = useState(template?.room || '');
  const [participants, setParticipants] = useState(template?.participants || 10);
  const [purpose, setPurpose] = useState(template?.purpose || BOOKING_PURPOSES[0]);
  const [otherPurpose, setOtherPurpose] = useState('');
  const [note, setNote] = useState(template?.note || '');
  const [teacherChecked, setTeacherChecked] = useState(() => {
    const saved = new Set(template?.participatingTeachers || []);
    return PARTICIPATING_TEACHERS.map((name) => saved.has(name));
  });
  const [bookForStudent, setBookForStudent] = useState(false);
  const [students, setStudents] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [noRoomsHint, setNoRoomsHint] = useState(false);
  const [roomWarnMsg, setRoomWarnMsg] = useState('');

  // Booking today shouldn't offer start times already in the past —
  // future dates are unaffected (every slot is still "available").
  const startSlots = date === today ? TIME_SLOTS_START.filter((t) => t >= nowTimeStr()) : TIME_SLOTS_START;

  // If the selected/default start time has already passed by the time the
  // form is open on today's date (e.g. the "08:00" default on an afternoon
  // visit, or the clock crossing a slot while the form sits open), bump
  // forward to the next slot that hasn't — otherwise `start` would hold a
  // value no longer in startSlots' option list.
  useEffect(() => {
    if (date !== today) return;
    if (startSlots.includes(start)) return;
    if (startSlots.length) setStart(startSlots[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, startSlots.join(',')]);

  const facility = useFacilityRequestFields(
    BOOKING_EQUIPMENT_OPTIONS,
    template?.equipment || {},
    template?.food ? [...template.food] : [],
    template?.facilityNote || '',
  );

  const needsTeacherListAndFood = showFacilityPanel && TEACHER_ONLY_PURPOSES.includes(purpose);
  const selectedTeacherCount = teacherChecked.filter(Boolean).length;

  // For จัดประชุม/จัดสอบโครงงานปริญญานิพนธ์ the participant count isn't a
  // free-form guess — it's exactly the checked teacher list plus the
  // booker themselves, so keep it in sync instead of trusting manual entry.
  useEffect(() => {
    if (needsTeacherListAndFood) setParticipants(selectedTeacherCount + 1);
  }, [needsTeacherListAndFood, selectedTeacherCount]);

  // Skip the very first "still available?" check when a template prefilled
  // roomId — the default date/start/end are just placeholders the user
  // hasn't chosen yet, so checking the template's room against them is
  // premature and would blank out a perfectly fine room before the user
  // even touches the date field. Once they change date/start/end for real,
  // this reverts to normal (auto-clears if their new slot conflicts).
  const skipFirstAvailabilityClear = useRef(Boolean(template?.room));

  // Rooms actually free for the selected date/start/end — race-guarded so
  // an earlier request resolving after a later one can't clobber the
  // dropdown with stale results (replaces the old refreshToken counter).
  useEffect(() => {
    if (!canBook) return undefined;
    let cancelled = false;
    const skipClear = skipFirstAvailabilityClear.current;
    skipFirstAvailabilityClear.current = false;
    if (start >= end) {
      setAvailableRooms([]);
      setNoRoomsHint(true);
      return undefined;
    }
    (async () => {
      let rooms;
      try {
        rooms = await roomRepository.getAvailable({ date, start, end });
      } catch {
        rooms = [];
      }
      if (cancelled) return;
      setAvailableRooms(rooms);
      setNoRoomsHint(rooms.length === 0);
      if (skipClear) return;
      setRoomId((prevId) => {
        if (!prevId) return prevId;
        const stillAvailable = rooms.some((r) => r.id === prevId);
        if (!stillAvailable) {
          showToast('ห้องที่เลือกไว้ไม่ว่างแล้วในช่วงเวลานี้ กรุณาเลือกห้องใหม่', 'e');
          return '';
        }
        return prevId;
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, start, end, canBook]);

  // Same-day conflict hint for the selected room.
  useEffect(() => {
    if (!roomId || !date) { setRoomWarnMsg(''); return undefined; }
    let cancelled = false;
    checkRoomAvailabilityUseCase.execute({ room: roomId, date }).then(({ bookedTimes }) => {
      if (cancelled) return;
      setRoomWarnMsg(bookedTimes.length ? `ห้อง ${roomId} มีการจองแล้วในวันนี้: ${bookedTimes.join(', ')}` : '');
    });
    return () => { cancelled = true; };
  }, [roomId, date]);

  if (!canBook) {
    return (
      <div className="misc-pg">
        <span dangerouslySetInnerHTML={{ __html: IC.gear }} />
        <div style={{ fontWeight: 500, color: '#4A4F7A' }}>ไม่มีสิทธิ์จองห้อง</div>
        <div>เฉพาะอาจารย์และนักศึกษาเท่านั้น</div>
      </div>
    );
  }

  function showConflictModal(conflict, requested) {
    openModal(
      'ไม่สามารถจองได้',
      <>
        <div style={{ background: '#fee2e2', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b', marginBottom: '3px' }}>ห้อง {requested.room} ไม่ว่างในช่วงเวลานี้</div>
            <div style={{ fontSize: '11px', color: '#b91c1c' }}>วันที่ {requested.date} · เวลา {requested.start}–{requested.end}</div>
          </div>
        </div>
        {conflict && (
          <>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#4A4F7A', marginBottom: '8px' }}>การจองที่ขัดแย้ง</div>
            <div style={{ background: '#F4F5FA', borderRadius: '8px', padding: '12px 14px' }}>
              {[
                ['ห้อง', `ห้อง ${conflict.room}`],
                ['ผู้จอง', conflict.user],
                ['วัตถุประสงค์', conflict.title],
                ['วันที่', conflict.date],
                ['เวลา', conflict.time],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '.5px solid #D8DBF0' }}>
                  <span style={{ fontSize: '11px', color: '#8890B5' }}>{k}</span>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#1A1D3A' }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '.5px solid #D8DBF0' }}>
                <span style={{ fontSize: '11px', color: '#8890B5' }}>สถานะ</span>
                <span style={{ background: conflict.isApproved() ? '#dcfce7' : '#FEF3C7', color: conflict.isApproved() ? '#166534' : '#92400e', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 500 }}>{bookingStatusLongLabel(conflict.status)}</span>
              </div>
            </div>
          </>
        )}
        <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '10px 12px', marginTop: '12px', fontSize: '11px', color: '#38419D' }}>
          กรุณาเลือกห้องอื่น หรือเปลี่ยนวันที่/เวลา แล้วลองจองใหม่อีกครั้ง
        </div>
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ปิด</button>
        <button className="btn btn-p" onClick={() => { closeModal(); navigate('rooms'); }}>ดูห้องว่าง</button>
      </>,
    );
  }

  function promptSaveTemplate(snapshot) {
    let nameValue = `${snapshot.purpose} · ห้อง ${snapshot.room}`;
    openModal(
      'บันทึกเป็นรายการโปรด',
      <>
        <div className="form-group">
          <label className="form-label">ชื่อเทมเพลต *</label>
          <input className="form-control" defaultValue={nameValue} placeholder="เช่น สอน CS301 ห้อง 1637" onChange={(e) => { nameValue = e.target.value; }} />
        </div>
        <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: '#38419D' }}>จะไม่บันทึกวันที่และเวลา — ต้องเลือกวันที่และเวลาใหม่ทุกครั้งตอนจองจากเทมเพลตนี้</div>
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ยกเลิก</button>
        <button
          className="btn btn-p"
          onClick={async () => {
            const name = nameValue.trim();
            if (!name) { showToast('กรุณาตั้งชื่อเทมเพลต', 'e'); return; }
            const result = await saveTemplateUseCase.execute({ name, snapshot });
            if (!result.success) { showToast('กรุณาตั้งชื่อเทมเพลต', 'e'); return; }
            closeModal();
            showToast('บันทึกเทมเพลตเรียบร้อย', 's');
          }}
        >
          บันทึก
        </button>
      </>,
    );
  }

  function showSuccessModal(booking, autoApproved, snapshot) {
    const statusText = autoApproved ? 'อนุมัติแล้ว' : 'รอการอนุมัติ';
    const [bStart, bEnd] = booking.time.split('-');
    openModal(
      'จองสำเร็จ!',
      <>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{ width: '56px', height: '56px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1D3A', marginBottom: '4px' }}>จองห้องสำเร็จ!</div>
          <div style={{ fontSize: '12px', color: '#8890B5' }}>{autoApproved ? 'อนุมัติอัตโนมัติแล้ว' : 'รอการอนุมัติ'}</div>
        </div>
        <div style={{ background: '#F4F5FA', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>รายละเอียดการจอง</div>
          {[
            ['รหัสการจอง', booking.id],
            ['ห้อง', `ห้อง ${booking.room}`],
            ['ผู้จอง', user.name],
            ['วันที่', booking.date],
            ['เวลา', `${bStart} – ${bEnd}`],
            ['วัตถุประสงค์', booking.title],
            ['สถานะ', statusText],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '.5px solid #E8EAF0' }}>
              <span style={{ fontSize: '11px', color: '#8890B5' }}>{k}</span>
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#1A1D3A' }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '10px 14px', fontSize: '11px', color: '#38419D', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38419D" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          กดปุ่ม "พิมพ์ PDF" เพื่อเก็บเป็นหลักฐานการจอง
        </div>
      </>,
      <>
        <button className="btn btn-o" onClick={() => promptSaveTemplate(snapshot)}>บันทึกเป็นรายการโปรด</button>
        <button className="btn btn-o" onClick={() => { closeModal(); navigate('history'); }}>ดูประวัติ</button>
        <button className="btn btn-p" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => printBookingReceipt(booking)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
          พิมพ์ PDF
        </button>
      </>,
    );
  }

  function openConfirmModal() {
    if (!roomId) { showToast('กรุณาเลือกห้อง', 'e'); return; }
    if (!date || !start || !end) { showToast('กรุณากรอกวันที่และเวลา', 'e'); return; }
    if (start >= end) { showToast('เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น', 'e'); return; }
    if (maxDateStr && date > maxDateStr) { showToast(`จองล่วงหน้าได้ไม่เกิน ${maxAdvanceDays} วัน`, 'e'); return; }
    if (purpose === OTHER_PURPOSE && !otherPurpose.trim()) { showToast('กรุณาระบุวัตถุประสงค์', 'e'); return; }
    if (bookForStudent && !students.length) { showToast('กรุณาเพิ่มรายชื่อนักศึกษาอย่างน้อย 1 คน', 'e'); return; }

    const finalPurpose = purpose === OTHER_PURPOSE ? otherPurpose.trim() : purpose;
    const equipmentSummary = BOOKING_EQUIPMENT_OPTIONS
      .filter((opt) => (facility.equipment[opt.k] || 0) > 0)
      .map((opt) => `${opt.nm} ${facility.equipment[opt.k]}`);
    const foodCounts = {};
    facility.food.forEach((f) => { foodCounts[f] = (foodCounts[f] || 0) + 1; });
    const foodSummary = Object.entries(foodCounts).map(([name, qty]) => (qty > 1 ? `${name} ×${qty}` : name));
    const participatingTeacherNames = needsTeacherListAndFood
      ? PARTICIPATING_TEACHERS.filter((_, i) => teacherChecked[i])
      : [];

    const rows = [
      ['ผู้จอง', user.name],
      ['ห้อง', `ห้อง ${roomId}`],
      ['วันที่', date],
      ['เวลา', `${start} – ${end}`],
      ['วัตถุประสงค์', finalPurpose],
      ['จำนวนผู้เข้าร่วม', `${participants} คน`],
    ];

    const chipList = (items) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {items.map((item, i) => <span key={i} className="chip chip-a">{item}</span>)}
      </div>
    );

    openModal(
      'ยืนยันการจอง',
      <>
        <div style={{ background: '#F4F5FA', borderRadius: '10px', padding: '4px 16px' }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: '.5px solid #E8EAF0' }}>
              <span style={{ fontSize: '11px', color: '#8890B5', flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#1A1D3A', textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>

        {needsTeacherListAndFood && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '6px' }}>อาจารย์ที่เข้าร่วม</div>
            {participatingTeacherNames.length ? chipList(participatingTeacherNames) : <div style={{ fontSize: '11px', color: '#991b1b' }}>ยังไม่ได้เลือก</div>}
          </div>
        )}

        {bookForStudent && students.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '6px' }}>จองแทนนักศึกษา</div>
            {chipList(students.map((s) => `${s.name} (${s.studentId})`))}
          </div>
        )}

        {showFacilityPanel && equipmentSummary.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '6px' }}>อุปกรณ์เพิ่มเติม</div>
            {chipList(equipmentSummary)}
          </div>
        )}

        {showFacilityPanel && foodSummary.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '6px' }}>อาหาร / เครื่องดื่ม</div>
            {chipList(foodSummary)}
          </div>
        )}

        {note.trim() && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '4px' }}>รายละเอียดเพิ่มเติม</div>
            <div style={{ fontSize: '12px', color: '#1A1D3A', background: '#F4F5FA', borderRadius: '8px', padding: '8px 12px', whiteSpace: 'pre-wrap' }}>{note.trim()}</div>
          </div>
        )}

        {showFacilityPanel && facility.facilityNote?.trim() && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '4px' }}>หมายเหตุถึงเจ้าหน้าที่</div>
            <div style={{ fontSize: '12px', color: '#1A1D3A', background: '#F4F5FA', borderRadius: '8px', padding: '8px 12px', whiteSpace: 'pre-wrap' }}>{facility.facilityNote.trim()}</div>
          </div>
        )}

        <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '10px 12px', marginTop: '12px', fontSize: '11px', color: '#38419D' }}>
          กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยัน
        </div>
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ย้อนกลับ</button>
        <button className="btn btn-p" onClick={() => { closeModal(); submitBooking(); }}>ยืนยันการจอง</button>
      </>,
    );
  }

  async function submitBooking() {
    if (!roomId) { showToast('กรุณาเลือกห้อง', 'e'); return; }
    if (!date || !start || !end) { showToast('กรุณากรอกวันที่และเวลา', 'e'); return; }
    if (start >= end) { showToast('เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น', 'e'); return; }
    if (maxDateStr && date > maxDateStr) { showToast(`จองล่วงหน้าได้ไม่เกิน ${maxAdvanceDays} วัน`, 'e'); return; }
    if (purpose === OTHER_PURPOSE && !otherPurpose.trim()) { showToast('กรุณาระบุวัตถุประสงค์', 'e'); return; }
    if (bookForStudent && !students.length) { showToast('กรุณาเพิ่มรายชื่อนักศึกษาอย่างน้อย 1 คน', 'e'); return; }

    const finalPurpose = purpose === OTHER_PURPOSE ? otherPurpose.trim() : purpose;
    const participatingTeachers = PARTICIPATING_TEACHERS.filter((_, i) => teacherChecked[i]);
    const bookingForStudents = bookForStudent ? [...students] : [];
    const facilityPayload = showFacilityPanel
      ? { equipment: { ...facility.equipment }, food: [...facility.food], facilityNote: facility.facilityNote }
      : null;

    showToast('กำลังบันทึก...', 'i');
    try {
      const result = await createBookingUseCase.execute({
        room: roomId, date, start, end, purpose: finalPurpose, participants, note, participatingTeachers, bookingForStudents, facility: facilityPayload,
      });

      if (!result.success) {
        showConflictModal(result.conflict, { room: roomId, date, start, end });
        return;
      }

      const snapshot = {
        room: roomId, purpose: finalPurpose, participants, note,
        equipment: facilityPayload ? { ...facilityPayload.equipment } : {},
        food: facilityPayload ? [...facilityPayload.food] : [],
        facilityNote: facilityPayload ? facilityPayload.facilityNote : '',
        participatingTeachers: [...participatingTeachers],
      };
      setLastBookingSnapshot(snapshot);
      showSuccessModal(result.booking, result.autoApproved, snapshot);

      facility.reset({}, []);
      setStudents([]);
      setBookForStudent(false);
    } catch (err) {
      showToast(err.message || 'จองไม่สำเร็จ', 'e');
    }
  }

  // Keeps the currently selected room visible in the dropdown even when
  // it falls outside the freshly computed "available for this date/time"
  // list (e.g. a template's room before the user has picked a real date) —
  // otherwise the <select>'s value wouldn't match any rendered <option>
  // and it would silently render blank.
  const selectedRoomNotListed = roomId && !availableRooms.some((r) => r.id === roomId) ? roomRepository.findById(roomId) : null;
  const roomOptions = selectedRoomNotListed ? [selectedRoomNotListed, ...availableRooms] : availableRooms;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: showFacilityPanel ? 'minmax(0,1fr) minmax(0,420px)' : 'minmax(0,560px)', gap: '20px', alignItems: 'start', ...(showFacilityPanel ? {} : { margin: '0 auto' }) }}>

      <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(42,34,98,.08),0 8px 32px rgba(42,34,98,.06)' }}>
        <div style={{ background: 'linear-gradient(135deg,#2A2262 0%,#38419D 60%,#3887BE 100%)', padding: '20px 24px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: IC.cal }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>แบบฟอร์มจองห้อง</div>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)' }}>กรอกข้อมูลให้ครบ แล้วกดยืนยันการจอง</div>
          <div style={{ marginTop: '12px', background: 'rgba(255,255,255,.12)', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: autoApprove ? '#a7f3d0' : '#fde68a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {autoApprove ? 'ได้รับการอนุมัติอัตโนมัติทันที' : 'คำขอจะถูกส่งไปรอการอนุมัติ'}
          </div>
        </div>
        <div style={{ padding: '22px 24px' }}>
          <div className="form-group">
            <label className="form-label">เลือกห้อง * <span style={{ color: '#8890B5', fontWeight: 400 }}>(เฉพาะห้องที่ว่างในวันและเวลาที่เลือก)</span></label>
            <select className="form-control" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">-- เลือกห้อง --</option>
              {roomOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {noRoomsHint && (
              <div style={{ marginTop: '6px', background: '#fef2f2', border: '.5px solid #fca5a5', borderRadius: '7px', padding: '7px 11px', fontSize: '11px', color: '#991b1b' }}>
                ไม่มีห้องว่างสำหรับวันและเวลาที่เลือก กรุณาเปลี่ยนวันที่หรือเวลาอื่น
              </div>
            )}
            {roomWarnMsg && (
              <div style={{ marginTop: '6px', background: '#FEF3C7', border: '.5px solid #fde68a', borderRadius: '7px', padding: '7px 11px', fontSize: '11px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{roomWarnMsg}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">วันที่จอง *</label>
              <input type="date" className="form-control" value={date} min={today} max={maxDateStr} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">จำนวนผู้เข้าร่วม</label>
              <input
                type="number"
                className="form-control"
                value={participants}
                min="1"
                max="20"
                disabled={needsTeacherListAndFood}
                onChange={(e) => setParticipants(Number(e.target.value) || 1)}
              />
              {needsTeacherListAndFood && (
                <div style={{ fontSize: '10.5px', color: '#8890B5', marginTop: '4px' }}>นับจากรายชื่ออาจารย์ที่เข้าร่วมด้านล่าง + ผู้จอง</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">เวลาเริ่มต้น *</label>
              {startSlots.length ? (
                <select className="form-control" value={start} onChange={(e) => setStart(e.target.value)}>
                  {startSlots.map((t) => <option key={t}>{t}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: '11px', color: '#991b1b', background: '#fef2f2', border: '.5px solid #fca5a5', borderRadius: '7px', padding: '9px 11px' }}>
                  หมดเวลาจองสำหรับวันนี้แล้ว กรุณาเลือกวันที่อื่น
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">เวลาสิ้นสุด *</label>
              <select className="form-control" value={end} onChange={(e) => setEnd(e.target.value)} disabled={!startSlots.length}>
                {TIME_SLOTS_END.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">วัตถุประสงค์ *</label>
            <select className="form-control" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {BOOKING_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
              {showFacilityPanel && TEACHER_ONLY_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
              <option value={OTHER_PURPOSE}>{OTHER_PURPOSE}</option>
            </select>
          </div>

          {purpose === OTHER_PURPOSE && (
            <div className="form-group">
              <label className="form-label">ระบุวัตถุประสงค์ *</label>
              <input type="text" className="form-control" value={otherPurpose} placeholder="ระบุรายละเอียดวัตถุประสงค์..." onChange={(e) => setOtherPurpose(e.target.value)} />
            </div>
          )}

          {showFacilityPanel && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#1A1D3A', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  style={{ accentColor: '#38419D' }}
                  checked={bookForStudent}
                  onChange={(e) => { setBookForStudent(e.target.checked); if (!e.target.checked) setStudents([]); }}
                />
                จองแทนนักศึกษา <span style={{ color: '#8890B5', fontWeight: 400 }}>(การจองยังคงอยู่ภายใต้ชื่อและความดูแลของอาจารย์)</span>
              </label>
              {bookForStudent && (
                <div style={{ marginTop: '8px' }}>
                  <StudentTagInput
                    students={students}
                    onAdd={(s) => setStudents((cur) => [...cur, s])}
                    onRemove={(i) => setStudents((cur) => cur.filter((_, idx) => idx !== i))}
                  />
                </div>
              )}
            </div>
          )}

          {needsTeacherListAndFood && (
            <div className="form-group">
              <label className="form-label">รายชื่ออาจารย์ที่เข้าร่วม <span style={{ color: '#8890B5', fontWeight: 400 }}>(เลือกได้หลายคน)</span></label>
              <div style={{ border: '.5px solid #C2C7E0', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '6px 8px' }}>
                  {PARTICIPATING_TEACHERS.map((name, i) => (
                    <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 6px', cursor: 'pointer', borderRadius: '5px', fontSize: '12px', color: '#1A1D3A' }}>
                      <input
                        type="checkbox"
                        style={{ accentColor: '#38419D' }}
                        checked={teacherChecked[i]}
                        onChange={(e) => setTeacherChecked((cur) => cur.map((v, idx) => (idx === i ? e.target.checked : v)))}
                      />
                      {name}
                    </label>
                  ))}
                </div>
                <div style={{ padding: '5px 10px 7px', background: '#F4F5FA', borderTop: '.5px solid #D8DBF0', fontSize: '10px', color: '#8890B5' }}>เลือก {selectedTeacherCount} คน</div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">รายละเอียดเพิ่มเติม</label>
            <textarea className="form-control" rows="3" placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button onClick={openConfirmModal} disabled={!startSlots.length} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#2A2262,#38419D)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun,sans-serif', letterSpacing: '.02em', opacity: startSlots.length ? 1 : .5 }}>ยืนยันการจอง</button>
            <button onClick={() => navigate('rooms')} style={{ padding: '12px 18px', background: '#F4F5FA', color: '#4A4F7A', border: '.5px solid #D8DBF0', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'Sarabun,sans-serif' }}>ยกเลิก</button>
          </div>
        </div>
      </div>

      {showFacilityPanel && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(42,34,98,.08),0 8px 32px rgba(42,34,98,.06)' }}>
            <div style={{ background: 'linear-gradient(135deg,#0F4C75,#3887BE)', padding: '18px 20px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,.15)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: IC.tool }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>ขอสิ่งอำนวยความสะดวกเพิ่มเติม</div>
                </div>
                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,.15)', color: 'white', padding: '3px 9px', borderRadius: '20px' }}>เฉพาะอาจารย์</span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', marginTop: '5px' }}>เจ้าหน้าที่จะได้รับแจ้งเตือนทันที</div>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <FacilityRequestFields
                variant="detailed"
                showFood={needsTeacherListAndFood}
                equipmentOptions={BOOKING_EQUIPMENT_OPTIONS}
                equipment={facility.equipment}
                onEquipmentDelta={facility.setEquipmentQty}
                food={facility.food}
                onAddFood={facility.addFood}
                onRemoveFood={facility.removeFood}
                facilityNote={facility.facilityNote}
                onFacilityNoteChange={facility.setFacilityNote}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
