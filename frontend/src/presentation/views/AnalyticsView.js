import { IC } from '../../shared/icons.js';
import { THAI_MONTH_ABBR, ROLE_INFO } from '../../shared/constants.js';

const USER_SHARE_COLOR = { teacher: '#38419D', student: '#3887BE', staff: '#10b981', admin: '#f59e0b' };

/** Admin-only analytics dashboard — every number is a live aggregate from
 * GET /api/analytics (see backend GetAnalyticsUseCase), not static demo data. */
export function createAnalyticsView({ analyticsRepository }) {
  async function load() {
    await analyticsRepository.refresh();
  }

  function render() {
    const a = analyticsRepository.getAnalytics();
    if (!a) return `<div class="misc-pg">${IC.chart}<div>ไม่สามารถโหลดข้อมูลวิเคราะห์ได้</div></div>`;

    const statCards = [
      { icon: 'list', bg: '#EEF0FF', n: a.bookingsThisMonth, label: 'การจองเดือนนี้' },
      { icon: 'users', bg: '#DBEAFE', n: a.totalUsers, label: 'ผู้ใช้งานทั้งหมด' },
      { icon: 'door', bg: '#dcfce7', n: `${a.utilizationRatePct}%`, label: 'อัตราการใช้งาน (ห้องที่ถูกใช้เดือนนี้)' },
      { icon: 'ok', bg: '#FEF3C7', n: a.approvalRatePct === null ? '—' : `${a.approvalRatePct}%`, label: 'อัตราการอนุมัติ (เดือนนี้)' },
    ];

    const maxMonthly = Math.max(1, ...a.monthlyBookings.map((m) => m.count));
    const maxRoomUsage = Math.max(1, ...a.roomUsage.map((r) => r.count));

    return `
    <div class="stats" style="grid-template-columns:repeat(4,1fr)">
      ${statCards.map((s) => `<div class="stat"><div class="stat-ic" style="background:${s.bg}">${IC[s.icon] || ''}</div><div class="stat-n">${s.n}</div><div class="stat-l">${s.label}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:4px">
      <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px">
        <div style="font-size:13px;font-weight:500;margin-bottom:14px">จำนวนการจองรายเดือน (6 เดือนล่าสุด)</div>
        <div style="display:flex;align-items:flex-end;gap:10px;height:120px">
          ${a.monthlyBookings.map(({ month, count }) => {
            const monthIndex = Number(month.slice(5, 7)) - 1;
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px">
              <div style="font-size:10px;font-weight:600;color:#38419D">${count}</div>
              <div style="width:100%;background:#38419D;border-radius:4px 4px 0 0;height:${Math.round((count / maxMonthly) * 90)}px;transition:height .3s"></div>
              <div style="font-size:9px;color:#8890B5">${THAI_MONTH_ABBR[monthIndex] || month}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px">
        <div style="font-size:13px;font-weight:500;margin-bottom:12px">สัดส่วนผู้ใช้</div>
        ${a.userShare.map((u) => {
          const color = USER_SHARE_COLOR[u.role] || '#8890B5';
          const label = ROLE_INFO[u.role]?.label || u.role;
          return `<div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
            <span style="color:#4A4F7A">${label}</span><span style="font-weight:600;color:${color}">${u.pct}%</span>
          </div>
          <div style="height:5px;background:#F4F5FA;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${u.pct}%;background:${color};border-radius:3px"></div>
          </div>
        </div>`;
        }).join('')}
      </div>
    </div>
    <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px;margin-top:12px">
      <div style="font-size:13px;font-weight:500;margin-bottom:12px">ห้องที่ถูกจองมากที่สุด (6 เดือนล่าสุด, ไม่รวมที่ถูกปฏิเสธ/ยกเลิก)</div>
      ${a.roomUsage.map((r) => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="font-size:11px;font-weight:500;color:#1A1D3A;min-width:70px">${r.roomName}</div>
        <div style="flex:1;height:6px;background:#F4F5FA;border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${Math.round((r.count / maxRoomUsage) * 100)}%;background:#38419D;border-radius:3px"></div>
        </div>
        <div style="font-size:11px;color:#4A4F7A;min-width:40px;text-align:right">${r.count} ครั้ง</div>
      </div>`).join('')}
    </div>`;
  }

  return { render, load };
}
