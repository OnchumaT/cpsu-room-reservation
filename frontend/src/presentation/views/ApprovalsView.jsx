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
import { formatDateDMY } from '../../shared/dateFormat.js';

const { bookingRepository } = container.repositories;
const { approveRejectBookingUseCase } = container.useCases;

/** Queue of pending bookings — visible to anyone holding a can_approve management position. */
export function ApprovalsView() {
  const { showToast } = useToast();
  const { openModal, closeModal } = useModal();
  const { show: showBookingDetail } = useBookingDetailModal();
  const { askRejectReason } = useRejectReasonModal();
  const [pending, setPending] = useState([]);
  const { loading, error, refetch } = useRepository(async () => {
    setPending(await bookingRepository.getPending());
  });
  const { takeApprovalFocus } = useAppShell();
  const [focusId] = useState(() => takeApprovalFocus());
  useEffect(() => {
    if (!focusId || !pending.length) return;
    document.querySelector(`[data-booking-id="${focusId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [pending, focusId]);

  function approve(booking) {
    if (!booking.isOutOfHours) return submitApproval(booking.id);
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

  return (
    <>
      <div className="sec-hdr"><span className="sec-ttl">คิวรออนุมัติ ({pending.length})</span></div>
      {!pending.length
        ? <div style={{ textAlign: 'center', padding: '40px', color: '#8890B5' }}>ไม่มีรายการรออนุมัติ</div>
        : pending.map((b) => (
          <div className="ap-card" key={b.id} data-booking-id={b.id} onClick={() => showBookingDetail(b.id)} style={{ cursor: 'pointer', ...(String(b.id) === String(focusId) ? { outline: '2px solid #38419D' } : {}) }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '3px' }}>{b.user}</div>
                <div style={{ fontSize: '11px', color: '#8890B5', marginBottom: '8px' }}>{b.title}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="chip" style={{ background: getRoomColor(b.room).bg, color: getRoomColor(b.room).text }}>ห้อง {b.room}</span><span className="chip chip-a">{formatDateDMY(b.date)}</span><span className="chip chip-a">{b.time}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                <button className="btn btn-s" onClick={(e) => { e.stopPropagation(); approve(b); }}>อนุมัติ</button>
                <button className="btn btn-d" onClick={(e) => { e.stopPropagation(); reject(b.id); }}>ปฏิเสธ</button>
              </div>
            </div>
          </div>
        ))}
    </>
  );
}
