import { IC } from '../../shared/icons.js';

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

/** Admin-only illustrative analytics dashboard (static demo data, matches
 * the old renderAnalytics() — not backed by live aggregation). */
export function createAnalyticsView() {
  function render() {
    const maxVal = Math.max(...MONTHLY_BOOKINGS);
    return `
    <div class="stats" style="grid-template-columns:repeat(4,1fr)">
      ${STAT_CARDS.map((s) => `<div class="stat"><div class="stat-ic" style="background:${s.bg}">${IC[s.icon] || ''}</div><div class="stat-n">${s.n}</div><div class="stat-l">${s.label}</div><div class="stat-ch" style="color:#166534">${s.change}</div></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:4px">
      <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px">
        <div style="font-size:13px;font-weight:500;margin-bottom:14px">จำนวนการจองรายเดือน (2568)</div>
        <div style="display:flex;align-items:flex-end;gap:10px;height:120px">
          ${MONTHLY_BOOKINGS.map((v, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px">
            <div style="font-size:10px;font-weight:600;color:#38419D">${v}</div>
            <div style="width:100%;background:#38419D;border-radius:4px 4px 0 0;height:${Math.round((v / maxVal) * 90)}px;transition:height .3s"></div>
            <div style="font-size:9px;color:#8890B5">${MONTHS[i]}</div>
          </div>`).join('')}
        </div>
      </div>
      <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px">
        <div style="font-size:13px;font-weight:500;margin-bottom:12px">สัดส่วนผู้ใช้</div>
        ${USER_SHARE.map((u) => `
        <div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
            <span style="color:#4A4F7A">${u.label}</span><span style="font-weight:600;color:${u.color}">${u.pct}%</span>
          </div>
          <div style="height:5px;background:#F4F5FA;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${u.pct}%;background:${u.color};border-radius:3px"></div>
          </div>
        </div>`).join('')}
      </div>
    </div>
    <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px;margin-top:12px">
      <div style="font-size:13px;font-weight:500;margin-bottom:12px">ห้องที่ถูกจองมากที่สุด</div>
      ${ROOM_USAGE.map((r) => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="font-size:11px;font-weight:500;color:#1A1D3A;min-width:60px">ห้อง ${r.room}</div>
        <div style="flex:1;height:6px;background:#F4F5FA;border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${r.pct}%;background:#38419D;border-radius:3px"></div>
        </div>
        <div style="font-size:11px;color:#4A4F7A;min-width:40px;text-align:right">${r.count} ครั้ง</div>
      </div>`).join('')}
    </div>`;
  }

  return { render };
}
