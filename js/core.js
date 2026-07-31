function toast(msg,type='i'){
  const c=document.getElementById('toasts'),t=document.createElement('div');
  t.className=`toast ${type}`;
  const col=type==='s'?'#16a34a':type==='e'?'#ef4444':'#38419D';
  t.innerHTML=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.5">${type==='s'?'<polyline points="20 6 9 17 4 12"/>':type==='e'?'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>':`<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`}</svg>${msg}`;
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';},2500);
  setTimeout(()=>t.remove(),3000);
}
function openModal(ti,body,foot){
  document.getElementById('mTitle').textContent=ti;
  document.getElementById('mBody').innerHTML=body;
  document.getElementById('mFoot').innerHTML=foot||'<button class="btn btn-o" onclick="closeModal()">ปิด</button>';
  document.getElementById('modalOv').style.display='flex';
}
function closeModal(){document.getElementById('modalOv').style.display='none'}

function toggleSB(){state.sbCol=!state.sbCol;document.getElementById('sidebar').classList.toggle('col',state.sbCol)}

function renderSidebar(){
  const ri=ROLE_INFO[state.role];
  document.getElementById('sbNav').innerHTML=MENUS[state.role].map(m=>{
    if(m.sec)return`<div class="sec-hd">${m.sec}</div>`;
    return`<div class="ni${state.page===m.key?' on':''}" onclick="navigate('${m.key}')">
      <span class="ni-ic">${IC[m.ic]||''}</span><span class="nav-lbl">${m.label}</span>${m.badge?`<span class="nav-badge">${m.badge}</span>`:''}
    </div>`;
  }).join('');
  document.getElementById('sbUser').innerHTML=`<div class="sb-av" style="background:${ri.avBg};color:${ri.avC}">${ri.short}</div><div class="sb-uinfo"><div class="sb-uname">${ri.name}</div><div class="sb-urole">${ri.label}</div></div>`;
}
function renderTopbar(){
  const ri=ROLE_INFO[state.role];
  document.getElementById('nbDot').textContent=ri.nb;
  const av=document.getElementById('avBtn');
  av.textContent=ri.short;
  av.style.cssText=`background:${ri.avBg};color:${ri.avC};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0`;
}
function swRole(r,btn){
  state.role=r;state.page='dashboard';state.selDate=null;
  document.querySelectorAll('.rsw').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  const lbl={teacher:'อาจารย์',student:'นักศึกษา',staff:'เจ้าหน้าที่',admin:'ผู้ดูแลระบบ',head:'หัวหน้าภาควิชา'};
  toast(`เปลี่ยนเป็น${lbl[r]}เรียบร้อย`,'s');
  renderSidebar();renderTopbar();navigate('dashboard');
}
function showRoleModal(){
  const ri=ROLE_INFO[state.role];
  const roles=[
    {k:'teacher',l:'อาจารย์',desc:'จองห้อง · ขอสิ่งอำนวยความสะดวกเพิ่มเติม',ibg:'#EEF0FF',ic_c:'#38419D'},
    {k:'student',l:'นักศึกษา',desc:'จองห้อง · รอการอนุมัติ',ibg:'#DBEAFE',ic_c:'#1e40af'},
    {k:'head',l:'หัวหน้าภาควิชา',desc:'อนุมัติการจอง · จองห้องได้',ibg:'#F3E8FF',ic_c:'#6b21a8'},
    {k:'staff',l:'เจ้าหน้าที่',desc:'ดูแลการใช้งานห้อง · จัดการคำขอสิ่งอำนวยความสะดวก',ibg:'#dcfce7',ic_c:'#166534'},
    {k:'admin',l:'ผู้ดูแลระบบ',desc:'จัดการระบบทั้งหมด',ibg:'#FEF3C7',ic_c:'#92400e'},
  ];
  openModal('บัญชีผู้ใช้',
    `<div style="background:linear-gradient(135deg,#2A2262,#38419D);border-radius:10px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:white;flex-shrink:0">${ri.short}</div>
      <div><div style="font-size:14px;font-weight:600;color:white">${ri.name}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.65);margin-top:2px">${ri.label} · ภาควิชาวิทยาการคอมพิวเตอร์</div></div>
    </div>
    <div style="font-size:11px;font-weight:600;color:#4A4F7A;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">สลับบทบาท</div>
    <div style="display:flex;flex-direction:column;gap:6px">
    ${roles.map(r=>`
    <div onclick="swRoleM('${r.k}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;border:2px solid ${state.role===r.k?'#38419D':'#D8DBF0'};background:${state.role===r.k?'#EEF0FF':'#FFFFFF'};transition:all .15s" onmouseover="if('${r.k}'!==state.role)this.style.background='#F4F5FA'" onmouseout="if('${r.k}'!==state.role)this.style.background='#FFFFFF'">
      <div style="width:34px;height:34px;border-radius:8px;background:${r.ibg};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${r.ic_c}">${IC.user}</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600;color:${state.role===r.k?'#38419D':'#1A1D3A'}">${r.l}</div>
        <div style="font-size:10px;color:#8890B5;margin-top:1px">${r.desc}</div>
      </div>
      ${state.role===r.k?`<div style="width:18px;height:18px;border-radius:50%;background:#38419D;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>`:`<div style="width:18px;height:18px;border-radius:50%;border:1.5px solid #D8DBF0;flex-shrink:0"></div>`}
    </div>`).join('')}
    </div>`,
    `<button class="btn btn-o" onclick="closeModal()">ปิด</button>`);
}

