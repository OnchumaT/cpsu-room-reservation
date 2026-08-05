import { useState } from 'react';
import { IC } from '../../shared/icons.js';
import { HISTORY_EDIT_EQUIPMENT_OPTIONS, getRoomColor } from '../../shared/constants.js';
import { localDateStr } from '../../shared/dateUtils.js';
import { BookingPermissionPolicy } from '../../domain/policies/BookingPermissionPolicy.js';
import { container } from '../../shared/di/container.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { useFacilityRequestFields } from '../hooks/useFacilityRequestFields.js';
import { FacilityRequestFields } from '../components/FacilityRequestFields.jsx';
import { useBookingDetailModal } from '../components/BookingDetailModal.jsx';
import { StatusChip } from '../components/StatusChip.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const EDIT_TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const STATUS_FILTERS = [
  ['all', 'ทั้งหมด'], ['approved', 'อนุมัติแล้ว'], ['pending', 'รอดำเนินการ'],
  ['rejected', 'ปฏิเสธ'], ['cancelled', 'ยกเลิก'],
];

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
        กำลังแก้ไข: <strong>ห้อง {booking.room}</strong> · {booking.date} · {booking.time}
      </div>
      <div className="form-group">
        <label className="form-label">วันที่ *</label>
        <input type="date" className="form-control" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
  const canEdit = role === 'teacher' || role === 'student';
  const canRequestFacilities = BookingPermissionPolicy.canRequestFacilities(role, canApprove);
  const today = localDateStr();

  const all = bookingRepository.getAll();
  // isStaffGroup (staff/admin, or a teacher holding a can_approve position)
  // reviews everyone's bookings — the requester column below is what makes
  // that legible. Everyone else only ever sees their own, by actual
  // identity (userId), not by role (a booking's `role` is just its
  // requester-type, shared by every teacher/student in the system).
  // Staff's "จัดการการจอง" and admin's "การจองทั้งหมด" both exclude student
  // bookings (a view-only filter, same as UsersView's student filter).
  const mine = isStaffGroup ? all.filter((b) => b.role !== 'student') : all.filter((b) => String(b.userId) === String(user.id));
  const rows = mine.filter((b) => filterStatus === 'all' || b.status === filterStatus);

  // Ordered by when the booking was made (most recently submitted first),
  // not by the booked date/time — matches how a personal activity list
  // reads, rather than a schedule.
  const byRecentlyCreated = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
  const upcoming = [...rows].filter((b) => b.date >= today).sort(byRecentlyCreated);
  const past = [...rows].filter((b) => b.date < today).sort(byRecentlyCreated);

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

  async function cancelBooking(id) {
    if (!confirm('ต้องการยกเลิก?')) return;
    try {
      await cancelBookingUseCase.execute({ bookingId: id });
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
    const reason = prompt('เหตุผลที่ปฏิเสธ:');
    if (!reason?.trim()) return;
    try {
      await approveRejectBookingUseCase.reject(id, reason.trim());
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

  function Row({ b, isPast }) {
    const dim = isPast ? '#8890B5' : '#1A1D3A';
    const rc = getRoomColor(b.room);
    const isOwnPendingEditable = canEdit && b.isPending() && String(b.userId) === String(user.id);
    return (
      <tr onClick={() => showBookingDetail(b.id)} style={{ cursor: 'pointer' }}>
        <td style={{ fontWeight: 600, color: isPast ? '#8890B5' : '#38419D' }}>{b.id}</td>
        <td style={{ whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: rc.bg, color: rc.text, opacity: isPast ? .75 : 1 }}>ห้อง {b.room}</span>
        </td>
        {isStaffGroup && <td style={{ whiteSpace: 'nowrap', color: dim }}>{b.user}</td>}
        <td style={{ whiteSpace: 'nowrap', color: dim }}>{b.date}</td>
        <td style={{ whiteSpace: 'nowrap', color: dim }}>{b.time}</td>
        <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: dim }}>{b.title}</td>
        <td><StatusChip status={b.status} /></td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            {!isPast && isOwnPendingEditable && (
              <button style={{ padding: '6px 13px', fontSize: '12px', background: '#EEF0FF', color: '#38419D', border: '1px solid #c7cbf0', borderRadius: '7px', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); editBooking(b); }}>แก้ไข</button>
            )}
            {!isPast && !isOwnPendingEditable && canApprove && b.isPending() && (
              <>
                <button className="btn btn-s" style={{ padding: '6px 13px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); approveBooking(b.id); }}>อนุมัติ</button>
                <button className="btn btn-d" style={{ padding: '6px 13px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); rejectBooking(b.id); }}>ปฏิเสธ</button>
              </>
            )}
            {!isPast && !isOwnPendingEditable && !(canApprove && b.isPending()) && isStaff && b.isApproved() && (
              <button className="btn btn-d" style={{ padding: '6px 13px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); cancelBooking(b.id); }}>ยกเลิก</button>
            )}
            {!isPast && !isOwnPendingEditable && !(canApprove && b.isPending()) && !isStaff && !isStaffGroup && (b.isPending() || b.isApproved()) && (
              <button className="btn btn-d" style={{ padding: '6px 13px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); cancelBooking(b.id); }}>ยกเลิก</button>
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
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: '64px' }}>รหัส</th><th style={{ width: '80px' }}>ห้อง</th>{isStaffGroup && <th style={{ width: '150px' }}>ผู้จอง</th>}
                  <th style={{ width: '100px' }}>วันที่</th><th style={{ width: '100px' }}>เวลา</th><th>วัตถุประสงค์</th><th style={{ width: '90px' }}>สถานะ</th><th style={{ width: '230px' }}>ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>{list.map((b) => <Row key={b.id} b={b} isPast={isPast} />)}</tbody>
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
        <span className="sec-ttl">ประวัติการจอง ({mine.length})</span>
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
      <Section title="ผ่านไปแล้ว" dotColor="#C2C7E0" list={past} isPast />
    </>
  );
}
