function renderDash(){
  const stats=getDashStats(),bks=getVis().slice(0,3);
  // upcoming: แสดงการจองที่อนุมัติแล้ว เรียงตามวันที่ ของตัวเอง (อาจารย์/นักศึกษา) หรือทุกคน (สตาฟ/แอดมิน)
  // อาจารย์/นักศึกษา: เห็นของตัวเอง (approved + pending), สตาฟ/แอดมิน: เห็นทุกคนที่ approved
  const ownBks=state.role==='teacher'?BOOKINGS.filter(b=>b.role==='teacher'&&(b.status==='approved'||b.status==='pending')):
               state.role==='student'?BOOKINGS.filter(b=>b.role==='student'&&(b.status==='approved'||b.status==='pending')):
               BOOKINGS.filter(b=>b.status==='approved');
  const upcoming=ownBks.sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  const showStats=state.role!=='teacher'&&state.role!=='student';
  const isTplRole=state.role==='teacher'||state.role==='student'||state.role==='head';
  const myTemplates=isTplRole?(TEMPLATES[state.role]||[]):[];
  return`
  ${showStats?`<div class="stats">${stats.map(s=>`<div class="stat">
    <div class="stat-ic" style="background:${s.ibg};color:${s.ic_c}">${IC[s.icK]||''}</div>
    <div class="stat-n">${s.n}</div><div class="stat-l">${s.l}</div>
    ${s.ch?`<div class="stat-ch" style="color:${s.cc}">${s.ch}</div>`:''}
  </div>`).join('')}</div>`:''}
  <div class="dash-layout">
    <div class="cal-card">
      <div class="cal-hd">
        <div><span class="cal-mo-txt" id="calMo"></span><span class="cal-yr-txt" id="calYr"></span></div>
        <div class="cal-hd-right">
          <div class="cnb" onclick="prevMo()">‹</div>
          <div class="cnb" onclick="nextMo()">›</div>
          <div class="today-chip" onclick="goToday()">วันนี้</div>
          ${state.role==='teacher'||state.role==='student'||state.role==='head'?`<button class="add-chip" onclick="navigate('book')">${IC.plus} จอง</button>`:``}
        </div>
      </div>
      <div class="cal-body">
        <div class="dow-row">${['อา','จ','อ','พ','พฤ','ศ','ส'].map(d=>`<div class="dow">${d}</div>`).join('')}</div>
        <div class="days" id="calDays"></div>
      </div>
      <div class="cal-footer" style="flex-direction:column;align-items:flex-start;gap:6px;padding:10px 14px 12px">
        <div style="font-size:10px;font-weight:500;color:#8890B5;margin-bottom:2px">สัญลักษณ์ห้อง</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <div class="leg"><div style="width:24px;height:8px;border-radius:4px;background:#3b82f6;flex-shrink:0"></div><span style="font-size:11px;color:#1e3a8a;font-weight:500">ห้อง 1637</span></div>
          <div class="leg"><div style="width:24px;height:8px;border-radius:4px;background:#10b981;flex-shrink:0"></div><span style="font-size:11px;color:#065f46;font-weight:500">ห้อง 1638</span></div>
          <div class="leg"><div style="width:24px;height:8px;border-radius:4px;background:#f59e0b;flex-shrink:0"></div><span style="font-size:11px;color:#92400e;font-weight:500">ห้อง 1639</span></div>
          <div class="leg"><div style="width:24px;height:8px;border-radius:4px;background:#a855f7;flex-shrink:0"></div><span style="font-size:11px;color:#6b21a8;font-weight:500">ห้อง 1640</span></div>
          <div class="leg"><div style="width:24px;height:8px;border-radius:4px;background:#f43f5e;flex-shrink:0"></div><span style="font-size:11px;color:#9f1239;font-weight:500">ห้อง 1641</span></div>
        </div>
        <div style="font-size:10px;color:#8890B5;margin-top:2px" id="calStat"></div>
      </div>
    </div>
    <div class="right-col">
      <div class="mini-card">
        <div class="mc-hd"><span id="selLabel">เลือกวันที่</span>${state.role==='teacher'||state.role==='student'||state.role==='head'?`<span class="mc-act" onclick="navigate('book')">+ จอง</span>`:`<span></span>`}</div>
        <div class="day-detail" id="dayDetail"><div class="no-ev">คลิกวันที่ในปฏิทิน</div></div>
      </div>
      <div class="mini-card">
        <div class="mc-hd"><span>กำลังมาถึง</span><span class="mc-act" onclick="navigate('history')">ดูทั้งหมด</span></div>
        ${upcoming.length?upcoming.map(b=>{
          const d=new Date(b.date+'T00:00:00');
          // แสดงวันและเวลาจริง แทนนับถอยหลัง (mock data คนละปีกับ real date)
          const thaiMonths=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
          const soon=`${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear()+543}`;
          const rc=ROOM_COLORS[b.room]||{bar:'#38419D'};
          const isOwn=state.role==='teacher'||state.role==='student';
          return`<div class="upcoming-item" onclick="selDay('${b.date}')">
            <div style="min-width:32px;text-align:center;border-radius:8px;padding:4px 0;background:${rc.bar}20;flex-shrink:0">
              <div style="font-size:15px;font-weight:600;color:${rc.bar};line-height:1">${d.getDate()}</div>
              <div style="font-size:9px;color:${rc.bar}">${MONTHS[d.getMonth()].slice(0,3)}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:11px;font-weight:500;color:#1A1D3A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.title}</div>
              <div style="font-size:10px;color:#4A4F7A;margin-top:1px">ห้อง ${b.room} · ${b.time}</div>
              ${!isOwn?`<div style="font-size:10px;color:#8890B5;margin-top:1px">${b.user}</div>`:''}
              <div style="font-size:10px;font-weight:500;color:${rc.bar};margin-top:2px">${soon}</div>
            </div>
            <div style="width:6px;height:6px;border-radius:50%;background:${rc.bar};flex-shrink:0;margin-top:4px"></div>
          </div>`;}).join(''):`<div class="no-ev" style="padding:14px">ไม่มีการจองที่กำลังมาถึง</div>`}
      </div>
      ${isTplRole?`<div class="mini-card">
        <div class="mc-hd"><span>เทมเพลตการจอง (${myTemplates.length})</span><span class="mc-act" onclick="navigate('templates')">ดูทั้งหมด</span></div>
        ${myTemplates.length?myTemplates.slice(0,3).map(t=>`<div class="upcoming-item" onclick="bookFromTemplate('${t.id}')">
            <div style="width:6px;height:6px;border-radius:50%;background:#38419D;flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:11px;font-weight:500;color:#1A1D3A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</div>
              <div style="font-size:10px;color:#4A4F7A;margin-top:1px">ห้อง ${t.room} · ${t.purpose}</div>
            </div>
          </div>`).join(''):`<div class="no-ev" style="padding:14px">ยังไม่มีเทมเพลต · <span style="color:#38419D;cursor:pointer" onclick="navigate('book')">ไปจองห้อง</span></div>`}
      </div>`:''}
    </div>
  </div>`;
}

