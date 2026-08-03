function renderNotifs(){
  // ── ADMIN ── ดูสรุปเท่านั้น ไม่มีปุ่มดำเนินการ
  if(state.role==='admin'){
    const ADMIN_NOTIFS=[
      {ic:'users',ibg:'#EEF0FF',msg:'มีผู้ใช้ใหม่ลงทะเบียน 3 คน รอการยืนยัน',sub:'นักศึกษา 2 คน · อาจารย์ 1 คน',time:'เมื่อสักครู่',unr:true},
      {ic:'list',ibg:'#DBEAFE',msg:'การจองทั้งหมดเดือนนี้: 48 รายการ',sub:'อนุมัติแล้ว 38 · รอ 4 · ปฏิเสธ 6',time:'อัปเดตล่าสุด 09:00 น.',unr:false},
      {ic:'monitor',ibg:'#FEF3C7',msg:'อุปกรณ์ชำรุดรายงานใหม่: ไมโครโฟน 1 ตัว',sub:'ห้อง 1638 · โปรดตรวจสอบ',time:'1 ชม.ที่แล้ว',unr:true},
      {ic:'chart',ibg:'#dcfce7',msg:'รายงานประจำเดือนพร้อมดาวน์โหลดแล้ว',sub:'มิถุนายน 2568 · สรุปการใช้งานทั้งหมด',time:'2 ชม.ที่แล้ว',unr:false},
      {ic:'gear',ibg:'#F3E8FF',msg:'ระบบอัปเดตสำเร็จ เวอร์ชัน 1.2.5',sub:'ปรับปรุงประสิทธิภาพและแก้บัก',time:'เมื่อวาน',unr:false},
    ];
    return`
    <div class="sec-hdr"><span class="sec-ttl">การแจ้งเตือน — ผู้ดูแลระบบ</span>
      <button class="btn btn-o" onclick="toast('อ่านทั้งหมดแล้ว','s')">อ่านทั้งหมด</button></div>
    <div style="background:#EEF0FF;border-radius:8px;padding:8px 12px;font-size:11px;color:#38419D;margin-bottom:10px">
      แอดมินรับแจ้งเตือนเชิงระบบ — การดำเนินการรายบุคคลทำผ่านหน้าจัดการที่เกี่ยวข้อง
    </div>
    <div class="tbl-wrap">
      ${ADMIN_NOTIFS.map(n=>`<div class="nitem${n.unr?' unr':''}">
        <div class="ni-ic" style="background:${n.ibg};color:#4A4F7A">${IC[n.ic]||''}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:${n.unr?600:400};color:#1A1D3A;margin-bottom:2px">${n.msg}</div>
          <div style="font-size:10px;color:#8890B5">${n.sub} · ${n.time}</div>
        </div>
        ${n.unr?`<div style="width:8px;height:8px;border-radius:50%;background:#38419D;flex-shrink:0;margin-top:4px"></div>`:''}
      </div>`).join('')}
    </div>`;}

  // ── STAFF ── มีปุ่มดำเนินการ รับงาน/อนุมัติ/ปฏิเสธ
  if(state.role==='staff'){return`
    <div class="sec-hdr"><span class="sec-ttl">การแจ้งเตือน — เจ้าหน้าที่</span>
      <button class="btn btn-o" onclick="toast('อ่านทั้งหมดแล้ว','s')">อ่านทั้งหมด</button></div>
    <div class="tbl-wrap">${STAFF_NOTIFS.map(n=>`
      <div class="staff-nitem${n.unr?' unr':''}">
        <div class="ni-ic" style="background:${n.ibg};color:#4A4F7A">${IC[n.icKey]||''}</div>
        <div class="sni-body">
          <div class="sni-ti">${n.title}</div>
          <div class="sni-su">${n.sub}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <span style="font-size:10px;color:#8890B5">${n.time}</span>
            <span class="chip" style="background:${n.stBg};color:${n.stC}">${n.st}</span>
          </div>
          ${n.acts.length?`<div class="sni-acts">${n.acts.map(a=>`<button class="sact ${a.c}" onclick="doSA(${n.id},'${a.f}')">${a.l}</button>`).join('')}</div>`:''}
        </div>
      </div>`).join('')}
    </div>`;}

  // ── HEAD ── มีปุ่มดำเนินการ อนุมัติ/ปฏิเสธ
  if(state.role==='head'){return`
    <div class="sec-hdr"><span class="sec-ttl">การแจ้งเตือน — หัวหน้าภาควิชา</span>
      <button class="btn btn-o" onclick="toast('อ่านทั้งหมดแล้ว','s')">อ่านทั้งหมด</button></div>
    <div class="tbl-wrap">${HEAD_NOTIFS.map(n=>`
      <div class="staff-nitem${n.unr?' unr':''}">
        <div class="ni-ic" style="background:${n.ibg};color:#4A4F7A">${IC[n.icKey]||''}</div>
        <div class="sni-body">
          <div class="sni-ti">${n.title}</div>
          <div class="sni-su">${n.sub}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <span style="font-size:10px;color:#8890B5">${n.time}</span>
            <span class="chip" style="background:${n.stBg};color:${n.stC}">${n.st}</span>
          </div>
          ${n.acts.length?`<div class="sni-acts">${n.acts.map(a=>`<button class="sact ${a.c}" onclick="doSA(${n.id},'${a.f}')">${a.l}</button>`).join('')}</div>`:''}
        </div>
      </div>`).join('')}
    </div>`;}

  // ── TEACHER ──
  if(state.role==='teacher'){
    const its=[
      {ic:'ok',ibg:'#dcfce7',msg:'การจองห้อง 1637 ได้รับการอนุมัติ',sub:'2 มิ.ย. 09:00–12:00 · สอนวิชา CS301',time:'เมื่อสักครู่',unr:true},
      {ic:'tool',ibg:'#EEF0FF',msg:'คำขอสิ่งอำนวยความสะดวกเพิ่มเติม BK001 ถูกรับงานแล้ว',sub:'เจ้าหน้าที่กำลังเตรียม ไมโครโฟน · กาแฟ',time:'10 นาทีที่แล้ว',unr:true},
      {ic:'clock',ibg:'#FEF3C7',msg:'ห้อง 1639 จะหมดเวลาใน 30 นาที',sub:'กรุณาคืนห้องเมื่อใช้งานเสร็จ',time:'1 ชม.ที่แล้ว',unr:false},
      {ic:'ok',ibg:'#dcfce7',msg:'การจองห้อง 1637 ครั้งถัดไปพรุ่งนี้',sub:'5 มิ.ย. 09:00–12:00 · สอบปลายภาค CS301',time:'3 ชม.ที่แล้ว',unr:false},
    ];
    return`
    <div class="sec-hdr"><span class="sec-ttl">การแจ้งเตือน — อาจารย์</span>
      <button class="btn btn-o" onclick="toast('อ่านทั้งหมดแล้ว','s')">อ่านทั้งหมด</button></div>
    <div class="tbl-wrap">
      ${its.map(n=>`<div class="nitem${n.unr?' unr':''}">
        <div class="ni-ic" style="background:${n.ibg};color:#4A4F7A">${IC[n.ic]||''}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:${n.unr?600:400};color:#1A1D3A;margin-bottom:2px">${n.msg}</div>
          <div style="font-size:10px;color:#8890B5">${n.sub} · ${n.time}</div>
        </div>
        ${n.unr?`<div style="width:8px;height:8px;border-radius:50%;background:#38419D;flex-shrink:0;margin-top:4px"></div>`:''}
      </div>`).join('')}
    </div>`;}

  // ── STUDENT ──
  const its=[
    {ic:'clock',ibg:'#FEF3C7',msg:'การจองห้อง 1638 รอการอนุมัติจากหัวหน้าภาควิชา',sub:'2 มิ.ย. 10:00–12:00 · ประชุมกลุ่มโปรเจกต์',time:'5 นาทีที่แล้ว',unr:true},
    {ic:'ok',ibg:'#dcfce7',msg:'การจองห้อง 1641 ได้รับการอนุมัติ',sub:'9 มิ.ย. 13:00–16:00 · โปรเจกต์ IT Club',time:'เมื่อวาน',unr:false},
  ];
  return`
  <div class="sec-hdr"><span class="sec-ttl">การแจ้งเตือน — นักศึกษา</span>
    <button class="btn btn-o" onclick="toast('อ่านทั้งหมดแล้ว','s')">อ่านทั้งหมด</button></div>
  <div class="tbl-wrap">
    ${its.map(n=>`<div class="nitem${n.unr?' unr':''}">
      <div class="ni-ic" style="background:${n.ibg};color:#4A4F7A">${IC[n.ic]||''}</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:${n.unr?600:400};color:#1A1D3A;margin-bottom:2px">${n.msg}</div>
        <div style="font-size:10px;color:#8890B5">${n.sub} · ${n.time}</div>
      </div>
      ${n.unr?`<div style="width:8px;height:8px;border-radius:50%;background:#38419D;flex-shrink:0;margin-top:4px"></div>`:''}
    </div>`).join('')}
  </div>`;}

function doSA(id,fn){const n=STAFF_NOTIFS.find(x=>x.id===id)||HEAD_NOTIFS.find(x=>x.id===id);if(!n)return;
  if(fn==='approve'){n.st='อนุมัติแล้ว';n.stBg='#dcfce7';n.stC='#166534';n.unr=false;n.acts=[];toast('อนุมัติแล้ว','s');}
  else if(fn==='reject'){n.st='ปฏิเสธ';n.stBg='#fee2e2';n.stC='#991b1b';n.unr=false;n.acts=[];toast('ปฏิเสธแล้ว','i');}
  else if(fn==='accept'){n.st='รับงานแล้ว';n.stBg='#EEF0FF';n.stC='#38419D';n.unr=false;n.acts=[{l:'เสร็จสิ้น',c:'g',f:'done'}];toast('รับงานแล้ว','s');}
  else if(fn==='done'){n.st='จัดการแล้ว';n.stBg='#dcfce7';n.stC='#166534';n.acts=[];toast('จัดการเรียบร้อย','s');}
  else toast('ดูรายละเอียด...','i');
  navigate('notifications');}
