import { useState } from 'react';
import { container } from '../../shared/di/container.js';
import { getRoomColor } from '../../shared/constants.js';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { useBookingDetailModal } from '../components/BookingDetailModal.jsx';
import { useRejectReasonModal } from '../hooks/useRejectReasonModal.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { bookingRepository } = container.repositories;
const { approveRejectBookingUseCase } = container.useCases;

/** Queue of pending bookings — visible to anyone holding a can_approve management position. */
export function ApprovalsView() {
  const { showToast } = useToast();
  const { show: showBookingDetail } = useBookingDetailModal();
  const { askRejectReason } = useRejectReasonModal();
  const [pending, setPending] = useState([]);
  const { loading, error, refetch } = useRepository(async () => {
    setPending(await bookingRepository.getPending());
  });

  async function approve(id) {
    try {
      await approveRejectBookingUseCase.approve(id);
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
          <div className="ap-card" key={b.id} onClick={() => showBookingDetail(b.id)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '3px' }}>{b.user}</div>
                <div style={{ fontSize: '11px', color: '#8890B5', marginBottom: '8px' }}>{b.title}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="chip" style={{ background: getRoomColor(b.room).bg, color: getRoomColor(b.room).text }}>ห้อง {b.room}</span><span className="chip chip-a">{b.date}</span><span className="chip chip-a">{b.time}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                <button className="btn btn-s" onClick={(e) => { e.stopPropagation(); approve(b.id); }}>อนุมัติ</button>
                <button className="btn btn-d" onClick={(e) => { e.stopPropagation(); reject(b.id); }}>ปฏิเสธ</button>
              </div>
            </div>
          </div>
        ))}
    </>
  );
}