function getDashStats(){
  if(state.role==='teacher')return[{icK:'cal',ibg:'#38419D',ic_c:'white',n:6,l:'การจองของฉัน',ch:'↑ 2 จากสัปดาห์ที่แล้ว',cc:'#16a34a'},{icK:'door',ibg:'#3887BE',ic_c:'white',n:3,l:'ห้องว่างตอนนี้',ch:'3/5 ห้อง',cc:'#8890B5'},{icK:'ok',ibg:'#16a34a',ic_c:'white',n:4,l:'อนุมัติแล้ว',ch:'ใช้ได้เลย',cc:'#16a34a'},{icK:'tool',ibg:'#d97706',ic_c:'white',n:1,l:'คำขอสิ่งอำนวยความสะดวกเพิ่มเติม',ch:'รอดำเนินการ',cc:'#92400e'}];
  if(state.role==='student')return[{icK:'cal',ibg:'#38419D',ic_c:'white',n:3,l:'การจองของฉัน',ch:'↑ 1 จากสัปดาห์ที่แล้ว',cc:'#16a34a'},{icK:'door',ibg:'#3887BE',ic_c:'white',n:3,l:'ห้องว่างตอนนี้',ch:'3/5 ห้อง',cc:'#8890B5'},{icK:'clock',ibg:'#d97706',ic_c:'white',n:2,l:'รออนุมัติ',ch:'รอหัวหน้าภาควิชา',cc:'#92400e'},{icK:'ok',ibg:'#16a34a',ic_c:'white',n:1,l:'อนุมัติแล้ว',ch:'ใช้ได้เลย',cc:'#16a34a'}];
  if(state.role==='head')return[{icK:'clock',ibg:'#d97706',ic_c:'white',n:2,l:'รออนุมัติ',ch:'↑ 2 รายการใหม่',cc:'#92400e'},{icK:'list',ibg:'#38419D',ic_c:'white',n:48,l:'การจองทั้งหมด',ch:'↑ 12%',cc:'#16a34a'},{icK:'ok',ibg:'#16a34a',ic_c:'white',n:44,l:'อนุมัติแล้วเดือนนี้',ch:'เดือนนี้',cc:'#16a34a'},{icK:'door',ibg:'#3887BE',ic_c:'white',n:3,l:'ห้องว่างตอนนี้',ch:'3/5 ห้อง',cc:'#8890B5'}];
  if(state.role==='staff')return[{icK:'list',ibg:'#38419D',ic_c:'white',n:48,l:'การจองทั้งหมด',ch:'↑ 12%',cc:'#16a34a'},{icK:'monitor',ibg:'#d97706',ic_c:'white',n:2,l:'ห้องที่ใช้งานวันนี้',ch:'จาก 5 ห้อง',cc:'#8890B5'},{icK:'box',ibg:'#38419D',ic_c:'white',n:3,l:'คำขอสิ่งอำนวยความสะดวกเพิ่มเติม',ch:'รอจัดเตรียม',cc:'#92400e'},{icK:'door',ibg:'#16a34a',ic_c:'white',n:3,l:'ห้องว่างตอนนี้',ch:'3/5 ห้อง',cc:'#8890B5'}];
  return[{icK:'users',ibg:'#38419D',ic_c:'white',n:127,l:'ผู้ใช้ทั้งหมด',ch:'↑ 5 คนใหม่',cc:'#16a34a'},{icK:'list',ibg:'#3887BE',ic_c:'white',n:48,l:'การจองเดือนนี้',ch:'↑ 12%',cc:'#16a34a'},{icK:'door',ibg:'#16a34a',ic_c:'white',n:5,l:'ห้องทั้งหมด',ch:'ว่าง 3 ห้อง',cc:'#8890B5'},{icK:'clock',ibg:'#d97706',ic_c:'white',n:2,l:'รออนุมัติ',ch:'รอดำเนินการ',cc:'#92400e'}];
}