function swRoleM(r){closeModal();swRoleDirect(r);}
function swRoleDirect(r){
  state.role=r;state.page='dashboard';state.selDate=null;state.bookFoodItems=[];state.bookEqQty={mic:0,wb:0,ext:0,hdmi:0};
  const lbl={teacher:'อาจารย์',student:'นักศึกษา',staff:'เจ้าหน้าที่',admin:'ผู้ดูแลระบบ',head:'หัวหน้าภาควิชา'};
  toast('เปลี่ยนเป็น'+lbl[r]+'เรียบร้อย','s');
  renderSidebar();
  renderTopbar();
  // update topbar role label immediately
  const rl=document.getElementById('topRoleLabel');
  if(rl)rl.textContent=ROLE_INFO[r].label;
  // update avatar
  const av=document.getElementById('avBtn');
  const ri=ROLE_INFO[r];
  if(av){av.textContent=ri.short;av.style.cssText=`background:${ri.avBg};color:${ri.avC};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;border:2px solid ${ri.avC}33`;}
  navigate('dashboard');
}
function navigate(pg){
  state.page=pg;
  const lbl={dashboard:'แดชบอร์ด',rooms:'ค้นหาห้อง',book:'จองห้อง',history:'ประวัติการจอง',notifications:'การแจ้งเตือน',profile:'โปรไฟล์',approvals:'คิวอนุมัติ',reservations:'จัดการการจอง',managerooms:'จัดการห้อง',facilityqueue:'คำขอสิ่งอำนวยความสะดวก',reports:'รายงาน',users:'จัดการผู้ใช้',equipment:'จัดการอุปกรณ์',allbookings:'การจองทั้งหมด',analytics:'วิเคราะห์ข้อมูล',settings:'ตั้งค่าระบบ',approvalsettings:'ตั้งค่าการอนุมัติ',templates:'เทมเพลตการจอง'};
  document.getElementById('tbTitle').textContent=lbl[pg]||pg;
  renderSidebar();renderPage();
}

// ─── CALENDAR ───
function getVis(){return BOOKINGS.filter(b=>b.status==='approved');}

function renderCal(){
  const y=state.calDate.getFullYear(),m=state.calDate.getMonth();
  const mo=document.getElementById('calMo'),yr=document.getElementById('calYr');
  if(mo)mo.textContent=MONTHS[m];if(yr)yr.textContent=y+543;
  const first=new Date(y,m,1).getDay(),total=new Date(y,m+1,0).getDate(),todStr=fmtDate(new Date());
  const vis=getVis();
  const moStr=`${y}-${String(m+1).padStart(2,'0')}`;
  const mEvs=vis.filter(b=>b.date.startsWith(moStr));
  let cells='';
  for(let i=0;i<first;i++)cells+=`<div class="dc oth"><span class="dn">${new Date(y,m,0).getDate()-first+i+1}</span></div>`;
  for(let day=1;day<=total;day++){
    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const evs=vis.filter(b=>b.date===ds);
    let pills='';evs.slice(0,3).forEach(e=>{
    const rc=ROOM_COLORS[e.room]||{bg:'#E0E7FF',text:'#3730a3'};
    pills+=`<div class="ep" style="background:${rc.bg};color:${rc.text};cursor:pointer;font-weight:600" title="${e.user} | ${e.title} | ${e.time}" onclick="event.stopPropagation();showBkDetail('${e.id}')">ห้อง ${e.room} · ${e.time.split('–')[0]}</div>`;
  });
    if(evs.length>3)pills+=`<div class="ep-more" style="font-size:9px;color:#38419D;font-weight:600;padding:1px 3px">+${evs.length-3} อื่นๆ</div>`;
    cells+=`<div class="dc${ds===todStr?' tod':''}${state.selDate===ds?' sel':''}" onclick="selDay('${ds}')"><span class="dn">${day}</span><div class="eps">${pills}</div></div>`;
  }
  for(let i=1;i<=42-first-total;i++)cells+=`<div class="dc oth"><span class="dn">${i}</span></div>`;
  const dg=document.getElementById('calDays');if(dg)dg.innerHTML=cells;
  const cs=document.getElementById('calStat');
  if(cs)cs.textContent=`${mEvs.length} การจองในเดือนนี้`;
}

