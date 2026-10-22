import { useEffect, useState } from 'react';
import { container } from '../../shared/di/container.js';
import { getRoomColor } from '../../shared/constants.js';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { useModal } from '../context/ModalContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useBookingDetailModal } from '../components/BookingDetailModal.jsx';
import { useRejectReasonModal } from '../hooks/useRejectReasonModal.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';
import { formatDateDMY, formatDateSpan } from '../../shared/dateFormat.js';
import { groupBookings } from '../formatters/bookingGroups.js';
import { MonthFilter, inMonth } from '../components/MonthFilter.jsx';

const { bookingRepository } = container.repositories;
const { approveRejectBookingUseCase } = container.useCases;

/** Queue of pending bookings — visible to anyone holding a can_approve management position. */
export function ApprovalsView() {
  const { showToast } = useToast();
  const { openModal, closeModal } = useModal();
  const { show: showBookingDetail } = useBookingDetailModal();
  const { askRejectReason } = useRejectReasonModal();
  const [pending, setPending] = useState([]);
  // Month of the booking's own date (the day the room is used), null = every month.
  const [month, setMonth] = useState(null);
  const { loading, error, refetch } = useRepository(async () => {
    setPending(await bookingRepository.getPending());
  });
  const { takeApprovalFocus } = useAppShell();
  const [focusId] = useState(() => takeApprovalFocus());
  useEffect(() => {
    if (!focusId || !pending.length) return;
    document.querySelector(`[data-booking-id="${focusId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [pending, focusId]);

  // `days`: every pending day of the booking (more than one for a multi-day
  // booking, which is approved as a set — the backend approves every day
  // that may be approved now, skipping out-of-hours days still awaiting the Dean).
  function approve(days) {
    const approvable = days.filter((d) => !d.awaitingDean());
    const booking = approvable[0];
    if (!approvable.some((d) => d.isOutOfHours)) return submitApproval(booking.id);
    const confirmed = { value: false };
    openModal('ยืนยันการอนุมัตินอกเวลาทำการ',
      <div style={{ fontSize: '12px', color: '#1A1D3A', lineHeight: 1.6 }}>
        <div style={{ marginBottom: '8px' }}>ผู้รับผิดชอบเปิด-ปิดห้อง: <b>{booking.roomResponsibleName || '-'}</b> ({booking.roomResponsiblePhone || '-'})</div>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
          <input type='checkbox' style={{ accentColor: '#38419D' }} onChange={(e) => { confirmed.value = e.target.checked; }} />
          ยืนยันแล้วว่าผู้รับผิดชอบดังกล่าวจะเปิด-ปิดห้องและดูแลห้อง
        </label>
      </div>,
      <>
        <button className='btn btn-o' onClick={closeModal}>ยกเลิก</button>
        <button className='btn btn-s' onClick={() => {
          if (!confirmed.value) { showToast('กรุณายืนยันผู้รับผิดชอบก่อนอนุมัติ', 'e'); return; }
          closeModal();
          submitApproval(booking.id, { confirmResponsible: true });
        }}>อนุมัติ</button>
      </>,
    );
  }

  async function submitApproval(id, options) {
    try {
      await approveRejectBookingUseCase.approve(id, options);
      showToast('อนุมัติแล้ว', 's');
      refetch();
    } catch (err) {
      showToast(err.message || 'อนุมัติไม่สำเร็จ', 'e');
    }
  }

  async function reject(id) {
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

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const shown = groupBookings(pending.filter((b) => inMonth(b.date, month)));
  const total = groupBookings(pending).length;

  return (
    <>
      <div className="sec-hdr"><span className="sec-ttl">คิวรออนุมัติ ({month ? `${shown.length} จาก ${total}` : total})</span></div>
      <div className="filter-row" style={{ alignItems: 'center' }}><MonthFilter value={month} onChange={setMonth} /></div>
      {!shown.length
        ? <div style={{ textAlign: 'center', padding: '40px', color: '#8890B5' }}>{month && pending.length ? 'ไม่มีรายการรออนุมัติในเดือนนี้' : 'ไม่มีรายการรออนุมัติ'}</div>
        : shown.map(({ key, days }) => {
          const b = days[0];
          const allAwaitingDean = days.every((d) => d.awaitingDean());
          const outOfHours = days.filter((d) => d.isOutOfHours);
          const awaitingDean = outOfHours.filter((d) => d.awaitingDean());
          const focused = days.some((d) => String(d.id) === String(focusId));
          return (
          <div className="ap-card" key={key} data-booking-id={focused ? focusId : b.id} onClick={() => showBookingDetail(b.id)} style={{ cursor: 'pointer', ...(focused ? { outline: '2px solid #38419D' } : {}) }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '3px' }}>{b.user}</div>
                <div style={{ fontSize: '11px', color: '#8890B5', marginBottom: '8px' }}>{b.title}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="chip" style={{ background: getRoomColor(b.room).bg, color: getRoomColor(b.room).text }}>ห้อง {b.room}</span><span className="chip chip-a">{days.length > 1 ? formatDateSpan(days.map((d) => d.date)) : formatDateDMY(b.date)}</span><span className="chip chip-a">{b.time}</span>
                  {days.length > 1 && <span className="chip" style={{ background: '#EEF0FF', color: '#38419D' }}>จองหลายวัน</span>}
                  {outOfHours.length > 0 && (awaitingDean.length
                    ? <span className="chip" style={{ background: '#FEF3C7', color: '#92400e' }}>นอกเวลา{days.length > 1 ? ` ${awaitingDean.length} วัน` : ''} · รอคณบดีอนุญาต</span>
                    : <span className="chip" style={{ background: '#dcfce7', color: '#166534' }}>นอกเวลา · คณบดีอนุญาตแล้ว</span>)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                {/* Out-of-hours: the Dean decides first — until then only rejecting is possible. */}
                <button className="btn btn-s" disabled={allAwaitingDean} title={allAwaitingDean ? 'ต้องรอคณบดีอนุญาตก่อน' : awaitingDean.length ? 'อนุมัติเฉพาะวันที่ไม่ต้องรอคณบดี' : undefined} style={allAwaitingDean ? { opacity: .45, cursor: 'not-allowed' } : undefined} onClick={(e) => { e.stopPropagation(); approve(days); }}>{days.length > 1 ? 'อนุมัติทั้งชุด' : 'อนุมัติ'}</button>
                <button className="btn btn-d" onClick={(e) => { e.stopPropagation(); reject(b.id); }}>{days.length > 1 ? 'ปฏิเสธทั้งชุด' : 'ปฏิเสธ'}</button>
              </div>
            </div>
          </div>
          );
        })}
    </>
  );
}
