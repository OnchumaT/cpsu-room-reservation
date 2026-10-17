import { bookingStatusLongLabel } from '../formatters/statusLabels.js';
import { BOOKING_EQUIPMENT_OPTIONS } from '../../shared/constants.js';
import { container } from '../../shared/di/container.js';
import { useModal } from '../context/ModalContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { printBookingReceipt } from '../print/printBookingReceipt.js';
import { printRoomNotice } from '../print/printRoomNotice.js';
import { printFacultyMemo } from '../print/printFacultyMemo.js';
import { formatDateDMY } from '../../shared/dateFormat.js';

const ROLE_LABEL = { teacher: 'อาจารย์', staff: 'เจ้าหน้าที่', admin: 'ผู้ดูแล' };
const STATUS_COLOR = { approved: '#166534', pending: '#92400e', rejected: '#991b1b', cancelled: '#4A4F7A', expired: '#4A4F7A' };
const STATUS_BG = { approved: '#dcfce7', pending: '#FEF3C7', rejected: '#fee2e2', cancelled: '#F4F5FA', expired: '#F4F5FA' };
const EQUIPMENT_NAMES = Object.fromEntries(BOOKING_EQUIPMENT_OPTIONS.map((e) => [e.k, e.nm]));
const EQUIPMENT_UNITS = { mic: 'ตัว', wb: 'แผ่น', ext: 'อัน', hdmi: 'เส้น' };

function ExtraSection({ title, items }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '6px' }}>{title}</div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0', borderBottom: '.5px solid #D8DBF0' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38419D', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#1A1D3A' }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

/** Read-only booking detail popup, reused by the Dashboard calendar,
 * History list, Approvals queue, and Notifications. */
