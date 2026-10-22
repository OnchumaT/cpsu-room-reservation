import { useState } from 'react';
import { IC } from '../../shared/icons.js';
import { HISTORY_EDIT_EQUIPMENT_OPTIONS, getRoomColor } from '../../shared/constants.js';
import { localDateStr } from '../../shared/dateUtils.js';
import { BookingPermissionPolicy } from '../../domain/policies/BookingPermissionPolicy.js';
import { TimeRange } from '../../domain/policies/TimeRange.js';
import { container } from '../../shared/di/container.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { useFacilityRequestFields } from '../hooks/useFacilityRequestFields.js';
import { FacilityRequestFields } from '../components/FacilityRequestFields.jsx';
import { useBookingDetailModal } from '../components/BookingDetailModal.jsx';
import { useRejectReasonModal } from '../hooks/useRejectReasonModal.jsx';
import { StatusChip } from '../components/StatusChip.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';
import { formatDateDMY } from '../../shared/dateFormat.js';
import { groupBookings } from '../formatters/bookingGroups.js';
import { bookingStatusLabel } from '../formatters/statusLabels.js';
import { ThaiDateInput } from '../components/ThaiDateInput.jsx';

// Every 5-minute slot of the day: out-of-hours bookings may start or end outside office hours.
const EDIT_TIMES = Array.from({ length: 288 }, (_, i) => `${String(Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`);

const STATUS_FILTERS = [
  ['all', 'ทั้งหมด'], ['approved', 'อนุมัติแล้ว'], ['pending', 'รอดำเนินการ'],
  ['rejected', 'ปฏิเสธ'], ['cancelled', 'ยกเลิก'],
];

// Same window the backend's pendingAlertJob warns Staff at.
const URGENT_PENDING_MS = 24 * 60 * 60 * 1000;

const { bookingRepository } = container.repositories;
const { editBookingUseCase, cancelBookingUseCase, approveRejectBookingUseCase, saveTemplateUseCase } = container.useCases;