function selDay(ds){state.selDate=ds;renderCal();renderDayDetail();}

function renderDayDetail(){
  const sl=document.getElementById('selLabel'),dd=document.getElementById('dayDetail');
  if(!sl||!dd)return;
  if(!state.selDate){sl.textContent='เลือกวันที่';dd.innerHTML=`<div class="no-ev">คลิกวันที่ในปฏิทิน</div>`;return;}
  const d=new Date(state.selDate+'T00:00:00');
  sl.textContent=`${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const evs=getVis().filter(b=>b.date===state.selDate);
  if(!evs.length){dd.innerHTML=`<div class="no-ev">ไม่มีการจองวันนี้</div>`;return;}
  dd.innerHTML=evs.map(e=>`<div class="ev-item" style="cursor:pointer" onclick="showBkDetail('${e.id}')">
    <div class="ev-bar" style="background:${(ROOM_COLORS[e.room]||{bar:'#3b82f6'}).bar}"></div>
    <div class="ev-inf">
      <div class="ev-ti">${e.title}</div>
      <div class="ev-su" style="font-weight:500;color:#4A4F7A">ห้อง ${e.room} · ${e.time}</div>
      <div class="ev-su">${e.user} · <span style="color:${e.role==='teacher'?'#38419D':'#1e40af'}">${e.role==='teacher'?'อาจารย์':'นักศึกษา'}</span></div>
    </div>
    <div class="ev-bdg" style="background:${e.status==='approved'?'#dcfce7':e.status==='pending'?'#FEF3C7':'#fee2e2'};color:${e.status==='approved'?'#166534':e.status==='pending'?'#92400e':'#991b1b'}">${stLabel(e.status)}</div>
  </div>`).join('');
}

function prevMo(){state.calDate=new Date(state.calDate.getFullYear(),state.calDate.getMonth()-1,1);state.selDate=null;renderCal();renderDayDetail();}
function nextMo(){state.calDate=new Date(state.calDate.getFullYear(),state.calDate.getMonth()+1,1);state.selDate=null;renderCal();renderDayDetail();}
function goToday(){state.calDate=new Date();state.selDate=fmtDate(new Date());renderCal();renderDayDetail();}

// ─── PAGES ───
function renderPage(){
  const el=document.getElementById('content'),p=state.page;
  if(p==='dashboard')el.innerHTML=renderDash();
  else if(p==='rooms')el.innerHTML=renderRooms();
  else if(p==='managerooms')el.innerHTML=renderManageRooms();
  else if(p==='book')el.innerHTML=(state.role==='admin'||state.role==='staff')?`<div class="misc-pg">${IC.gear}<div style="font-weight:500;color:#4A4F7A">ไม่มีสิทธิ์จองห้อง</div><div>เฉพาะอาจารย์ นักศึกษา และหัวหน้าภาควิชาเท่านั้น</div></div>`:renderBook();
  else if(p==='history'||p==='reservations'||p==='allbookings')el.innerHTML=renderHistory();
  else if(p==='notifications')el.innerHTML=renderNotifs();
  else if(p==='approvals')el.innerHTML=renderApprovals();
  else if(p==='facilityqueue')el.innerHTML=renderFacilityQueue();
  else if(p==='profile')el.innerHTML=renderProfile();
  else if(p==='users')el.innerHTML=renderUsers();
  else if(p==='equipment')el.innerHTML=renderEquipment();
  else if(p==='analytics')el.innerHTML=renderAnalytics();
  else if(p==='reports')el.innerHTML=renderReports();
  else if(p==='settings')el.innerHTML=renderSettings();
  else if(p==='approvalsettings')el.innerHTML=state.role==='head'?renderApprovalSettings():`<div class="misc-pg">${IC.gear}<div style="font-weight:500;color:#4A4F7A">ไม่มีสิทธิ์เข้าถึง</div><div>เฉพาะหัวหน้าภาควิชาเท่านั้น</div></div>`;
  else if(p==='templates')el.innerHTML=(state.role==='teacher'||state.role==='student'||state.role==='head')?renderTemplates():`<div class="misc-pg">${IC.gear}<div style="font-weight:500;color:#4A4F7A">ไม่มีสิทธิ์เข้าถึง</div><div>เฉพาะอาจารย์ นักศึกษา และหัวหน้าภาควิชาเท่านั้น</div></div>`;
  else el.innerHTML=`<div class="misc-pg">${IC.gear}<div style="font-weight:500;color:#4A4F7A">${document.getElementById('tbTitle').textContent}</div><div>หน้านี้พร้อมใช้งาน</div></div>`;
  if(p==='dashboard')setTimeout(()=>{renderCal();renderDayDetail();},10);
  if(p==='book')setTimeout(()=>{checkRoomAvail();syncBookFormVisuals();},10);
}

// DASHBOARD
