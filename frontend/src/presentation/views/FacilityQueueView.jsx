import { useEffect, useState } from 'react';
import { formatDateTime } from '../formatters/statusLabels.js';
import { getRoomColor } from '../../shared/constants.js';
import { container } from '../../shared/di/container.js';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';
import { formatDateDMY } from '../../shared/dateFormat.js';

const STATUS_LABEL = { pending: 'รอดำเนินการ', accepted: 'รับคำขอแล้ว', done: 'จัดการแล้ว' };
const STATUS_BG = { pending: '#FEF3C7', accepted: '#EEF0FF', done: '#dcfce7' };
const STATUS_COLOR = { pending: '#92400e', accepted: '#38419D', done: '#166534' };

const STATUS_FILTERS = [
  ['all', 'ทั้งหมด'], ['pending', 'รอดำเนินการ'], ['accepted', 'รับคำขอแล้ว'], ['done', 'จัดการแล้ว'],
];

const { facilityRequestRepository } = container.repositories;
const { updateFacilityRequestStatusUseCase } = container.useCases;

/** Staff-only queue of equipment/food requests attached to Teacher bookings. */
export function FacilityQueueView() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { refreshFacilityPendingCount, takeFacilityFocus } = useAppShell();
  const { loading, error, refetch } = useRepository(() => facilityRequestRepository.refresh());
  const [filterStatus, setFilterStatus] = useState('all');
  // Booking id handed over by a clicked notification — its request is
  // highlighted, scrolled into view and opened once the list has loaded.
  const [focusBookingId] = useState(() => takeFacilityFocus());
  const focused = !loading && focusBookingId
    ? facilityRequestRepository.getAll().find((r) => String(r.bkId) === String(focusBookingId))
    : null;
  useEffect(() => {
    if (!focused) return;
    document.querySelector(`[data-request-id="${focused.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showDetail(focused.id);
    // Only once, when the request first becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused?.id]);

  async function accept(id) {
    await updateFacilityRequestStatusUseCase.accept(id);
    closeModal();
    showToast('รับคำขอแล้ว', 's');
    refetch();
    refreshFacilityPendingCount();
  }

  async function complete(id) {
    const r = facilityRequestRepository.findById(id);
    const today = new Date().toISOString().slice(0, 10);
    // Marking "เสร็จสิ้น" well before the booking date usually means the
    // queue was cleared without the facility actually being prepared yet —
    // ask once instead of blocking outright, since some requests (catering,
    // borrowed equipment) are legitimately finished days in advance.
    if (r && r.date > today && !window.confirm('ยังไม่ถึงวันจอง ยืนยันว่าเตรียมเสร็จแล้วจริงหรือไม่?')) return;
    await updateFacilityRequestStatusUseCase.markDone(id);
    closeModal();
    showToast('จัดการเรียบร้อย', 's');
    refetch();
  }

  function showDetail(id) {
    const r = facilityRequestRepository.findById(id);
    if (!r) return;
    openModal(
      `รายละเอียดคำขอ ${r.id}`,
      <>
        <div style={{ background: 'linear-gradient(135deg,#2A2262,#38419D)', borderRadius: '10px', padding: '14px 16px', color: 'white', marginBottom: '14px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>{r.who}</div>
          <div style={{ fontSize: '11px', opacity: .8, marginTop: '3px' }}>ห้อง {r.room} · {formatDateDMY(r.date)} · {r.time}</div>
        </div>
        {r.equip.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '6px' }}>อุปกรณ์ที่ขอ</div>
            {r.equip.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0', borderBottom: '.5px solid #D8DBF0' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38419D', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#1A1D3A' }}>{e}</span>
              </div>
            ))}
          </div>
        )}
        {r.food.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4A4F7A', marginBottom: '6px' }}>อาหาร/เครื่องดื่ม</div>
            {r.food.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0', borderBottom: '.5px solid #D8DBF0' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#1A1D3A' }}>{f}</span>
              </div>
            ))}
          </div>
        )}
        {r.note && <div style={{ background: '#F4F5FA', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: '#4A4F7A' }}><strong>หมายเหตุ:</strong> {r.note}</div>}
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#8890B5' }}>ส่งเมื่อ: {formatDateTime(r.submitted)}</span>
          <span style={{ background: STATUS_BG[r.st], color: STATUS_COLOR[r.st], padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>{STATUS_LABEL[r.st]}</span>
        </div>
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ปิด</button>
        {r.isPending() && <button className="btn btn-s" onClick={() => accept(r.id)}>รับคำขอ</button>}
        {r.isAccepted() && <button className="btn btn-s" onClick={() => complete(r.id)}>เสร็จสิ้น</button>}
      </>,
    );
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const all = facilityRequestRepository.getAll();
  const requests = filterStatus === 'all' ? all : all.filter((r) => r.st === filterStatus);

  return (
    <>
      <div className="sec-hdr"><span className="sec-ttl">คำขอสิ่งอำนวยความสะดวก ({requests.length})</span></div>
      <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#38419D', marginBottom: '14px' }}>เฉพาะอาจารย์เท่านั้นที่สามารถส่งคำขอได้ · เจ้าหน้าที่จัดการคำขอในหน้านี้</div>
      <div className="filter-row">
        {STATUS_FILTERS.map(([key, label]) => (
          <button key={key} className={`fchip${filterStatus === key ? ' on' : ''}`} onClick={() => setFilterStatus(key)}>{label}</button>
        ))}
      </div>
      {requests.length ? (
      <div className="tbl-wrap">
        <table className="tbl tbl-lg">
          <thead><tr><th>รหัส</th><th>ผู้ขอ</th><th>ห้อง</th><th>รายการ</th><th>ส่งเมื่อ</th><th>สถานะ</th><th>ดำเนินการ</th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} data-request-id={r.id} style={focused?.id === r.id ? { outline: '2px solid #38419D', outlineOffset: '-2px' } : undefined}>
                <td style={{ fontWeight: 500, color: '#38419D' }}>{r.id}</td>
                <td style={{ fontWeight: 500 }}>{r.who}</td>
                <td>
                  <span style={{ display: 'inline-block', padding: '4px 11px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, background: getRoomColor(r.room).bg, color: getRoomColor(r.room).text }}>ห้อง {r.room}</span>
                </td>
                <td style={{ fontSize: '13px', color: '#4A4F7A', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[...r.equip, ...r.food].join(' · ')}</td>
                <td style={{ fontSize: '12.5px', color: '#8890B5', whiteSpace: 'nowrap' }}>{formatDateTime(r.submitted)}</td>
                <td><span style={{ fontSize: '12px', fontWeight: 500, padding: '5px 13px', borderRadius: '20px', whiteSpace: 'nowrap', background: STATUS_BG[r.st], color: STATUS_COLOR[r.st] }}>{STATUS_LABEL[r.st]}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button className="btn btn-o" style={{ padding: '7px 14px', fontSize: '12.5px' }} onClick={() => showDetail(r.id)}>ดู</button>
                    {r.isPending() && <button className="btn btn-s" style={{ padding: '7px 14px', fontSize: '12.5px' }} onClick={() => accept(r.id)}>รับคำขอ</button>}
                    {r.isAccepted() && <button className="btn btn-p" style={{ padding: '7px 14px', fontSize: '12.5px' }} onClick={() => complete(r.id)}>เสร็จสิ้น</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8890B5', fontSize: '12.5px', background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '12px' }}>ไม่มีรายการ</div>
      )}
    </>
  );
}