export function useBookingDetailModal() {
  const { openModal, closeModal } = useModal();
  const { role } = useAuth();
  const { showToast } = useToast();

  async function show(bookingId) {
    // findById is a synchronous lookup against whatever's already in the
    // booking list cache — that cache is only populated once some other
    // page has fetched a bookings list this session, so a booking opened
    // straight from Notifications (or right after a fresh page load)
    // can easily not be in it yet. Fall back to fetching it directly
    // rather than silently doing nothing.
    const booking = container.repositories.bookingRepository.findById(bookingId)
      ?? await container.repositories.bookingRepository.fetchById(bookingId).catch(() => null);
    if (!booking) return;
    if (booking.redacted) {
      openModal(booking.isPending() ? 'มีคำขอจองรออนุมัติ' : 'ห้องไม่ว่าง',
        <>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '3px' }}>ห้อง {booking.room}</div>
          <div style={{ fontSize: '12px', color: '#4A4F7A' }}>{formatDateDMY(booking.date)} · {booking.time}</div>
          <div style={{ fontSize: '12px', color: '#4A4F7A', marginTop: '10px' }}>ดูรายละเอียดได้เฉพาะผู้จองและเจ้าหน้าที่ผู้เกี่ยวข้อง</div>
        </>,
        <button className="btn btn-o" onClick={closeModal}>ปิด</button>);
      return;
    }
    const roleLabel = ROLE_LABEL[booking.role] || booking.role;
    const statusLabel = bookingStatusLongLabel(booking.status);
    // Cancelled/rejected/expired bookings no longer hold the room — nothing to print for them.
    const canPrintReceipt = booking.isActive();
    // Printing the room-door notice is Staff's job specifically — not
    // admins or approvers, even though they can see everything else here.
    const canPrintRoomNotice = role === 'staff' && booking.isActive();
    // Same for the memo notifying the Dean of out-of-hours building use —
    // only makes sense once the booking has actually cleared approval.
    const canPrintFacultyMemo = role === 'staff' && booking.isOutOfHours && booking.status === 'approved';

    const rows = [
      ['ผู้จอง', booking.user],
      ['ประเภทผู้ใช้', roleLabel],
      ['วัตถุประสงค์', booking.title],
      ['วันที่', formatDateDMY(booking.date)],
      ['เวลา', booking.time],
      ['ผู้เปิด-ปิดห้อง', booking.roomResponsibleType === 'other'
        ? `${booking.roomResponsibleName} (${booking.roomResponsiblePhone})`
        : 'ผู้จองเอง'],
    ];

    const equipmentItems = Object.entries(booking.equipment)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => `${EQUIPMENT_NAMES[key] || key} ${qty} ${EQUIPMENT_UNITS[key] || 'ชิ้น'}`);

    const studentItems = (booking.bookingForStudents || []).map((s) => `${s.name} (${s.studentId})`);

    openModal(
      'รายละเอียดการจอง',
      <>
        <div style={{ background: 'linear-gradient(135deg,#2A2262,#38419D)', borderRadius: '10px', padding: '14px 16px', color: 'white', marginBottom: '14px' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '3px' }}>ห้อง {booking.room}</div>
          <div style={{ fontSize: '12px', opacity: .8 }}>{formatDateDMY(booking.date)} · {booking.time}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid #D8DBF0' }}>
              <span style={{ fontSize: '11px', color: '#8890B5', fontWeight: 500 }}>{k}</span>
              <span style={{ fontSize: '12px', color: '#1A1D3A', fontWeight: 500, textAlign: 'right', maxWidth: '220px' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid #D8DBF0' }}>
            <span style={{ fontSize: '11px', color: '#8890B5', fontWeight: 500 }}>สถานะ</span>
            <span style={{ background: STATUS_BG[booking.status], color: STATUS_COLOR[booking.status], padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 500 }}>{statusLabel}</span>
          </div>
        </div>
        <ExtraSection title="รายชื่ออาจารย์ที่เข้าร่วม" items={booking.participatingTeachers} />
        <ExtraSection title="จองแทนนักศึกษา" items={studentItems} />
        <ExtraSection title="ขอสิ่งอำนวยความสะดวกเพิ่มเติม" items={equipmentItems} />
        <ExtraSection title="อาหารและน้ำ" items={booking.food} />
        {canPrintRoomNotice && (
          <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '9px 12px', fontSize: '11px', color: '#38419D', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38419D" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            พิมพ์เพื่อนำไปแปะที่หน้าห้อง {booking.room}
          </div>
        )}
        {canPrintFacultyMemo && (
          <div style={{ background: '#FEF3C7', borderRadius: '8px', padding: '9px 12px', fontSize: '11px', color: '#92400e', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            การจองนี้นอกเวลาราชการ — พิมพ์บันทึกข้อความแจ้งคณบดีคณะวิทยาศาสตร์
          </div>
        )}
      </>,
      <>
        <button className="btn btn-o" style={{ padding: '6px 10px' }} onClick={closeModal}>ปิด</button>
        {canPrintReceipt && (
          <button className="btn btn-o" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => printBookingReceipt(booking)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A4F7A" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            PDF
          </button>
        )}
        {role === 'staff' && booking.isOutOfHours && booking.status === 'approved' && (
          <button className="btn btn-o" onClick={() => openFacultyResultModal(booking)}>บันทึกผลคณบดี</button>
        )}
        {canPrintRoomNotice && (
          <button className="btn btn-p" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => printRoomNotice(booking)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            ป้ายหน้าห้อง
          </button>
        )}
        {canPrintFacultyMemo && (
          <button className="btn btn-p" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => printFacultyMemo(booking)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            แจ้งคณะ
          </button>
        )}
      </>,
    );
  }

  // Staff records what the Dean decided on the memo for an approved out-of-hours booking.
  function openFacultyResultModal(booking) {
    const form = { result: 'approved', note: '' };
    openModal('บันทึกผลการแจ้งคณบดี',
      <>
        <div style={{ fontSize: '12px', color: '#1A1D3A', marginBottom: '8px' }}>ห้อง {booking.room} · {formatDateDMY(booking.date)} · {booking.time}</div>
        <select className="form-control" defaultValue="approved" onChange={(e) => { form.result = e.target.value; }}>
          <option value="approved">คณบดีรับทราบ/อนุมัติ</option>
          <option value="rejected">คณบดีไม่อนุมัติ</option>
        </select>
        <textarea className="form-control" placeholder="หมายเหตุ (ไม่บังคับ)" style={{ marginTop: '8px' }} onChange={(e) => { form.note = e.target.value; }} />
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ยกเลิก</button>
        <button className="btn btn-p" onClick={async () => {
          try {
            await container.repositories.bookingRepository.recordFacultyResult(booking.id, form);
            closeModal();
            showToast('บันทึกผลแล้ว และแจ้งผู้จองแล้ว', 's');
          } catch (err) {
            showToast(err.message || 'บันทึกผลไม่สำเร็จ', 'e');
          }
        }}>บันทึก</button>
      </>,
    );
  }

  return { show };
}
