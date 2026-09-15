import { useState } from 'react';
import { getRoomColor } from '../../shared/constants.js';
import { container } from '../../shared/di/container.js';
import { formatDateTime } from '../formatters/statusLabels.js';
import { useRepository } from '../hooks/useRepository.js';
import { useBookingDetailModal } from '../components/BookingDetailModal.jsx';
import { StatusChip } from '../components/StatusChip.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { bookingRepository } = container.repositories;

const STATUS_FILTERS = [['all', 'ทั้งหมด'], ['approved', 'อนุมัติแล้ว'], ['rejected', 'ปฏิเสธ']];

/** Department-wide log of every approve/reject decision, by anyone holding
 * a can_approve position — not scoped to "my own decisions" (see
 * HistoryView for a single approver's personal booking history instead). */
export function ApprovalHistoryView() {
  const { show: showBookingDetail } = useBookingDetailModal();
  const { loading, error } = useRepository(() => bookingRepository.refresh());
  const [filterStatus, setFilterStatus] = useState('all');

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const decided = bookingRepository.getAll()
    .filter((b) => (b.isApproved() || b.isRejected()) && b.approvedAt)
    .filter((b) => filterStatus === 'all' || b.status === filterStatus)
    .sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt));

  return (
    <>
      <div className="sec-hdr"><span className="sec-ttl">ประวัติการอนุมัติ ({decided.length})</span></div>
      <div className="filter-row">
        {STATUS_FILTERS.map(([key, label]) => (
          <button key={key} className={`fchip${filterStatus === key ? ' on' : ''}`} onClick={() => setFilterStatus(key)}>{label}</button>
        ))}
      </div>
      {decided.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '64px' }}>รหัส</th><th style={{ width: '80px' }}>ห้อง</th>
                <th style={{ width: '150px' }}>ผู้จอง</th><th style={{ width: '100px' }}>วันที่ใช้ห้อง</th>
                <th>วัตถุประสงค์</th><th style={{ width: '90px' }}>สถานะ</th>
                <th style={{ width: '150px' }}>ผู้อนุมัติ</th><th style={{ width: '120px' }}>เมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {decided.map((b) => {
                const rc = getRoomColor(b.room);
                return (
                  <tr key={b.id} onClick={() => showBookingDetail(b.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: '#38419D' }}>{b.id}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: rc.bg, color: rc.text }}>ห้อง {b.room}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{b.user}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{b.date}</td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.title}
                      {b.isRejected() && b.rejectReason && (
                        <div style={{ fontSize: '10.5px', color: '#991b1b', marginTop: '2px', whiteSpace: 'normal' }}>เหตุผล: {b.rejectReason}</div>
                      )}
                    </td>
                    <td><StatusChip status={b.status} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{b.approvedByName || '—'}</td>
                    <td style={{ fontSize: '11px', color: '#8890B5', whiteSpace: 'nowrap' }}>{formatDateTime(b.approvedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8890B5', fontSize: '12.5px', background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '12px' }}>ไม่มีรายการ</div>
      )}
    </>
  );
}
