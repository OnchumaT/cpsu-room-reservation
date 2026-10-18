import { useEffect, useState } from 'react';
import { container } from '../../shared/di/container.js';
import { ROLE_INFO } from '../../shared/constants.js';
import { formatDateDMY, formatDateTimeDMY } from '../../shared/dateFormat.js';
import { MonthFilter, currentMonthKey } from '../components/MonthFilter.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { auditLogRepository } = container.repositories;

// Category chip colours — one per group of actions.
const CATEGORIES = {
  booking: { label: 'การจอง', bg: '#EEF0FF', color: '#38419D' },
  approval: { label: 'การอนุมัติ', bg: '#dcfce7', color: '#166534' },
  user: { label: 'ผู้ใช้', bg: '#FEF3C7', color: '#92400e' },
  room: { label: 'ห้อง/อุปกรณ์', bg: '#E0F2FE', color: '#075985' },
  system: { label: 'ตั้งค่าระบบ', bg: '#F3E8FF', color: '#6b21a8' },
  auth: { label: 'เข้าสู่ระบบ', bg: '#F1F5F9', color: '#475569' },
};

// Every action the backend writes (see backend/src/middleware/auditTrail.js and
// the booking use cases) -> Thai label + category.
const ACTIONS = {
  'booking.create': ['สร้างการจอง', 'booking'],
  'booking.edit': ['แก้ไขการจอง', 'booking'],
  'booking.cancel': ['ยกเลิกการจอง', 'booking'],
  'booking.approve': ['อนุมัติการจอง', 'approval'],
  'booking.reject': ['ปฏิเสธการจอง', 'approval'],
  'booking.faculty_result': ['บันทึกผลพิจารณาคณบดี', 'approval'],
  'bookings.archive': ['เก็บการจองเก่าเข้าคลัง', 'system'],
  'auth.login': ['เข้าสู่ระบบ', 'auth'],
  'auth.login_google': ['เข้าสู่ระบบด้วย Google', 'auth'],
  'user.create': ['เพิ่มผู้ใช้', 'user'],
  'user.update': ['แก้ไขผู้ใช้', 'user'],
  'user.toggle': ['เปิด/ระงับบัญชีผู้ใช้', 'user'],
  'user.delete': ['ลบผู้ใช้', 'user'],
  'position.create': ['สร้างตำแหน่งบริหาร', 'user'],
  'position.assign': ['กำหนดตำแหน่งบริหาร', 'user'],
  'position.unassign': ['ถอดตำแหน่งบริหาร', 'user'],
  'room.create': ['เพิ่มห้อง', 'room'],
  'room.update': ['แก้ไขห้อง', 'room'],
  'room.toggle': ['เปิด/ปิดใช้งานห้อง', 'room'],
  'room.delete': ['ลบห้อง', 'room'],
  'building.create': ['เพิ่มอาคาร', 'room'],
  'building.delete': ['ลบอาคาร', 'room'],
  'equipment.update': ['แก้ไขจำนวนอุปกรณ์', 'room'],
  'holiday.create': ['เพิ่มวันหยุดราชการ', 'system'],
  'holiday.delete': ['ลบวันหยุดราชการ', 'system'],
  'settings.approval_mode': ['เปลี่ยนโหมดการอนุมัติ', 'system'],
  'settings.advance_days': ['เปลี่ยนจำนวนวันจองล่วงหน้า', 'system'],
  'settings.retention_days': ['เปลี่ยนจำนวนวันเก็บข้อมูล', 'system'],
  'settings.toggles': ['เปลี่ยนการตั้งค่าระบบ', 'system'],
  'timetable.import': ['นำเข้าตารางการใช้ห้อง', 'system'],
  'sync.run': ['ซิงก์ข้อมูลจาก Cloud', 'system'],
};

const STATUS_TH = { approved: 'อนุมัติแล้ว', pending: 'รออนุมัติ', rejected: 'ปฏิเสธ', cancelled: 'ยกเลิก' };
const roleLabel = (r) => ROLE_INFO[r]?.label || r;

function actionInfo(action) {
  const [label, category] = ACTIONS[action] || [action, 'system'];
  return { label, category: CATEGORIES[category] ? category : 'system' };
}

