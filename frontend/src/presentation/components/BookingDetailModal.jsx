import { bookingStatusLongLabel } from '../formatters/statusLabels.js';
import { BOOKING_EQUIPMENT_OPTIONS } from '../../shared/constants.js';
import { container } from '../../shared/di/container.js';
import { useModal } from '../context/ModalContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { printBookingReceipt } from '../print/printBookingReceipt.js';
import { printRoomNotice } from '../print/printRoomNotice.js';

const ROLE_LABEL = { teacher: 'อาจารย์', student: 'นักศึกษา', staff: 'เจ้าหน้าที่', admin: 'ผู้ดูแล' };
const STATUS_COLOR = { approved: '#166534', pending: '#92400e', rejected: '#991b1b', cancelled: '#4A4F7A' };
const STATUS_BG = { approved: '#dcfce7', pending: '#FEF3C7', rejected: '#fee2e2', cancelled: '#F4F5FA' };
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

  function show(bookingId) {
    const booking = container.repositories.bookingRepository.findById(bookingId);
    if (!booking) return;
    const roleLabel = ROLE_LABEL[booking.role] || booking.role;
    const statusLabel = bookingStatusLongLabel(booking.status);
    // Printing the room-door notice is Staff's job specifically — not
    // admins or approvers, even though they can see everything else here.
    const canPrintRoomNotice = role === 'staff';

    const rows = [
      ['ผู้จอง', booking.user],
      ['ประเภทผู้ใช้', roleLabel],
      ['วัตถุประสงค์', booking.title],
      ['วันที่', booking.date],
      ['เวลา', booking.time],
    ];

    const equipmentItems = Object.entries(booking.equipment)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => `${EQUIPMENT_NAMES[key] || key} ${qty} ${EQUIPMENT_UNITS[key] || 'ชิ้น'}`);

    openModal(
      'รายละเอียดการจอง',
      <>
        <div style={{ background: 'linear-gradient(135deg,#2A2262,#38419D)', borderRadius: '10px', padding: '14px 16px', color: 'white', marginBottom: '14px' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '3px' }}>ห้อง {booking.room}</div>
          <div style={{ fontSize: '12px', opacity: .8 }}>{booking.date} · {booking.time}</div>
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
        <ExtraSection title="ขอสิ่งอำนวยความสะดวกเพิ่มเติม" items={equipmentItems} />
        <ExtraSection title="อาหารและน้ำ" items={booking.food} />
        {canPrintRoomNotice && (
          <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '9px 12px', fontSize: '11px', color: '#38419D', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38419D" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            พิมพ์เพื่อนำไปแปะที่หน้าห้อง {booking.room}
          </div>
        )}
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ปิด</button>
        <button className="btn btn-o" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => printBookingReceipt(booking)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4A4F7A" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          ดาวน์โหลด PDF
        </button>
        {canPrintRoomNotice && (
          <button className="btn btn-p" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => printRoomNotice(booking)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            พิมพ์ป้ายหน้าห้อง
          </button>
        )}
      </>,
    );
  }

  return { show };
}
