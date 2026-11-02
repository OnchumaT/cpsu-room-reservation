import { container } from '../../shared/di/container.js';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const { approveRejectBookingUseCase } = container.useCases;

/**
 * Approve, from any approve button (ApprovalsView, NotificationsView,
 * HistoryView). An out-of-hours booking needs the approver to confirm who
 * opens/closes the room first — the backend says so (error details code
 * 'confirm-responsible', with that person's name/phone), so this asks
 * once and retries with the confirmation.
 */
export function useApproveBooking() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  /** @returns {Promise<boolean>} true once confirmed, false if cancelled. */
  function askConfirmResponsible({ name, phone }) {
    return new Promise((resolve) => {
      const confirmed = { value: false };
      const cancel = () => { closeModal(); resolve(false); };
      openModal('ยืนยันการอนุมัตินอกเวลาทำการ',
        <div style={{ fontSize: '12px', color: '#1A1D3A', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '8px' }}>ผู้รับผิดชอบเปิด-ปิดห้อง: <b>{name || '-'}</b> ({phone || '-'})</div>
          <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" style={{ accentColor: '#38419D' }} onChange={(e) => { confirmed.value = e.target.checked; }} />
            ยืนยันแล้วว่าผู้รับผิดชอบดังกล่าวจะเปิด-ปิดห้องและดูแลห้อง
          </label>
        </div>,
        <>
          <button className="btn btn-o" onClick={cancel}>ยกเลิก</button>
          <button className="btn btn-s" onClick={() => {
            if (!confirmed.value) { showToast('กรุณายืนยันผู้รับผิดชอบก่อนอนุมัติ', 'e'); return; }
            closeModal();
            resolve(true);
          }}>อนุมัติ</button>
        </>,
      );
    });
  }

  /** @returns {Promise<object|null>} the approve result, or null if the approver backed out. */
  async function approveBooking(bookingId) {
    try {
      return await approveRejectBookingUseCase.approve(bookingId);
    } catch (err) {
      if (err?.details?.code !== 'confirm-responsible') throw err;
      if (!(await askConfirmResponsible(err.details))) return null;
      return approveRejectBookingUseCase.approve(bookingId, { confirmResponsible: true });
    }
  }

  return { approveBooking };
}
