import { useState, useEffect } from 'react';
import { IC } from '../../shared/icons.js';
import {
  BOOKING_PURPOSES, TEACHER_ONLY_PURPOSES, OTHER_PURPOSE, PURPOSE_DETAIL_FIELDS, purposeWithDetail,
  PARTICIPATING_TEACHERS,
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
import { FacilityRequestFields, QtyInput } from '../components/FacilityRequestFields.jsx';
import { printBookingReceipt } from '../print/printBookingReceipt.js';
import { formatDateDMY, formatDateSpan } from '../../shared/dateFormat.js';
import { BookingDaysCalendar } from '../components/BookingDaysCalendar.jsx';
import { bookingDates, MAX_BOOKING_DAYS } from '../../domain/policies/MultiDayBookingPolicy.js';
import { ThaiDateInput } from '../components/ThaiDateInput.jsx';
import { foodLabel } from '../../shared/foodFormat.js';

const DAY_END_MINUTES = 23 * 60 + 30;
const THAI_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// Dates as one short line, grouped by month: "2, 9, 16, 23, 30 พ.ย. · 7 ธ.ค. 2569".
function formatDayList(dates) {
  const groups = [];
  for (const d of dates) {
    const key = d.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.days.push(Number(d.slice(8, 10)));
    else groups.push({ key, days: [Number(d.slice(8, 10))] });
  }
  const text = groups.map((g) => `${g.days.join(', ')} ${THAI_MONTH_SHORT[Number(g.key.slice(5, 7)) - 1]}`).join(' · ');
  return dates.length ? `${text} ${Number(dates[dates.length - 1].slice(0, 4)) + 543}` : '';
}

// For the weekly repeat label ("ทุกวันจันทร์").
const WEEKDAY_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
// Mirrors backend TimeSlotPolicy / BookingRepository.findConflict: rooms keep a
// 10-minute turnaround on both sides of every active booking.
const ROOM_TURNAROUND_MINUTES = 10;
const SLOT_STEP_MINUTES = 10;

// Every HH:MM from fromMin to toMin (inclusive) in steps of stepMinutes.
function slotsFrom(stepMinutes, fromMin, toMin) {
  const out = [];
  for (let m = fromMin; m <= toMin; m += stepMinutes) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

const DEFAULT_START = slotsFrom(10, 0, DAY_END_MINUTES)[0];
const DEFAULT_END = oneHourAfter(DEFAULT_START);

/** Name + student-ID pair entry: an input row that appends each entry as its
 * own row in a table below, rather than FoodTagInput's wrapped chip list —
 * easier to scan once there are more than a couple of names. */
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
          inputMode="numeric"
          value={studentId}
          // Digits only — a Thai keyboard left on can slip in a vowel mark
          // (e.g. "ุ640710774") that then shows on the printed form.
          onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          style={{ width: '140px', border: 'none', padding: '9px 12px', fontSize: '12px', fontFamily: 'Sarabun,sans-serif', color: '#1A1D3A', outline: 'none', background: '#fff' }}
        />
        <button onClick={submit} style={{ padding: '0 14px', background: '#38419D', color: 'white', border: 'none', fontSize: '11px', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif', fontWeight: 600 }}>+ เพิ่ม</button>
      </div>
      <div style={{ background: '#F4F5FA', minHeight: '36px' }}>
        {students.length
          ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#EEF0F8' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '11px', color: '#4A4F7A', fontWeight: 600, width: '30px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '11px', color: '#4A4F7A', fontWeight: 600 }}>ชื่อนักศึกษา</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '11px', color: '#4A4F7A', fontWeight: 600, width: '120px' }}>รหัสนักศึกษา</th>
                  <th style={{ width: '30px' }} />
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i} style={{ background: '#fff', borderTop: '.5px solid #D8DBF0' }}>
                    <td style={{ padding: '7px 10px', color: '#8890B5' }}>{i + 1}</td>
                    <td style={{ padding: '7px 10px', color: '#1A1D3A' }}>{s.name}</td>
                    <td style={{ padding: '7px 10px', color: '#1A1D3A' }}>{s.studentId}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      <span onClick={() => onRemove(i)} style={{ color: '#8890B5', cursor: 'pointer', fontSize: '14px' }}>×</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
          : <div style={{ padding: '10px 12px', fontSize: '11px', color: '#8890B5' }}>ยังไม่มีรายชื่อ</div>}
      </div>
    </div>
  );
}

const { roomRepository, settingsRepository, holidayRepository, equipmentRepository } = container.repositories;
const { createBookingUseCase, checkRoomAvailabilityUseCase, saveTemplateUseCase } = container.useCases;

// Mirrors the backend's OfficeHoursPolicy (Sat/Sun all day, a holiday all
// day, OR — on a weekday — start or end outside the 08:30-16:30 window, so
// late-night/early-morning slots count too, not just the evening) — used
// only to decide whether to show the room-responsible field client-side;
// the backend is still the actual source of truth for whether the saved
// booking needs manual approval.
const OFFICE_HOURS_START = '08:30';
const OFFICE_HOURS_END = '16:30';

// Local 'YYYY-MM-DD' string -> true for Sat/Sun. `new Date(dateStr)` parses
// a date-only string as UTC midnight; `.getUTCDay()` reads the calendar day
// of week back out without any local-timezone reinterpretation.
function isWeekendDate(dateStr) {
  const day = new Date(dateStr).getUTCDay();
  return day === 0 || day === 6;
}

// setDate() rolls over months/years correctly (unlike raw ms arithmetic,
// which can drift a day around DST) — used to cap the date picker at
// "today + admin's max advance days".
function addDaysLocal(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// "HH:MM", zero-padded so plain string
// comparison ("14:05" >= "14:00") works for filtering past slots.
function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const LAST_END_SLOT = '23:30';

// "HH:MM" + one hour, capped at the last selectable end slot.
function oneHourAfter(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(h * 60 + m + 60, 23 * 60 + 30);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function minutesOf(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function durationLabel(start, end) {
  const mins = minutesOf(end) - minutesOf(start);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} ชั่วโมง` : '', m ? `${m} นาที` : ''].filter(Boolean).join(' ');
}

// Bookings from the availability API look like "09:00-10:30"; a slot overlaps when
// it starts before the other ends and ends after the other starts.
function overlappingBookings(bookedTimes, start, end) {
  return bookedTimes.filter((range) => {
    const [bs, be] = range.split('-');
    return minutesOf(bs) - ROOM_TURNAROUND_MINUTES < minutesOf(end)
      && minutesOf(be) + ROOM_TURNAROUND_MINUTES > minutesOf(start);
  });
}

export function BookingView() {
  const { role, canApprove, user } = useAuth();
  const { approvalMode, navigate, setLastBookingSnapshot, takeTemplateToApply, takeBookingDateToApply } = useAppShell();
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

  // Fetched once — the admin-managed holiday calendar, needed to decide
  // whether the selected date counts as out-of-hours (see
  // OFFICE_HOURS_START/END above). Empty until loaded, so the field just
  // doesn't show yet rather than false-showing on a slow network.
  const [holidays, setHolidays] = useState([]);
  useEffect(() => {
    holidayRepository.refresh().then(setHolidays).catch(() => {});
  }, []);

  // Fetched once — the staff-managed equipment list (see
  // ManageEquipmentView) with live "คงเหลือ" counts; items Staff removed
  // are left out.
  const [liveEquipment, setLiveEquipment] = useState(() => equipmentRepository.getActive());
  useEffect(() => {
    equipmentRepository.refresh().then(() => setLiveEquipment(equipmentRepository.getActive())).catch(() => {});
  }, []);
  const equipmentOptions = liveEquipment.map((e) => ({ k: e.key, nm: e.name, ic: e.ic, avail: `${e.avail} ${e.unit}`, max: e.avail }));

  // Consumed exactly once on mount — a template handed off by TemplatesView.
  const [template] = useState(() => takeTemplateToApply());

  // Consumed once on mount — a date handed off from the Dashboard day panel.
  const [handedOffDate] = useState(() => takeBookingDateToApply());
  const [date, setDate] = useState(handedOffDate || template?.date || today);
  // Three ways to book (every booked day is one booking set — see
  // MultiDayBookingPolicy — approved/rejected/cancelled together):
  //   'single' — just `date`;
  //   'range'  — every day from `date` to `rangeEnd` ("1–5", "2–11"),
  //              weekends/holidays skipped unless the box is unticked;
  //   'weekly' — the start date's weekday, N weeks in a row, holidays skipped.
  // How far ahead either may go is the admin's maxAdvanceDays.
  const [mode, setMode] = useState('single');
  const [rangeEnd, setRangeEnd] = useState(date);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [weeks, setWeeks] = useState(4);
  // Days clicked off on the calendar (only those still in the span count).
  const [removedDates, setRemovedDates] = useState([]);
  const weekdayOfStart = new Date(date).getUTCDay();
  const repeatLabel = `ทุกวัน${WEEKDAY_FULL[weekdayOfStart]}`;
  const latestEndDate = maxDateStr || date;
  const holidayNames = new Map(holidays.map((h) => [h.date, h.name]));
  const holidayDates = [...holidayNames.keys()];
  // Weekly: same-weekday dates the repeat can reach within the limit.
  const weeklyDates = bookingDates({ date, endDate: latestEndDate, weekdays: [weekdayOfStart] });
  const maxWeeks = Math.min(weeklyDates.length, MAX_BOOKING_DAYS);
  const weekCount = Math.min(Math.max(1, Number(weeks) || 1), maxWeeks);
  const weeksTyped = Number(weeks);
  // Every day in the range/weeks before any are skipped — to name what was skipped.
  const spanDates = mode === 'weekly' ? weeklyDates.slice(0, weekCount)
    : mode === 'range' && rangeEnd > date ? bookingDates({ date, endDate: rangeEnd })
      : [date];
  const ruleDays = mode === 'weekly' ? spanDates.filter((d) => !holidayNames.has(d))
    : mode === 'range' ? bookingDates({ date, endDate: rangeEnd > date ? rangeEnd : date, skipNonWorkingDays: skipWeekends, holidayDates })
      : [date];
  const activeRemoved = mode === 'single' ? [] : removedDates.filter((d) => ruleDays.includes(d));
  const bookingDays = ruleDays.filter((d) => !activeRemoved.includes(d));
  // Left out by the rule (weekend/holiday) — clicked-off days are listed separately.
  const skippedDays = spanDates.filter((d) => !ruleDays.includes(d));
  function toggleRemoved(day) {
    setRemovedDates((list) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day]));
  }
  // Shown in red and blocks booking — what was typed/picked is never quietly corrected.
  const repeatError = mode === 'weekly'
    ? (!Number.isInteger(weeksTyped) || weeksTyped < 2 ? 'จำนวนสัปดาห์ต้องเป็นจำนวนเต็มตั้งแต่ 2 ขึ้นไป'
      : weeksTyped > maxWeeks ? `จองเกินกำหนด — จองซ้ำได้สูงสุด ${maxWeeks} สัปดาห์ (จองล่วงหน้าได้ไม่เกิน ${maxAdvanceDays} วัน)`
        : !bookingDays.length ? 'เอาออกหมดทุกวันแล้ว — กดวันในปฏิทินเพื่อจองคืน'
          : '')
    : mode === 'range'
      ? (rangeEnd <= date ? 'กรุณาเลือกวันสิ้นสุดให้หลังวันเริ่มต้น'
        : maxDateStr && rangeEnd > maxDateStr ? `จองเกินกำหนด — จองล่วงหน้าได้ไม่เกิน ${maxAdvanceDays} วัน (ถึง ${formatDateDMY(maxDateStr)})`
          : !bookingDays.length ? (activeRemoved.length ? 'เอาออกหมดทุกวันแล้ว — กดวันในปฏิทินเพื่อจองคืน' : 'ช่วงนี้ไม่มีวันทำการ')
            : bookingDays.length > MAX_BOOKING_DAYS ? `จองเกินกำหนด — จองได้ไม่เกิน ${MAX_BOOKING_DAYS} วันต่อครั้ง`
              : '')
      : '';
  const multiDay = mode !== 'single' && !repeatError && bookingDays.length > 0 && spanDates.length > 1;
  const lastDate = multiDay ? spanDates[spanDates.length - 1] : date;
  const activeWeekdays = multiDay && mode === 'weekly' ? [weekdayOfStart] : [];
  const isMultiDay = bookingDays.length > 1;
  const modeLabel = mode === 'weekly' ? repeatLabel : 'หลายวันติดกัน';
  function changeStartDate(next) {
    setDate(next);
    if (rangeEnd < next) setRangeEnd(next);
  }
  function changeMode(next) {
    setMode(next);
    // A range starts as "this day to four days later" (within the limit).
    if (next === 'range' && rangeEnd <= date) {
      const plus4 = new Date(new Date(date).getTime() + 4 * 86400000).toISOString().slice(0, 10);
      setRangeEnd(maxDateStr && plus4 > maxDateStr ? maxDateStr : plus4);
    }
  }
  const [start, setStart] = useState(template?.start || DEFAULT_START);
  const [end, setEnd] = useState(template?.end || DEFAULT_END);
  const [slotClash, setSlotClash] = useState(false);
  const [roomId, setRoomId] = useState(template?.room || '');
  const [participants, setParticipants] = useState(template?.participants || 10);
  const [purpose, setPurpose] = useState(template?.purpose || BOOKING_PURPOSES[0]);
  // What exactly is being taught/examined/met about — required for every
  // purpose (see PURPOSE_DETAIL_FIELDS); for อื่นๆ it is the whole purpose.
  const [purposeDetail, setPurposeDetail] = useState('');
  const purposeField = PURPOSE_DETAIL_FIELDS[purpose] || PURPOSE_DETAIL_FIELDS[OTHER_PURPOSE];
  const [note, setNote] = useState(template?.note || '');
  const [teacherChecked, setTeacherChecked] = useState(() => {
    const saved = new Set(template?.participatingTeachers || []);
    return PARTICIPATING_TEACHERS.map((name) => saved.has(name));
  });
  const [bookForStudent, setBookForStudent] = useState(false);
  // Booking on behalf of students offers everything a teacher's own booking
  // does — จัดประชุม / จัดสอบโครงงานปริญญานิพนธ์, equipment and food — since
  // that is what the department's paper request form is for (see
  // printStudentRoomRequest.js). The teacher stays the owner Staff notify.
  const facilityAvailable = showFacilityPanel;
  const [students, setStudents] = useState([]);
  const [roomResponsibleName, setRoomResponsibleName] = useState('');
  const [roomResponsiblePhone, setRoomResponsiblePhone] = useState('');
  const isSelfResponsible = Boolean(user?.name) && roomResponsibleName.trim() === user.name;
  // Out-of-hours, the room is opened/closed by the booker or by a staff
  // member — picked from this list rather than typed. Fetched once.
  const [staffContacts, setStaffContacts] = useState([]);
  useEffect(() => {
    container.apiClient.get('/users/staff').then(({ staff }) => setStaffContacts(staff)).catch(() => {});
  }, []);
  const responsibleChoices = [
    ...(user?.name ? [{ key: 'self', name: user.name, hint: 'ตัวฉันเอง' }] : []),
    ...staffContacts.filter((s) => s.name !== user?.name).map((s) => ({ key: `staff-${s.id}`, name: s.name, hint: 'เจ้าหน้าที่' })),
  ];
  const [availableRooms, setAvailableRooms] = useState([]);
  const [noRoomsHint, setNoRoomsHint] = useState(false);
  const [roomWarnMsg, setRoomWarnMsg] = useState('');

  // Booking today shouldn't offer start times already in the past —
  // future dates are unaffected (every slot is still "available").
  const timeStartOptions = slotsFrom(SLOT_STEP_MINUTES, 0, DAY_END_MINUTES);
  const timeEndOptions = slotsFrom(SLOT_STEP_MINUTES, SLOT_STEP_MINUTES, DAY_END_MINUTES);
  const startSlots = date === today ? timeStartOptions.filter((t) => t >= nowTimeStr()) : timeStartOptions;



  // If the selected/default start time has already passed by the time the
  // form is open on today's date (e.g. the "08:00" default on an afternoon
  // visit, or the clock crossing a slot while the form sits open), bump
  // forward to the next slot that hasn't — otherwise `start` would hold a
  // value no longer in startSlots' option list.
  useEffect(() => {
    if (date !== today) return;
    if (startSlots.includes(start)) return;
    if (startSlots.length) { setStart(startSlots[0]); setEnd(oneHourAfter(startSlots[0])); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, startSlots.join(',')]);

  // Out-of-hours (Sat/Sun, a holiday, or start/end outside 08:30-16:30 on a
  // weekday) is the only case the room-responsible question actually
  // applies to — during normal hours the building is already staffed, so
  // who opens/closes it isn't a decision the booker needs to make.
  // Across a multi-day range, any one out-of-hours day is enough.
  const isOutOfHours = bookingDays.some((d) => isWeekendDate(d) || holidays.some((h) => h.date === d)) || start < OFFICE_HOURS_START || end > OFFICE_HOURS_END;

  // Reset back to the default whenever the field stops applying (date/time
  // changed back into normal hours) — otherwise a stale "other" selection
  // with filled name/phone could linger in state, hidden from view, and
  // still get validated/submitted if the user flips back and forth.
  useEffect(() => {
    if (isOutOfHours) return;
    setRoomResponsibleName('');
    setRoomResponsiblePhone('');
  }, [isOutOfHours]);

  const facility = useFacilityRequestFields(
    equipmentOptions,
    template?.equipment || {},
    template?.food ? [...template.food] : [],
    template?.facilityNote || '',
  );

  const needsTeacherListAndFood = showFacilityPanel && TEACHER_ONLY_PURPOSES.includes(purpose);
  // The booker is counted automatically (+1 below), so their own name is
  // never offered or saved as a "participating teacher".
  const isOtherTeacher = (name) => name !== user?.name;
  const selectedTeacherCount = PARTICIPATING_TEACHERS.filter((name, i) => teacherChecked[i] && isOtherTeacher(name)).length;

  // For จัดประชุม/จัดสอบโครงงานปริญญานิพนธ์ the participant count isn't a
  // free-form guess — it's exactly the checked teacher list plus the booker
  // themselves; when booking on students' behalf it's the students instead
  // of the booker (who only books for them) — so keep it in sync instead of
  // trusting manual entry.
  const studentCount = bookForStudent ? students.length : 0;
  // Booking for students, the teacher says whether they attend too ("ฉัน
  // เข้าร่วมด้วย") — if so they count and are saved among the participating
  // teachers, so the printed request form lists them.
  const [bookerAttends, setBookerAttends] = useState(false);
  const bookerCounted = bookForStudent ? bookerAttends : true;
  // Booking for students, the count is always the names given (whatever the
  // purpose) — never a made-up default like 10.
  const autoParticipants = needsTeacherListAndFood || bookForStudent;
  const teachersCounted = needsTeacherListAndFood ? selectedTeacherCount : 0;
  useEffect(() => {
    if (autoParticipants) setParticipants(Math.max(1, teachersCounted + studentCount + (bookerCounted ? 1 : 0)));
  }, [autoParticipants, teachersCounted, studentCount, bookerCounted]);

  // Rooms actually free for the selected date/start/end — race-guarded so
  // an earlier request resolving after a later one can't clobber the
  // dropdown with stale results (replaces the old refreshToken counter).
  // Deliberately does NOT clear `roomId` when the selected room drops out
  // of this list — the room stays selected and `selectedRoomBusy` below
  // shows an inline warning instead, so changing the time doesn't snap the
  // picker back to "-- เลือกห้อง --" out from under the user.
  useEffect(() => {
    if (!canBook) return undefined;
    let cancelled = false;
    if (start >= end) {
      setAvailableRooms([]);
      setNoRoomsHint(true);
      return undefined;
    }
    (async () => {
      let rooms;
      try {
        rooms = await roomRepository.getAvailable({ date, endDate: lastDate, skipNonWorkingDays: multiDay && (mode === 'weekly' || skipWeekends), weekdays: activeWeekdays, excludeDates: multiDay ? activeRemoved : [], start, end });
      } catch {
        rooms = [];
      }
      if (cancelled) return;
      setAvailableRooms(rooms);
      setNoRoomsHint(rooms.length === 0);
    })();
    return () => { cancelled = true; };
  }, [date, lastDate, multiDay, mode, skipWeekends, activeWeekdays.join(','), activeRemoved.join(','), start, end, canBook]);

  // Same-day conflict hint for the selected room.
  useEffect(() => {
    // Single day only — over a range, the available-rooms list above already
    // marks a room busy if any of its days clash.
    if (!roomId || !date || isMultiDay) { setRoomWarnMsg(''); setSlotClash(false); return undefined; }
    let cancelled = false;
    checkRoomAvailabilityUseCase.execute({ room: roomId, date }).then(({ bookedTimes }) => {
      if (cancelled) return;
      if (start >= end) { setRoomWarnMsg(''); setSlotClash(false); return; }
      const clashes = overlappingBookings(bookedTimes, start, end);
      setSlotClash(clashes.length > 0);
      setRoomWarnMsg(clashes.length
        ? `ห้อง ${roomId} ไม่ว่างในช่วง ${start}–${end} (มีการจอง ${clashes.join(', ')})`
        : '');
    });
    return () => { cancelled = true; };
  }, [roomId, date, start, end, isMultiDay]);

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
            <div style={{ fontSize: '11px', color: '#b91c1c' }}>วันที่ {requested.dates.length > 1 ? formatDateSpan(requested.dates) : formatDateDMY(requested.date)} · เวลา {requested.start}–{requested.end}</div>
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
                ['วันที่', formatDateDMY(conflict.date)],
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
            ['วันที่', booking.groupDays?.length > 1 ? formatDateSpan(booking.groupDays.map((d) => d.date)) : formatDateDMY(booking.date)],
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
    if (maxDateStr && lastDate > maxDateStr) { showToast(`จองล่วงหน้าได้ไม่เกิน ${maxAdvanceDays} วัน`, 'e'); return; }
    if (bookingDays.length > MAX_BOOKING_DAYS) { showToast(`จองได้ไม่เกิน ${MAX_BOOKING_DAYS} วันต่อครั้ง (ตอนนี้ ${bookingDays.length} วัน)`, 'e'); return; }
    if (!bookingDays.length) { showToast('ช่วงวันที่เลือกไม่มีวันที่ตรงกับที่เลือก', 'e'); return; }
    if (repeatError) { showToast(repeatError, 'e'); return; }
    if (!purposeDetail.trim()) { showToast(`กรุณาระบุ${purposeField.label}`, 'e'); return; }
    if (bookForStudent && !students.length) { showToast('กรุณาเพิ่มรายชื่อนักศึกษาอย่างน้อย 1 คน', 'e'); return; }
    if (isOutOfHours && (!roomResponsibleName.trim() || !roomResponsiblePhone.trim())) { showToast('กรุณาเลือกผู้เปิด-ปิดห้องและกรอกเบอร์โทร (นอกเวลาทำการ)', 'e'); return; }

    const finalPurpose = purposeWithDetail(purpose, purposeDetail);
    const equipmentSummary = equipmentOptions
      .filter((opt) => (facility.equipment[opt.k] || 0) > 0)
      .map((opt) => `${opt.nm} ${facility.equipment[opt.k]}`);
    const foodCounts = {};
    facility.food.forEach((f) => { foodCounts[f] = (foodCounts[f] || 0) + 1; });
    const foodSummary = Object.entries(foodCounts).map(([name, qty]) => foodLabel(name, qty));
    const participatingTeacherNames = needsTeacherListAndFood
      ? [...(bookForStudent && bookerAttends ? [`${user.name} (ผู้จอง)`] : []), ...PARTICIPATING_TEACHERS.filter((name, i) => teacherChecked[i] && isOtherTeacher(name))]
      : [];

    const rows = [
      ['ผู้จอง', user.name],
      ['ห้อง', `ห้อง ${roomId}`],
      ['วันที่', isMultiDay
        ? `${modeLabel} · ${formatDateSpan(bookingDays)}`
        : formatDateDMY(bookingDays[0] || date)],
      ['เวลา', isMultiDay ? `${start} – ${end} (ทุกวัน)` : `${start} – ${end}`],
      ['วัตถุประสงค์', finalPurpose],
      ['จำนวนผู้เข้าร่วม', `${participants} คน`],
      ...(isOutOfHours ? [['ผู้เปิด-ปิดห้อง (นอกเวลาราชการ)', `${roomResponsibleName.trim() || '-'} (${roomResponsiblePhone.trim() || '-'})`]] : []),
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

        {isMultiDay && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '6px' }}>วันที่จอง ({bookingDays.length} วัน)</div>
            {chipList(bookingDays.map((d) => formatDateDMY(d)))}
          </div>
        )}

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

        {facilityAvailable && equipmentSummary.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '6px' }}>อุปกรณ์เพิ่มเติม</div>
            {chipList(equipmentSummary)}
          </div>
        )}

        {facilityAvailable && foodSummary.length > 0 && (
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

        {facilityAvailable && facility.facilityNote?.trim() && (
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
    if (maxDateStr && lastDate > maxDateStr) { showToast(`จองล่วงหน้าได้ไม่เกิน ${maxAdvanceDays} วัน`, 'e'); return; }
    if (bookingDays.length > MAX_BOOKING_DAYS) { showToast(`จองได้ไม่เกิน ${MAX_BOOKING_DAYS} วันต่อครั้ง (ตอนนี้ ${bookingDays.length} วัน)`, 'e'); return; }
    if (!bookingDays.length) { showToast('ช่วงวันที่เลือกไม่มีวันที่ตรงกับที่เลือก', 'e'); return; }
    if (repeatError) { showToast(repeatError, 'e'); return; }
    if (!purposeDetail.trim()) { showToast(`กรุณาระบุ${purposeField.label}`, 'e'); return; }
    if (bookForStudent && !students.length) { showToast('กรุณาเพิ่มรายชื่อนักศึกษาอย่างน้อย 1 คน', 'e'); return; }
    if (isOutOfHours && (!roomResponsibleName.trim() || !roomResponsiblePhone.trim())) { showToast('กรุณาเลือกผู้เปิด-ปิดห้องและกรอกเบอร์โทร (นอกเวลาทำการ)', 'e'); return; }

    const finalPurpose = purposeWithDetail(purpose, purposeDetail);
    const participatingTeachers = [
      ...(bookForStudent && bookerAttends ? [user.name] : []),
      ...PARTICIPATING_TEACHERS.filter((name, i) => teacherChecked[i] && isOtherTeacher(name)),
    ];
    const bookingForStudents = bookForStudent ? [...students] : [];
    const facilityPayload = facilityAvailable
      // Only items still offered — a template can carry a key Staff has
      // since removed.
      ? { equipment: Object.fromEntries(equipmentOptions.map((e) => [e.k, facility.equipment[e.k] || 0])), food: [...facility.food], facilityNote: facility.facilityNote }
      : null;
    const roomResponsible = isOutOfHours
      ? { type: isSelfResponsible ? 'self' : 'other', name: roomResponsibleName.trim(), phone: roomResponsiblePhone.trim() }
      : null;

    showToast('กำลังบันทึก...', 'i');
    try {
      const result = await createBookingUseCase.execute({
        // Any repeat is sent as its rule (even if it leaves one day), so the
        // backend books exactly the days shown on the calendar.
        room: roomId, date,
        endDate: multiDay ? lastDate : undefined, skipNonWorkingDays: multiDay && (mode === 'weekly' || skipWeekends),
        weekdays: multiDay && activeWeekdays.length ? activeWeekdays : undefined,
        excludeDates: multiDay && activeRemoved.length ? activeRemoved : undefined,
        start, end, purpose: finalPurpose, participants, note, participatingTeachers, bookingForStudents, facility: facilityPayload, roomResponsible,
      });

      if (!result.success) {
        showConflictModal(result.conflict, { room: roomId, date, dates: bookingDays, start, end });
        return;
      }

      const snapshot = {
        // The bare purpose, so a template made from this re-selects it in the
        // dropdown; the detail differs booking to booking.
        room: roomId, purpose: purpose === OTHER_PURPOSE ? finalPurpose : purpose, participants, note,
        equipment: facilityPayload ? { ...facilityPayload.equipment } : {},
        food: facilityPayload ? [...facilityPayload.food] : [],
        facilityNote: facilityPayload ? facilityPayload.facilityNote : '',
        participatingTeachers: [...participatingTeachers],
      };
      setLastBookingSnapshot(snapshot);
      if (result.bookings.length > 1) {
        result.booking.groupDays = result.bookings.map((b) => ({ id: b.id, date: b.date, status: b.status, isOutOfHours: b.isOutOfHours }));
      }
      showSuccessModal(result.booking, result.autoApproved, snapshot);

      facility.reset({}, []);
      setStudents([]);
      setBookForStudent(false);
      setBookerAttends(false);
      setRoomResponsibleName('');
      setRoomResponsiblePhone('');
    } catch (err) {
      showToast(err.message || 'จองไม่สำเร็จ', 'e');
    }
  }

  // Keeps the currently selected room visible in the dropdown even when
  // it falls outside the freshly computed "available for this date/time"
  // list (e.g. a template's room before the user has picked a real date) —
  // otherwise the <select>'s value wouldn't match any rendered <option>
  // and it would silently render blank.
  // A busy selected room is already in busyRooms (labelled "ไม่ว่าง") — only
  // add it separately when it's in neither list, or it shows up twice.
  const busyRooms = roomRepository.getAll().filter((r) => r.status !== 'occupied' && !availableRooms.some((a) => a.id === r.id)).map((r) => ({ ...r, busy: true }));
  const selectedRoomNotListed = roomId && !availableRooms.some((r) => r.id === roomId) && !busyRooms.some((r) => r.id === roomId)
    ? roomRepository.findById(roomId)
    : null;
  const roomOptions = [...(selectedRoomNotListed ? [selectedRoomNotListed] : []), ...availableRooms, ...busyRooms];
  const selectedRoomBusy = Boolean(roomId) && busyRooms.some((r) => r.id === roomId);

  return (
    // Layout stays keyed to the role-level showFacilityPanel, not facilityAvailable —
    // toggling "จองแทนนักศึกษา" hides the facility panel's content but must not
    // resize/recenter the booking form itself.
    <div className="rsp-split" style={{ display: 'grid', gridTemplateColumns: showFacilityPanel ? 'minmax(0,1fr) minmax(0,420px)' : 'minmax(0,560px)', gap: '20px', alignItems: 'start', ...(showFacilityPanel ? {} : { margin: '0 auto' }) }}>

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
              {roomOptions.map((r) => {
                const place = [r.building?.name, `ชั้น ${r.floor}`].filter(Boolean).join(' · ');
                const label = place ? `${r.name} · ${place}` : r.name;
                return <option key={r.id} value={r.id}>{r.busy ? `${label} (ไม่ว่าง)` : label}</option>;
              })}
            </select>
            {(() => {
              const selectedRoom = roomOptions.find((r) => r.id === roomId);
              return selectedRoom?.building ? (
                <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#4A4F7A' }}>
                  📍 {selectedRoom.building.name} · ชั้น {selectedRoom.floor}
                </div>
              ) : null;
            })()}
            {selectedRoomBusy && (
              <div style={{ marginTop: '6px', background: '#FEF3C7', borderRadius: '7px', padding: '7px 11px', fontSize: '11px', color: '#92400e' }}>
                ห้องนี้ไม่ว่างในช่วงเวลาที่เลือก
                <div style={{ marginTop: '4px' }}>
                  <button type="button" className="btn btn-o" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={async () => {
                    try {
                      await container.repositories.bookingRepository.watchAvailability({ date, start, end, roomId });
                      showToast('จะแจ้งเตือนเมื่อห้องนี้ว่างในช่วงเวลานี้', 's');
                    } catch (err) {
                      showToast(err.message || 'ตั้งการแจ้งเตือนไม่สำเร็จ', 'e');
                    }
                  }}>แจ้งเมื่อห้องนี้ว่าง</button>
                </div>
              </div>
            )}
            {noRoomsHint && (
              <div style={{ marginTop: '6px', background: '#fef2f2', border: '.5px solid #fca5a5', borderRadius: '7px', padding: '7px 11px', fontSize: '11px', color: '#991b1b' }}>
                ไม่มีห้องว่างสำหรับวันและเวลาที่เลือก กรุณาเปลี่ยนวันที่หรือเวลาอื่น
                <div style={{ marginTop: '4px' }}>
                  <button type="button" className="btn btn-o" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={async () => {
                    try {
                      await container.repositories.bookingRepository.watchAvailability({ date, start, end });
                      showToast('จะแจ้งเตือนเมื่อมีห้องว่างในช่วงเวลานี้', 's');
                    } catch (err) {
                      showToast(err.message || 'ตั้งการแจ้งเตือนไม่สำเร็จ', 'e');
                    }
                  }}>แจ้งเมื่อมีห้องว่าง</button>
                </div>
              </div>
            )}
            {roomWarnMsg && (
              <div style={{ marginTop: '6px', background: '#FEF3C7', border: '.5px solid #fde68a', borderRadius: '7px', padding: '7px 11px', fontSize: '11px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{roomWarnMsg}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">รูปแบบการจอง</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[['single', 'วันเดียว'], ['range', 'หลายวันติดกัน'], ['weekly', `ซ้ำทุกสัปดาห์ (วัน${WEEKDAY_FULL[weekdayOfStart]})`]].map(([key, label]) => (
                <button key={key} type="button" className={`fchip${mode === key ? ' on' : ''}`} disabled={key === 'weekly' && maxWeeks < 2} onClick={() => changeMode(key)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="rsp-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">{mode === 'range' ? 'ตั้งแต่วันที่ *' : 'วันที่จอง *'}</label>
              <ThaiDateInput value={date} min={today} max={maxDateStr} onChange={(e) => changeStartDate(e.target.value)} />
            </div>
            {mode === 'range' && (
              <div className="form-group">
                <label className="form-label">ถึงวันที่ *</label>
                <ThaiDateInput value={rangeEnd} min={date} max={maxDateStr} onChange={(e) => setRangeEnd(e.target.value)} />
              </div>
            )}
            {mode === 'weekly' && (
              <div className="form-group">
                <label className="form-label">จำนวนสัปดาห์ *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="form-control"
                  min={2}
                  max={maxWeeks}
                  value={weeks}
                  // Whole weeks only: no minus sign, decimal point or exponent — typed or pasted.
                  onKeyDown={(e) => { if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) e.preventDefault(); }}
                  onChange={(e) => setWeeks(e.target.value.replace(/\D/g, ''))} style={repeatError ? { borderColor: '#dc2626', background: '#fef2f2' } : undefined} />
              </div>
            )}
          </div>

          {mode !== 'single' && (
            <div style={{ marginTop: '-4px', marginBottom: '14px', fontSize: '11.5px', color: '#38419D', lineHeight: 1.6 }}>
              {mode === 'range' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4A4F7A', cursor: 'pointer', marginBottom: '4px' }}>
                  <input type="checkbox" checked={skipWeekends} onChange={(e) => setSkipWeekends(e.target.checked)} />
                  ข้ามวันเสาร์-อาทิตย์และวันหยุดราชการ
                </label>
              )}
              {repeatError
                ? <div style={{ background: '#fef2f2', border: '.5px solid #fca5a5', borderRadius: '7px', padding: '7px 11px', color: '#991b1b', fontWeight: 600 }}>⚠ {repeatError}</div>
                : <div>จอง {bookingDays.length} {mode === 'weekly' ? 'ครั้ง' : 'วัน'}: {formatDayList(bookingDays)}</div>}
              {!repeatError && skippedDays.length > 0 && <div style={{ color: '#991b1b' }}>{mode === 'range' ? 'ข้าม (เสาร์-อาทิตย์/วันหยุด)' : 'ข้าม (วันหยุด)'}: {formatDayList(skippedDays)}</div>}
              {!repeatError && activeRemoved.length > 0 && <div style={{ color: '#8890B5' }}>เอาออกเอง: {formatDayList([...activeRemoved].sort())}</div>}
              {(!repeatError || activeRemoved.length > 0) && <BookingDaysCalendar booked={bookingDays} skipped={skippedDays} removed={activeRemoved} holidays={holidayNames} onToggle={toggleRemoved} />}
              <div style={{ color: '#8890B5' }}>
                {mode === 'weekly' ? `ได้สูงสุด ${maxWeeks} สัปดาห์ · ` : ''}จองล่วงหน้าได้ไม่เกิน {maxAdvanceDays} วัน · ทุกวันต้องว่างจึงจะจองได้ · อนุมัติ/ปฏิเสธพร้อมกันทั้งชุด
              </div>
            </div>
          )}

          <div className="rsp-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">เวลาเริ่มต้น *</label>
              {startSlots.length ? (
                <select className="form-control" value={start} onChange={(e) => { setStart(e.target.value); setEnd(oneHourAfter(e.target.value)); }}>
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
              <select className="form-control" value={end} onChange={(e) => setEnd(e.target.value)} disabled={!startSlots.length || start >= LAST_END_SLOT}>
                {timeEndOptions.filter((t) => t > start).map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {startSlots.length > 0 && start < end && (
            <div style={{ fontSize: '11px', color: '#4A4F7A', marginTop: '4px' }}>ระยะเวลาการจอง: {durationLabel(start, end)}</div>
          )}

          <div className="rsp-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">จำนวนผู้เข้าร่วม</label>
              <QtyInput
                className="form-control"
                value={participants}
                min={1}
                max={20}
                disabled={autoParticipants}
                onCommit={setParticipants}
              />
              {autoParticipants && (
                <div style={{ fontSize: '10.5px', color: '#8890B5', marginTop: '4px' }}>
                  {[
                    needsTeacherListAndFood && 'นับจากรายชื่ออาจารย์ที่เข้าร่วมด้านล่าง',
                    bookForStudent && `นักศึกษา ${studentCount} คน`,
                    bookerCounted && 'ผู้จอง',
                  ].filter(Boolean).join(' + ')}
                  {bookForStudent && !studentCount && ' — เพิ่มรายชื่อนักศึกษาด้านล่าง'}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">วัตถุประสงค์ *</label>
            <select className="form-control" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {BOOKING_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
              {facilityAvailable && TEACHER_ONLY_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
              <option value={OTHER_PURPOSE}>{OTHER_PURPOSE}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{purposeField.label} *</label>
            <input type="text" className="form-control" value={purposeDetail} maxLength={200} placeholder={purposeField.placeholder} onChange={(e) => setPurposeDetail(e.target.value)} />
          </div>

          {showFacilityPanel && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#1A1D3A', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  style={{ accentColor: '#38419D' }}
                  checked={bookForStudent}
                  onChange={(e) => {
                    setBookForStudent(e.target.checked);
                    if (!e.target.checked) { setStudents([]); setBookerAttends(false); }
                  }}
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#1A1D3A', marginTop: '8px' }}>
                    <input type="checkbox" style={{ accentColor: '#38419D' }} checked={bookerAttends} onChange={(e) => setBookerAttends(e.target.checked)} />
                    ฉันเข้าร่วมด้วย <span style={{ color: '#8890B5' }}>(นับเป็นผู้เข้าร่วม และมีชื่อในแบบฟอร์มขอใช้ห้อง)</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {needsTeacherListAndFood && (
            <div className="form-group">
              <label className="form-label">รายชื่ออาจารย์ที่เข้าร่วม <span style={{ color: '#8890B5', fontWeight: 400 }}>(เลือกได้หลายคน)</span></label>
              <div style={{ border: '.5px solid #C2C7E0', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '6px 8px' }}>
                  {PARTICIPATING_TEACHERS.map((name, i) => isOtherTeacher(name) && (
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

          {isOutOfHours && (
            <div className="form-group">
              <label className="form-label">ผู้รับผิดชอบเปิด-ปิดห้อง * <span style={{ color: '#8890B5', fontWeight: 400 }}>(นอกเวลาทำการ ต้องระบุผู้รับผิดชอบและเบอร์ติดต่อ)</span></label>
              {/* Yourself or a staff member, picked from the dropdown. The phone is still typed: users have no phone on file. */}
              <select className="form-control" style={{ marginBottom: '8px' }} value={roomResponsibleName} onChange={(e) => setRoomResponsibleName(e.target.value)}>
                <option value="">-- เลือกผู้เปิด-ปิดห้อง --</option>
                {responsibleChoices.map((c) => <option key={c.key} value={c.name}>{c.name} ({c.hint})</option>)}
              </select>
              <input type="tel" inputMode="numeric" maxLength={10} className="form-control" placeholder={roomResponsibleName ? `เบอร์โทรติดต่อของ ${roomResponsibleName} *` : 'เบอร์โทรติดต่อ *'} value={roomResponsiblePhone} onChange={(e) => setRoomResponsiblePhone(e.target.value.replace(/\D/g, ''))} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button onClick={openConfirmModal} disabled={!startSlots.length || slotClash} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#2A2262,#38419D)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun,sans-serif', letterSpacing: '.02em', opacity: startSlots.length ? 1 : .5 }}>ยืนยันการจอง</button>
            <button onClick={() => navigate('rooms')} style={{ padding: '12px 18px', background: '#F4F5FA', color: '#4A4F7A', border: '.5px solid #D8DBF0', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'Sarabun,sans-serif' }}>ยกเลิก</button>
          </div>
        </div>
      </div>

      {facilityAvailable && (
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
                equipmentOptions={equipmentOptions}
                equipment={facility.equipment}
                onEquipmentDelta={facility.setEquipmentQty}
                onEquipmentSet={facility.setEquipmentValue}
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
