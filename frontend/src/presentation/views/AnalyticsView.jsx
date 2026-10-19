import { IC } from '../../shared/icons.js';
import { getRoomColor, THAI_MONTH_ABBR } from '../../shared/constants.js';
import { container } from '../../shared/di/container.js';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { analyticsRepository } = container.repositories;

const ROLE_LABEL = { teacher: 'อาจารย์', staff: 'เจ้าหน้าที่', admin: 'แอดมิน' };
const ROLE_COLOR = { teacher: '#38419D', staff: '#10b981', admin: '#f59e0b' };

/** Admin-only analytics — every number here comes from GetAnalyticsUseCase
 * (live aggregates from the database, see ApiAnalyticsRepository), so a
 * newly added room shows up in "ห้องที่ถูกจองมากที่สุด" immediately
 * (0 ครั้ง until it gets a booking) the same way a new booking shows up
 * in the monthly chart — nothing here is static demo data anymore. */
export function AnalyticsView() {
  const { loading, error } = useRepository(() => analyticsRepository.refresh(), []);

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const a = analyticsRepository.getAnalytics();
  const maxMonthly = Math.max(1, ...a.monthlyBookings.map((m) => m.count));
  const maxRoomUsage = Math.max(1, ...a.roomUsage.map((r) => r.count));

  const statCards = [
    { icon: 'list', bg: '#EEF0FF', n: a.bookingsThisMonth, label: 'การจองทั้งเดือน' },
    { icon: 'users', bg: '#DBEAFE', n: a.totalUsers, label: 'ผู้ใช้งานทั้งหมด' },
    { icon: 'door', bg: '#dcfce7', n: `${a.utilizationRatePct}%`, label: 'อัตราการใช้งาน' },
    { icon: 'ok', bg: '#FEF3C7', n: a.approvalRatePct === null ? '-' : `${a.approvalRatePct}%`, label: 'อัตราการอนุมัติ' },
  ];

  return (
    <>
      <div className="stats">
        {statCards.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat-ic" style={{ background: s.bg }} dangerouslySetInnerHTML={{ __html: IC[s.icon] || '' }} />
            <div className="stat-n">{s.n}</div><div className="stat-l">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="rsp-split" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginTop: '4px' }}>
        <div style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '14px' }}>จำนวนการจองรายเดือน (6 เดือนล่าสุด)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px' }}>
            {a.monthlyBookings.map((m) => {
              const monthIdx = Number(m.month.slice(5, 7)) - 1;
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#38419D' }}>{m.count}</div>
                  <div style={{ width: '100%', background: '#38419D', borderRadius: '4px 4px 0 0', height: `${Math.round((m.count / maxMonthly) * 90)}px` }} />
                  <div style={{ fontSize: '9px', color: '#8890B5' }}>{THAI_MONTH_ABBR[monthIdx]}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>สัดส่วนผู้ใช้</div>
          {a.userShare.map((u) => (
            <div key={u.role} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                <span style={{ color: '#4A4F7A' }}>{ROLE_LABEL[u.role]}</span><span style={{ fontWeight: 600, color: ROLE_COLOR[u.role] }}>{u.pct}%</span>
              </div>
              <div style={{ height: '5px', background: '#F4F5FA', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${u.pct}%`, background: ROLE_COLOR[u.role], borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>ห้องที่ถูกจองมากที่สุด</div>
        {a.roomUsage.length ? a.roomUsage.map((r) => {
          const rc = getRoomColor(r.roomId);
          return (
            <div key={r.roomId} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: rc.text, minWidth: '60px' }}>{r.roomName ?? `ห้อง ${r.roomId}`}</div>
              <div style={{ flex: 1, height: '6px', background: '#F4F5FA', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round((r.count / maxRoomUsage) * 100)}%`, background: rc.bar, borderRadius: '3px' }} />
              </div>
              <div style={{ fontSize: '11px', color: '#4A4F7A', minWidth: '40px', textAlign: 'right' }}>{r.count} ครั้ง</div>
            </div>
          );
        }) : <div className="no-ev" style={{ padding: '14px' }}>ยังไม่มีห้องที่ใช้งาน</div>}
      </div>
    </>
  );
}
