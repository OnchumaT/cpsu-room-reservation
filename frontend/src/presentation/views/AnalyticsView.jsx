import { IC } from '../../shared/icons.js';
import { getRoomColor } from '../../shared/constants.js';

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'];
const MONTHLY_BOOKINGS = [12, 18, 15, 22, 19, 28];
const STAT_CARDS = [
  { icon: 'list', bg: '#EEF0FF', n: 48, label: 'การจองทั้งเดือน', change: '↑ 12%' },
  { icon: 'users', bg: '#DBEAFE', n: 127, label: 'ผู้ใช้งานทั้งหมด', change: '↑ 5 คนใหม่' },
  { icon: 'door', bg: '#dcfce7', n: '68%', label: 'อัตราการใช้งาน', change: '↑ 5% จากเดือนที่แล้ว' },
  { icon: 'ok', bg: '#FEF3C7', n: '92%', label: 'อัตราการอนุมัติ', change: 'สูงกว่าเป้าหมาย' },
];
const USER_SHARE = [
  { label: 'อาจารย์', pct: 18, color: '#38419D' },
  { label: 'นักศึกษา', pct: 65, color: '#3887BE' },
  { label: 'เจ้าหน้าที่', pct: 12, color: '#10b981' },
  { label: 'แอดมิน', pct: 5, color: '#f59e0b' },
];
const ROOM_USAGE = [
  { room: '1637', count: 18, pct: 85 }, { room: '1638', count: 14, pct: 67 },
  { room: '1639', count: 12, pct: 57 }, { room: '1640', count: 8, pct: 38 },
  { room: '1641', count: 10, pct: 48 },
];

/** Admin-only illustrative analytics dashboard (static demo data — not
 * backed by live aggregation). */
export function AnalyticsView() {
  const maxVal = Math.max(...MONTHLY_BOOKINGS);

  return (
    <>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {STAT_CARDS.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat-ic" style={{ background: s.bg }} dangerouslySetInnerHTML={{ __html: IC[s.icon] || '' }} />
            <div className="stat-n">{s.n}</div><div className="stat-l">{s.label}</div>
            <div className="stat-ch" style={{ color: '#166534' }}>{s.change}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginTop: '4px' }}>
        <div style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '14px' }}>จำนวนการจองรายเดือน (2568)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px' }}>
            {MONTHLY_BOOKINGS.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#38419D' }}>{v}</div>
                <div style={{ width: '100%', background: '#38419D', borderRadius: '4px 4px 0 0', height: `${Math.round((v / maxVal) * 90)}px` }} />
                <div style={{ fontSize: '9px', color: '#8890B5' }}>{MONTHS[i]}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>สัดส่วนผู้ใช้</div>
          {USER_SHARE.map((u) => (
            <div key={u.label} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                <span style={{ color: '#4A4F7A' }}>{u.label}</span><span style={{ fontWeight: 600, color: u.color }}>{u.pct}%</span>
              </div>
              <div style={{ height: '5px', background: '#F4F5FA', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${u.pct}%`, background: u.color, borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>ห้องที่ถูกจองมากที่สุด</div>
        {ROOM_USAGE.map((r) => {
          const rc = getRoomColor(r.room);
          return (
            <div key={r.room} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: rc.text, minWidth: '60px' }}>ห้อง {r.room}</div>
              <div style={{ flex: 1, height: '6px', background: '#F4F5FA', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${r.pct}%`, background: rc.bar, borderRadius: '3px' }} />
              </div>
              <div style={{ fontSize: '11px', color: '#4A4F7A', minWidth: '40px', textAlign: 'right' }}>{r.count} ครั้ง</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