function HistoryEditForm({ booking, canRequestFacilities, today, onCancel, onSave }) {
  const [startVal, endVal] = booking.time.split(/[–-]/);
  const [date, setDate] = useState(booking.date);
  const [start, setStart] = useState(startVal);
  const [end, setEnd] = useState(endVal);
  const [title, setTitle] = useState(booking.title);
  const [note, setNote] = useState(booking.note || '');
  const facility = useFacilityRequestFields(HISTORY_EDIT_EQUIPMENT_OPTIONS, {}, []);

  function handleSave() {
    if (!date || !start || !end || !title.trim()) { onSave.onError('กรุณากรอกข้อมูลให้ครบ'); return; }
    if (start >= end) { onSave.onError('เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น'); return; }
    onSave.onSubmit({
      date, start, end, title: title.trim(), note,
      facility: { equipment: { ...facility.equipment }, food: [...facility.food] },
    });
  }

  return (
    <>
      <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#38419D', marginBottom: '14px' }}>
        กำลังแก้ไข: <strong>ห้อง {booking.room}</strong> · {formatDateDMY(booking.date)} · {booking.time}
      </div>
      <div className="form-group">
        <label className="form-label">วันที่ *</label>
        <ThaiDateInput value={date} min={today} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="rsp-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div className="form-group">
          <label className="form-label">เวลาเริ่มต้น *</label>
          <select className="form-control" value={start} onChange={(e) => setStart(e.target.value)}>
            {EDIT_TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">เวลาสิ้นสุด *</label>
          <select className="form-control" value={end} onChange={(e) => setEnd(e.target.value)}>
            {EDIT_TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">เหตุผลการใช้ห้อง / วัตถุประสงค์ *</label>
        <input type="text" className="form-control" value={title} placeholder="ระบุวัตถุประสงค์..." onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">รายละเอียดเพิ่มเติม</label>
        <textarea className="form-control" rows="2" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {canRequestFacilities && (
        <>
          <div style={{ borderTop: '0.5px solid #D8DBF0', margin: '12px 0 10px' }} />
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>
            ขอสิ่งอำนวยความสะดวก <span style={{ fontSize: '10px', color: '#38419D', fontWeight: 400 }}>(เฉพาะอาจารย์)</span>
          </div>
          <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#38419D', marginBottom: '10px' }}>เมื่อบันทึก เจ้าหน้าที่จะได้รับแจ้งเตือนทันที</div>
          <FacilityRequestFields
            variant="compact"
            equipmentOptions={HISTORY_EDIT_EQUIPMENT_OPTIONS}
            equipment={facility.equipment}
            onEquipmentDelta={facility.setEquipmentQty}
            onEquipmentSet={facility.setEquipmentValue}
            food={facility.food}
            onAddFood={facility.addFood}
            onRemoveFood={facility.removeFood}
          />
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        <button className="btn btn-o" onClick={onCancel}>ยกเลิก</button>
        <button className="btn btn-p" onClick={handleSave}>บันทึกการแก้ไข</button>
      </div>
    </>
  );
}

export function HistoryView() {
  const { role, canApprove, user } = useAuth();
  const { navigate } = useAppShell();
  const { openModal, closeModal } = useModal();
  const { askRejectReason } = useRejectReasonModal();
  const { showToast } = useToast();
  const { show: showBookingDetail } = useBookingDetailModal();
  const { loading, error, refetch } = useRepository(() => bookingRepository.refresh());
  const [filterStatus, setFilterStatus] = useState('all');

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  // Only staff/admin see everyone's bookings here — a can_approve teacher
  // (department head/deputy) sees their own booking history only, same as
  // any other teacher. Reviewing *other* people's pending requests happens
  // on the dedicated "คิวอนุมัติ" queue; department-wide oversight of past
  // decisions lives on "ประวัติการอนุมัติ" (ApprovalHistoryView).
  const isStaffGroup = ['staff', 'admin'].includes(role);
  const isStaff = role === 'staff';
  const canEdit = role === 'teacher';
  const canRequestFacilities = BookingPermissionPolicy.canRequestFacilities(role, canApprove);
  const today = localDateStr();

  // Others' redacted bookings are for the calendar only, never history rows.
  const all = bookingRepository.getAll().filter((b) => !b.redacted);
  // isStaffGroup (staff/admin, or a teacher holding a can_approve position)
  // reviews everyone's bookings — the requester column below is what makes
  // that legible. Everyone else only ever sees their own, by actual
  // identity (userId).
  const mine = isStaffGroup ? all : all.filter((b) => String(b.userId) === String(user.id));
  const rows = mine.filter((b) => filterStatus === 'all' || b.status === filterStatus);

  // Ordered by when the booking was made (most recently submitted first),
  // not by the booked date/time — matches how a personal activity list
  // reads, rather than a schedule.
  const byRecentlyCreated = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
  // A booking moves from "กำลังจะถึง" to "ผ่านไปแล้ว" once its end time passes
  // today, not just once its date passes — date-only comparison left it
  // sitting in "กำลังจะถึง" for the rest of the day after it was already over.
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isUpcoming = (b) => b.date > today || (b.date === today && TimeRange.fromLabel(b.time).end > nowTime);
  // A multi-day booking is one row (its days collapsed — see groupBookings),
  // acted on through `b`: its next day still to come that still holds the
  // room, else its last day. "กำลังจะถึง" is only for bookings that will
  // still use the room (pending/approved, not yet over) — rejected,
  // cancelled, expired and no-show ones go to the lower section even when
  // their date is still ahead.
  const isLive = (d) => d.isPending() || d.isApproved();
  const entries = groupBookings(rows).map(({ key, days }) => {
    const next = days.find((d) => isLive(d) && isUpcoming(d));
    return { key, days, b: next || days[days.length - 1], upcoming: Boolean(next) };
  });
  const byEntryCreated = (x, y) => byRecentlyCreated(x.b, y.b);
  // Only the critical ones jump the queue: still pending and starting within
  // URGENT_PENDING_MS (when the backend's pendingAlertJob warns Staff) —
  // soonest first. Everything else, other pending bookings included, by when made.
  const startsAt = (b) => new Date(`${b.date}T${TimeRange.fromLabel(b.time).start}:00`).getTime();
  const isUrgentPending = (b) => b.isPending() && startsAt(b) - Date.now() <= URGENT_PENDING_MS;
  const byPendingFirst = (x, y) => {
    const ux = isUrgentPending(x.b);
    const uy = isUrgentPending(y.b);
    if (ux !== uy) return ux ? -1 : 1;
    return ux ? startsAt(x.b) - startsAt(y.b) : byEntryCreated(x, y);
  };
  const upcoming = entries.filter((e) => e.upcoming).sort(byPendingFirst);
  const past = entries.filter((e) => !e.upcoming).sort(byEntryCreated);

  function editBooking(booking) {
    openModal(
      `แก้ไขการจอง ${booking.id}`,
      <HistoryEditForm
        booking={booking}
        canRequestFacilities={canRequestFacilities}
        today={today}
        onCancel={closeModal}
        onSave={{
          onError: (msg) => showToast(msg, 'e'),
          onSubmit: async (payload) => {
            try {
              const result = await editBookingUseCase.execute({ bookingId: booking.id, ...payload });
              closeModal();
              showToast('บันทึกการแก้ไขเรียบร้อยแล้ว', 's');
              refetch();
              if (result.notifiedStaff) setTimeout(() => showToast('แจ้งเตือนเจ้าหน้าที่เรียบร้อยแล้ว', 'i'), 600);
            } catch (err) {
              showToast(err.message || 'บันทึกไม่สำเร็จ', 'e');
            }
          },
        }}
      />,
      <></>,
    );
  }

  async function cancelBooking(b) {
    // A day of a multi-day booking: cancel just that day, or every remaining day.
    if (b.isMultiDay()) {
      openModal('ยกเลิกการจองหลายวัน',
        <div style={{ fontSize: '12px', color: '#1A1D3A', lineHeight: 1.6 }}>
          การจองนี้เป็นส่วนหนึ่งของการจองหลายวัน ต้องการยกเลิกเฉพาะ {formatDateDMY(b.date)} หรือยกเลิกทุกวันที่เหลือของชุดนี้?
        </div>,
        <>
          <button className="btn btn-o" onClick={closeModal}>ไม่ยกเลิก</button>
          <button className="btn btn-o" onClick={() => { closeModal(); submitCancel(b.id, 'single'); }}>เฉพาะวันนี้</button>
          <button className="btn btn-d" onClick={() => { closeModal(); submitCancel(b.id, 'group'); }}>ยกเลิกทั้งชุด</button>
        </>,
      );
      return;
    }
    if (!confirm('ต้องการยกเลิก?')) return;
    submitCancel(b.id, 'single');
  }

  async function submitCancel(id, scope) {
    try {
      await cancelBookingUseCase.execute({ bookingId: id, scope });
      showToast('ยกเลิกแล้ว', 'i');
      refetch();
    } catch (err) {
      showToast(err.message || 'ยกเลิกไม่สำเร็จ', 'e');
    }
  }

  async function approveBooking(id) {
    try {
      await approveRejectBookingUseCase.approve(id);
      showToast('อนุมัติแล้ว', 's');
      refetch();
    } catch (err) {
      showToast(err.message || 'อนุมัติไม่สำเร็จ', 'e');
    }
  }

  async function rejectBooking(id) {
    const reason = await askRejectReason();
    if (!reason) return;
    try {
      await approveRejectBookingUseCase.reject(id, reason);
      showToast('ปฏิเสธแล้ว', 'i');
      refetch();
    } catch (err) {
      showToast(err.message || 'ปฏิเสธไม่สำเร็จ', 'e');
    }
  }

  function saveAsTemplate(booking) {
    let nameValue = `${booking.title} · ห้อง ${booking.room}`;
    openModal(
      'บันทึกเป็นเทมเพลต',
      <div className="form-group">
        <label className="form-label">ชื่อเทมเพลต *</label>
        <input className="form-control" defaultValue={nameValue} placeholder="เช่น สอน CS301 ห้อง 1637" onChange={(e) => { nameValue = e.target.value; }} />
      </div>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ยกเลิก</button>
        <button
          className="btn btn-p"
          onClick={async () => {
            const name = nameValue.trim();
            if (!name) { showToast('กรุณาตั้งชื่อเทมเพลต', 'e'); return; }
            const snapshot = {
              room: booking.room,
              purpose: booking.title,
              participants: booking.participants,
              note: booking.note,
              equipment: { ...booking.equipment },
              food: [...booking.food],
              facilityNote: booking.facilityNote,
              participatingTeachers: [...booking.participatingTeachers],
            };
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

  function Row({ b, days, isPast }) {
    const dim = isPast ? '#8890B5' : '#1A1D3A';
    const rc = getRoomColor(b.room);
    const isGroup = days.length > 1;
    // Editing changes one day's date/time — not offered on a multi-day row.
    const isOwnPendingEditable = canEdit && !isGroup && b.isPending() && String(b.userId) === String(user.id);
    // Days by status, when they differ ("อนุมัติ 4 · ยกเลิก 1").
    const statusCounts = Object.entries(days.reduce((acc, d) => ({ ...acc, [d.status]: (acc[d.status] || 0) + 1 }), {}));
    return (
      <tr onClick={() => showBookingDetail(b.id)} style={{ cursor: 'pointer' }}>
        <td style={{ fontWeight: 600, color: isPast ? '#8890B5' : '#38419D' }}>{b.id}</td>
        <td style={{ whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: rc.bg, color: rc.text, opacity: isPast ? .75 : 1 }}>ห้อง {b.room}</span>
        </td>
        {isStaffGroup && <td style={{ whiteSpace: 'nowrap', color: dim }}>{b.user}</td>}
        <td style={{ whiteSpace: 'nowrap', color: dim }}>
          {isGroup ? (
            <>
              <div>{formatDateDMY(days[0].date)} –</div>
              <div>
                {formatDateDMY(days[days.length - 1].date)}
                <span title="จองหลายวัน" style={{ marginLeft: '6px', padding: '1px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: '#EEF0FF', color: '#38419D' }}>{days.length} วัน</span>
              </div>
            </>
          ) : formatDateDMY(b.date)}
        </td>
        <td style={{ whiteSpace: 'nowrap', color: dim }}>{b.time}</td>
        <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: dim }}>{b.title}</td>
        <td>
          <StatusChip status={b.status} />
          {!isPast && isUrgentPending(b) && (
            <div style={{ marginTop: '3px', fontSize: '10px', fontWeight: 600, color: '#991b1b', whiteSpace: 'nowrap' }}>ใกล้ถึงเวลา ยังไม่อนุมัติ</div>
          )}
          {statusCounts.length > 1 && (
            <div style={{ fontSize: '10px', color: '#8890B5', marginTop: '3px', whiteSpace: 'nowrap' }}>
              {statusCounts.map(([st, n]) => `${bookingStatusLabel(st)} ${n}`).join(' · ')}
            </div>
          )}
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            {!isPast && isOwnPendingEditable && (
              <>
                <button style={{ padding: '6px 13px', fontSize: '12px', background: '#EEF0FF', color: '#38419D', border: '1px solid #c7cbf0', borderRadius: '7px', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); editBooking(b); }}>แก้ไข</button>
                <button className="btn btn-d" style={{ padding: '6px 13px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); cancelBooking(b); }}>ยกเลิก</button>
              </>
            )}
            {!isPast && !isOwnPendingEditable && canApprove && b.isPending() && (
              <>
                <button className="btn btn-s" style={{ padding: '6px 13px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); approveBooking(b.id); }}>อนุมัติ</button>
                <button className="btn btn-d" style={{ padding: '6px 13px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); rejectBooking(b.id); }}>ปฏิเสธ</button>
              </>
            )}
            {!isPast && !isOwnPendingEditable && !(canApprove && b.isPending()) && isStaff && b.isApproved() && (
              <button className="btn btn-d" style={{ padding: '6px 13px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); cancelBooking(b); }}>ยกเลิก</button>
            )}
            {!isPast && !isOwnPendingEditable && !(canApprove && b.isPending()) && !isStaff && !isStaffGroup && (b.isPending() || b.isApproved()) && (
              <button className="btn btn-d" style={{ padding: '6px 13px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); cancelBooking(b); }}>ยกเลิก</button>
            )}
            {String(b.userId) === String(user.id) && (
              <button
                title="บันทึกเป็นเทมเพลต"
                style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF0FF', color: '#38419D', border: 'none', borderRadius: '7px', cursor: 'pointer', opacity: isPast ? .75 : 1 }}
                onClick={(e) => { e.stopPropagation(); saveAsTemplate(b); }}
              >
                <span style={{ display: 'flex' }} dangerouslySetInnerHTML={{ __html: IC.bookmark }} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  function Section({ title, dotColor, list, isPast }) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '18px 0 10px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: isPast ? '#8890B5' : '#1A1D3A' }}>{title} ({list.length})</span>
        </div>
        {list.length ? (
          <div className="tbl-wrap" style={isPast ? { opacity: .75 } : undefined}>
            <table className="tbl tbl-compact">
              <thead>
                <tr>
                  <th style={{ width: '64px' }}>รหัส</th><th style={{ width: '80px' }}>ห้อง</th>{isStaffGroup && <th style={{ width: '150px' }}>ผู้จอง</th>}
                  <th style={{ width: '130px' }}>วันที่</th><th style={{ width: '100px' }}>เวลา</th><th>วัตถุประสงค์</th><th style={{ width: '90px' }}>สถานะ</th><th style={{ width: '230px' }}>ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>{list.map((e) => <Row key={e.key} b={e.b} days={e.days} isPast={isPast} />)}</tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#8890B5', fontSize: '12.5px', background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '12px' }}>ไม่มีรายการ</div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-ttl">ประวัติการจอง ({groupBookings(mine).length})</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {!isStaffGroup && <button className="btn btn-p" onClick={() => navigate('book')}>+ จองใหม่</button>}
        </div>
      </div>
      <div className="filter-row">
        {STATUS_FILTERS.map(([key, label]) => (
          <button key={key} className={`fchip${filterStatus === key ? ' on' : ''}`} onClick={() => setFilterStatus(key)}>{label}</button>
        ))}
      </div>
      <Section title="กำลังจะถึง" dotColor="#10b981" list={upcoming} isPast={false} />
      <Section title="ผ่านไปแล้ว / ปฏิเสธ / ยกเลิก" dotColor="#C2C7E0" list={past} isPast />
    </>
  );
}
