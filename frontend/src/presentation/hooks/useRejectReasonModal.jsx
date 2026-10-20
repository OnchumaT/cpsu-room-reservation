import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isValidRejectReason, REJECT_REASON_HINT } from '../../domain/policies/RejectReasonPolicy.js';

const PRESET_REJECT_REASONS = [
  'ห้องไม่ว่างในช่วงเวลาที่ขอ (มีการจองอื่นทับซ้อน)',
  'ห้องปิดปรับปรุง/ซ่อมบำรุง',
  'ข้อมูลการจองไม่ครบถ้วนหรือไม่ชัดเจน',
  'วัตถุประสงค์ไม่เหมาะสมกับการใช้ห้องนี้',
];

/** Reject-reason picker — replaces the old prompt('เหตุผลที่ปฏิเสธ:') across
 * ApprovalsView/HistoryView/NotificationsView with a short list of canned
 * reasons (one click) plus a free-text fallback, so an approver doesn't
 * have to type the same reason out every time. */
export function useRejectReasonModal() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  /** @returns {Promise<string|null>} the reason, or null if cancelled. */
  function askRejectReason() {
    return new Promise((resolve) => {
      let customText = '';

      const finish = (reason) => {
        const trimmed = (reason || '').trim();
        if (!trimmed) { showToast('กรุณาเลือกหรือระบุเหตุผล', 'e'); return; }
        if (!isValidRejectReason(trimmed)) { showToast(REJECT_REASON_HINT, 'e'); return; }
        closeModal();
        resolve(trimmed);
      };
      const cancel = () => { closeModal(); resolve(null); };

      openModal(
        'เหตุผลที่ปฏิเสธ',
        <>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '8px' }}>เลือกเหตุผล</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {PRESET_REJECT_REASONS.map((r) => (
              <button
                key={r}
                className="btn btn-o"
                style={{ width: '100%', textAlign: 'left', padding: '9px 12px' }}
                onClick={() => finish(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">หรือระบุเหตุผลเอง</label>
            <input
              className="form-control"
              placeholder="พิมพ์เหตุผล..."
              autoFocus
              onChange={(e) => { customText = e.target.value; }}
              onKeyDown={(e) => { if (e.key === 'Enter') finish(customText); }}
            />
          </div>
        </>,
        <>
          <button className="btn btn-o" onClick={cancel}>ยกเลิก</button>
          <button className="btn btn-d" onClick={() => finish(customText)}>ปฏิเสธ</button>
        </>,
      );
    });
  }

  return { askRejectReason };
}