/** One readable line for an entry's details, e.g. "การจอง #80 · ห้อง 1638 · จ. 20/10/2569 09:00-10:00". */
function describe(action, d = {}) {
  const booking = d.bookingId ? `การจอง #${d.bookingId}` : '';
  switch (action) {
    case 'booking.create':
      return [booking, d.roomId && `ห้อง ${d.roomId}`, d.date && `${formatDateDMY(d.date)} ${d.start}-${d.end}`, STATUS_TH[d.status], d.outOfHours && 'นอกเวลาราชการ'].filter(Boolean).join(' · ');
    case 'booking.edit':
      return [booking || `การจอง #${d.id}`, d.date && `${formatDateDMY(d.date)} ${d.start || ''}-${d.end || ''}`, d.title].filter(Boolean).join(' · ');
    case 'booking.reject':
      return [booking, d.reason && `เหตุผล: ${d.reason}`].filter(Boolean).join(' · ');
    case 'booking.faculty_result':
      return [booking, d.result === 'approved' ? 'คณบดีอนุมัติ' : d.result === 'rejected' ? 'คณบดีไม่อนุมัติ' : d.result, d.note].filter(Boolean).join(' · ');
    case 'booking.approve':
    case 'booking.cancel':
      return booking;
    case 'bookings.archive':
      return `เก็บ ${d.archivedCount ?? 0} รายการ (เก่ากว่า ${d.retentionDays ?? '-'} วัน)`;
    case 'auth.login':
    case 'auth.login_google':
      return d.email || '';
    case 'user.create':
      return [d.name, d.email && `(${d.email})`, d.role && roleLabel(d.role)].filter(Boolean).join(' ');
    case 'user.update':
      return [d.targetName || `ผู้ใช้ #${d.id}`, d.role && `→ ${roleLabel(d.role)}`, d.name && d.name !== d.targetName && `ชื่อใหม่: ${d.name}`].filter(Boolean).join(' ');
    case 'user.toggle':
    case 'user.delete':
      return [d.targetName || `ผู้ใช้ #${d.id}`, d.targetEmail && `(${d.targetEmail})`].filter(Boolean).join(' ');
    case 'room.create':
    case 'room.update':
      return [`ห้อง ${d.id}`, d.cap && `${d.cap} ที่นั่ง`, d.floor && `ชั้น ${d.floor}`, d.status === 'occupied' ? 'ไม่พร้อมใช้งาน' : d.status === 'available' ? 'พร้อมใช้งาน' : null].filter(Boolean).join(' · ');
    case 'room.toggle':
    case 'room.delete':
      return `ห้อง ${d.id}`;
    case 'building.create':
      return d.name || '';
    case 'building.delete':
      return d.targetName || `อาคาร #${d.id}`;
    case 'equipment.update':
      return `${d.key}: ทั้งหมด ${d.total ?? '-'} · ชำรุด ${d.damaged ?? '-'}`;
    case 'holiday.create':
    case 'holiday.delete':
      return [d.name || d.targetName, d.date && formatDateDMY(String(d.date).slice(0, 10))].filter(Boolean).join(' · ');
    case 'settings.approval_mode':
      return d.mode === 'auto' ? 'อัตโนมัติ' : d.mode === 'manual' ? 'อนุมัติด้วยมือ' : String(d.mode ?? '');
    case 'settings.advance_days':
    case 'settings.retention_days':
      return `${d.days} วัน`;
    case 'timetable.import':
      return [d.fileName, d.academicYear && `${d.academicYear} ${d.semester || ''}`, d.building, d.addedCount != null && `เพิ่ม ${d.addedCount} · ปรับปรุง ${d.updatedCount ?? 0}`].filter(Boolean).join(' · ');
    default:
      return Object.entries(d).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
  }
}

/** Admin-only: who did what, when — bookings, approvals, users, rooms, settings, logins. */
export function AuditLogView() {
  const [month, setMonth] = useState(currentMonthKey());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    auditLogRepository.listForMonth(month || undefined)
      .then((rows) => { if (!cancelled) setLogs(rows); })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month]);

  const q = search.trim().toLowerCase();
  const rows = logs
    .map((l) => ({ ...l, info: actionInfo(l.action), text: describe(l.action, l.details || {}) }))
    .filter((l) => category === 'all' || l.info.category === category)
    .filter((l) => !q || [l.user?.name, l.user?.email, l.info.label, l.text].some((s) => String(s || '').toLowerCase().includes(q)));

  const countBy = (cat) => logs.filter((l) => actionInfo(l.action).category === cat).length;

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-ttl">บันทึกการทำงานของระบบ ({rows.length}{rows.length !== logs.length ? ` จาก ${logs.length}` : ''})</span>
        <span style={{ fontSize: '11px', color: '#8890B5' }}>บันทึกอัตโนมัติทุกครั้งที่มีการเปลี่ยนแปลงข้อมูล — แก้ไขหรือลบไม่ได้</span>
      </div>

      <div className="filter-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <MonthFilter value={month} onChange={setMonth} />
        <div className="search-wrap" style={{ margin: 0, minWidth: '240px' }}>
          <input placeholder="ค้นหาชื่อผู้ใช้ / การกระทำ / รายละเอียด" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="filter-row">
        <button className={`fchip${category === 'all' ? ' on' : ''}`} onClick={() => setCategory('all')}>ทั้งหมด ({logs.length})</button>
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <button key={key} className={`fchip${category === key ? ' on' : ''}`} onClick={() => setCategory(key)}>{c.label} ({countBy(key)})</button>
        ))}
      </div>

      {loading ? <LoadingPlaceholder /> : error ? <ErrorPlaceholder error={error} /> : rows.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>วัน-เวลา</th>
                <th style={{ width: '200px' }}>ผู้ทำรายการ</th>
                <th style={{ width: '200px' }}>การกระทำ</th>
                <th>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const c = CATEGORIES[l.info.category];
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#4A4F7A' }}>{formatDateTimeDMY(l.createdAt)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{l.user?.name || 'ระบบ'}</div>
                      {l.user?.email && <div style={{ fontSize: '11px', color: '#8890B5' }}>{l.user.email}</div>}
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>{l.info.label}</span>
                    </td>
                    <td style={{ fontSize: '12.5px', color: '#1A1D3A' }}>{l.text || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8890B5', fontSize: '12.5px', background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '12px' }}>
          {logs.length ? 'ไม่มีรายการที่ตรงกับตัวกรอง' : 'ไม่มีบันทึกในเดือนนี้'}
        </div>
      )}
    </>
  );
}
