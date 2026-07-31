function renderHistory(){
  const mine=state.role==='teacher'?BOOKINGS.filter(b=>b.role==='teacher'):state.role==='student'?BOOKINGS.filter(b=>b.role==='student'):BOOKINGS;
  const isS=state.role==='staff'||state.role==='admin'||state.role==='head';
  const isAdmin=state.role==='admin';
  const isStaff=state.role==='staff';
  const isHead=state.role==='head';
  const canEdit=state.role==='teacher'||state.role==='student';
  return`<div class="sec-hdr"><span class="sec-ttl">ประวัติการจอง (${mine.length})</span><div style="display:flex;gap:6px"><button class="btn btn-o" onclick="toast('สร้าง PDF...','i')" style="display:flex;align-items:center;gap:4px">${IC.file} PDF</button>${!isS?`<button class="btn btn-p" onclick="navigate('book')">+ จองใหม่</button>`:''}</div></div>
  <div class="filter-row">${['all','approved','pending','rejected','cancelled'].map(s=>`<button class="fchip${state.filterStatus===s?' on':''}" onclick="setBkF('${s}',this)">${{all:'ทั้งหมด',approved:'อนุมัติแล้ว',pending:'รอดำเนินการ',rejected:'ปฏิเสธ',cancelled:'ยกเลิก'}[s]}</button>`).join('')}</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:58px">รหัส</th><th style="width:80px">ห้อง</th>${isS?'<th style="width:90px">ผู้จอง</th>':''}<th style="width:80px">วันที่</th><th style="width:90px">เวลา</th><th>วัตถุประสงค์</th><th style="width:58px">สถานะ</th><th style="width:200px">ดำเนินการ</th></tr></thead>
  <tbody>${mine.filter(b=>state.filterStatus==='all'||b.status===state.filterStatus).map(b=>`<tr>
    <td style="font-weight:500;color:#38419D">${b.id}</td>
    <td style="white-space:nowrap;font-weight:500">ห้อง ${b.room}</td>
    ${isS?`<td style="font-size:10px">${b.user}</td>`:''}
    <td>${b.date}</td><td>${b.time}</td>
    <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.title}</td>
    <td>${stChip(b.status)}</td>
    <td>
      <div style="display:flex;align-items:center;gap:4px;white-space:nowrap">
        <button class="btn btn-o" style="padding:4px 10px;font-size:10px;min-width:36px" onclick="showBkDetail('${b.id}')">ดู</button>
        ${canEdit&&b.status==='pending'?`<button style="padding:4px 10px;font-size:10px;background:#EEF0FF;color:#38419D;border:1px solid #c7cbf0;border-radius:6px;cursor:pointer;font-family:Sarabun,sans-serif;font-weight:500;white-space:nowrap" onclick="editBooking('${b.id}')">แก้ไข</button>`:''}
        ${isHead&&b.status==='pending'?`<button class="btn btn-s" style="padding:4px 10px;font-size:10px;white-space:nowrap" onclick="approveBk('${b.id}')">อนุมัติ</button><button class="btn btn-d" style="padding:4px 10px;font-size:10px;white-space:nowrap" onclick="rejectBk('${b.id}')">ปฏิเสธ</button>`:isStaff&&b.status==='approved'?`<button class="btn btn-d" style="padding:4px 10px;font-size:10px;white-space:nowrap" onclick="cancelBk('${b.id}')">ยกเลิก</button>`:!isS&&(b.status==='pending'||b.status==='approved')?`<button class="btn btn-d" style="padding:4px 10px;font-size:10px;white-space:nowrap" onclick="cancelBk('${b.id}')">ยกเลิก</button>`:''}
      </div>
    </td>
  </tr>`).join('')}</tbody></table></div>`;}


function editBooking(id){
  const b=BOOKINGS.find(x=>x.id===id);
  if(!b){toast('ไม่พบข้อมูลการจอง','e');return;}
  const isTeacher=state.role==='teacher';
  window.editEqQty={mic:0,proj:0,wb:0,ext:0};
  window.editFoodItems=[];
  const times=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
  const startVal=b.time.split('–')[0]||b.time.split('-')[0]||'09:00';
  const endVal=b.time.split('–')[1]||b.time.split('-')[1]||'12:00';
  const eqNames={mic:'ไมโครโฟน',proj:'โปรเจกเตอร์',wb:'ไวท์บอร์ดเพิ่ม',ext:'ปลั๊กพ่วง'};
  const facilityHtml=isTeacher?`
    <div style="border-top:0.5px solid #D8DBF0;margin:12px 0 10px"></div>
    <div style="font-size:11px;font-weight:600;color:#4A4F7A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">ขอสิ่งอำนวยความสะดวก <span style="font-size:10px;color:#38419D;font-weight:400">(เฉพาะอาจารย์)</span></div>
    <div style="background:#EEF0FF;border-radius:8px;padding:8px 12px;font-size:11px;color:#38419D;margin-bottom:10px">เมื่อบันทึก เจ้าหน้าที่จะได้รับแจ้งเตือนทันที</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
      ${Object.entries(eqNames).map(([k,nm])=>`
      <div style="background:#F4F5FA;border:0.5px solid #D8DBF0;border-radius:8px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:11px;font-weight:500;color:#1A1D3A">${nm}</span>
        <div style="display:flex;align-items:center;gap:5px">
          <button onclick="chEditQty('${k}',-1)" style="width:22px;height:22px;border:0.5px solid #C2C7E0;border-radius:5px;background:#fff;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center">−</button>
          <span id="eq-${k}" style="font-size:12px;font-weight:600;min-width:16px;text-align:center;color:#38419D">0</span>
          <button onclick="chEditQty('${k}',1)" style="width:22px;height:22px;border:0.5px solid #C2C7E0;border-radius:5px;background:#fff;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center">+</button>
        </div>
      </div>`).join('')}
    </div>
    <div class="form-group">
      <label class="form-label">อาหาร / เครื่องดื่ม (พิมพ์แล้วกด Enter)</label>
      <div style="border:0.5px solid #C2C7E0;border-radius:8px;overflow:hidden">
        <div style="display:flex">
          <input type="text" id="editFoodInp" placeholder="เช่น กาแฟร้อน 5 แก้ว..." style="flex:1;border:none;padding:8px 10px;font-size:12px;font-family:Sarabun,sans-serif;outline:none;color:#1A1D3A" onkeydown="if(event.key==='Enter')addEditFood()">
          <button onclick="addEditFood()" style="padding:0 12px;background:#38419D;color:white;border:none;font-size:11px;cursor:pointer;font-family:Sarabun,sans-serif;font-weight:500">+ เพิ่ม</button>
        </div>
        <div id="editFoodTags" style="display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;background:#F4F5FA;min-height:34px">
          <span style="font-size:11px;color:#8890B5">ยังไม่มีรายการอาหาร</span>
        </div>
      </div>
    </div>`:
  '';
  openModal(
    'แก้ไขการจอง '+b.id,
    `<div style="background:#EEF0FF;border-radius:8px;padding:8px 12px;font-size:11px;color:#38419D;margin-bottom:14px">
      กำลังแก้ไข: <strong>ห้อง ${b.room}</strong> · ${b.date} · ${b.time}
    </div>
    <div class="form-group">
      <label class="form-label">วันที่ *</label>
      <input type="date" class="form-control" id="editDate" value="${b.date}" min="2025-01-01">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="form-group">
        <label class="form-label">เวลาเริ่มต้น *</label>
        <select class="form-control" id="editStart">
          ${times.map(t=>`<option${t===startVal?' selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">เวลาสิ้นสุด *</label>
        <select class="form-control" id="editEnd">
          ${times.map(t=>`<option${t===endVal?' selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">เหตุผลการใช้ห้อง / วัตถุประสงค์ *</label>
      <input type="text" class="form-control" id="editTitle" value="${b.title}" placeholder="ระบุวัตถุประสงค์...">
    </div>
    <div class="form-group">
      <label class="form-label">รายละเอียดเพิ่มเติม</label>
      <textarea class="form-control" id="editNote" rows="2" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>
    </div>
    ${facilityHtml}`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-p" onclick="saveEdit('${b.id}')">บันทึกการแก้ไข</button>`
  );
}

function chEditQty(k,d){
  if(!window.editEqQty)window.editEqQty={mic:0,proj:0,wb:0,ext:0};
  const max={mic:3,proj:2,wb:2,ext:5}[k]||5;
  window.editEqQty[k]=Math.max(0,Math.min(max,(window.editEqQty[k]||0)+d));
  const el=document.getElementById('eq-'+k);
  if(el)el.textContent=window.editEqQty[k];
}

function addEditFood(){
  if(!window.editFoodItems)window.editFoodItems=[];
  const inp=document.getElementById('editFoodInp');
  if(!inp)return;
  const val=inp.value.trim();
  if(!val)return;
  window.editFoodItems.push(val);
  inp.value='';
  renderEditFoodTags();
  inp.focus();
}

function removeEditFood(i){
  if(!window.editFoodItems)return;
  window.editFoodItems.splice(i,1);
  renderEditFoodTags();
}

function renderEditFoodTags(){
  const wrap=document.getElementById('editFoodTags');
  if(!wrap)return;
  const items=window.editFoodItems||[];
  wrap.innerHTML=items.length
    ?items.map((item,i)=>`<div style="display:flex;align-items:center;gap:4px;background:#FFFFFF;border:0.5px solid #C2C7E0;border-radius:20px;padding:3px 9px;font-size:11px;color:#1A1D3A"><span>${item}</span><span onclick="removeEditFood(${i})" style="color:#8890B5;cursor:pointer;font-size:14px;line-height:1">×</span></div>`).join('')
    :'<span style="font-size:11px;color:#8890B5">ยังไม่มีรายการอาหาร</span>';
}

function saveEdit(id){
  const b=BOOKINGS.find(x=>x.id===id);
  if(!b){toast('ไม่พบข้อมูลการจอง','e');return;}
  const date=document.getElementById('editDate')?.value;
  const start=document.getElementById('editStart')?.value;
  const end=document.getElementById('editEnd')?.value;
  const title=document.getElementById('editTitle')?.value?.trim();
  if(!date||!start||!end||!title){toast('กรุณากรอกข้อมูลให้ครบ','e');return;}
  if(start>=end){toast('เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น','e');return;}
  b.date=date;
  b.time=start+'–'+end;
  b.title=title;
  const eq=window.editEqQty||{};
  const food=window.editFoodItems||[];
  const hasEq=Object.values(eq).some(v=>v>0);
  const hasFacility=hasEq||food.length>0;
  closeModal();
  toast('บันทึกการแก้ไขเรียบร้อยแล้ว','s');
  if(state.role==='teacher'&&hasFacility){
    const eqNames={mic:'ไมโครโฟน',proj:'โปรเจกเตอร์',wb:'ไวท์บอร์ด',ext:'ปลั๊กพ่วง'};
    const eqList=Object.entries(eq).filter(([k,v])=>v>0).map(([k,v])=>`${eqNames[k]} ${v} ชิ้น`);
    const allItems=[...eqList,...food];
    STAFF_NOTIFS.unshift({
      id:Date.now(),unr:true,icK:'tool',ibg:'#EEF0FF',
      title:'ผศ.ดร.สมชาย แก้ไขคำขอสิ่งอำนวยความสะดวกเพิ่มเติม ('+id+')',
      sub:'ห้อง '+b.room+' · '+b.date+' · '+b.time+'\n'+allItems.join(' · '),
      time:'เมื่อสักครู่',st:'รอ',stBg:'#FEF3C7',stC:'#92400e',
      acts:[{l:'รับงาน',c:'g',f:'accept'},{l:'ดูเพิ่ม',c:'',f:'detail'}]
    });
    setTimeout(()=>toast('แจ้งเตือนเจ้าหน้าที่เรียบร้อยแล้ว','i'),600);
  }
  window.editFoodItems=[];
  window.editEqQty={mic:0,proj:0,wb:0,ext:0};
  navigate('history');
}

function setBkF(f,btn){state.filterStatus=f;document.querySelectorAll('.fchip').forEach(b=>b.classList.remove('on'));btn.classList.add('on');navigate(state.page);}
function showBkDetail(id){
  const b=BOOKINGS.find(x=>x.id===id);
  if(!b)return;
  const roleLabel={teacher:'อาจารย์',student:'นักศึกษา',staff:'เจ้าหน้าที่'}[b.role]||b.role;
  const statusColor={approved:'#166534',pending:'#92400e',rejected:'#991b1b',cancelled:'#4A4F7A'}[b.status];
  const statusBg={approved:'#dcfce7',pending:'#FEF3C7',rejected:'#fee2e2',cancelled:'#F4F5FA'}[b.status];
  const statusLabel={approved:'อนุมัติแล้ว',pending:'รอการอนุมัติ',rejected:'ปฏิเสธ',cancelled:'ยกเลิก'}[b.status];
  const isStaff=state.role==='staff'||state.role==='admin';
  openModal('รายละเอียดการจอง '+b.id,
    `<div style="background:linear-gradient(135deg,#2A2262,#38419D);border-radius:10px;padding:14px 16px;color:white;margin-bottom:14px">
      <div style="font-size:16px;font-weight:600;margin-bottom:3px">ห้อง ${b.room}</div>
      <div style="font-size:12px;opacity:.8">${b.date} · ${b.time}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:0">
      ${[
        ['ผู้จอง', b.user],
        ['บทบาท', roleLabel],
        ['วัตถุประสงค์', b.title],
        ['วันที่', b.date],
        ['เวลา', b.time],
        ['สถานะ', `<span style="background:${statusBg};color:${statusColor};padding:2px 8px;border-radius:8px;font-size:11px;font-weight:500">${statusLabel}</span>`],
      ].map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:0.5px solid #D8DBF0">
        <span style="font-size:11px;color:#8890B5;font-weight:500">${k}</span>
        <span style="font-size:12px;color:#1A1D3A;font-weight:500;text-align:right;max-width:220px">${v}</span>
      </div>`).join('')}
    </div>
    ${isStaff?`<div style="background:#EEF0FF;border-radius:8px;padding:9px 12px;font-size:11px;color:#38419D;margin-top:12px;display:flex;align-items:center;gap:6px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38419D" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      พิมพ์เพื่อนำไปแปะที่หน้าห้อง ${b.room}
    </div>`:''}`,
    `<button class="btn btn-o" onclick="closeModal()">ปิด</button>
     ${isStaff?`<button class="btn btn-p" style="display:flex;align-items:center;gap:6px" onclick="printRoomNotice('${b.id}','${b.room}','${b.user}','${b.date}','${b.time}','${b.title}','${statusLabel}','${roleLabel}')">
       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
       พิมพ์ PDF
     </button>`:''}`
  );
}

function printRoomNotice(id,room,user,date,time,title,status,role){
  const win=window.open('','_blank','width=800,height=700');
  const isApproved=status==='อนุมัติแล้ว';
  win.document.write(`<!DOCTYPE html><html lang="th"><head>
    <meta charset="UTF-8">
    <title>ป้ายหน้าห้อง ${room}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Sarabun,sans-serif;background:#f0f2ff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:30px;gap:20px}
      .notice{width:520px;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(42,34,98,.18)}
      .notice-header{background:linear-gradient(135deg,#2A2262 0%,#38419D 60%,#3887BE 100%);padding:28px 32px;color:white;text-align:center}
      .room-number{font-size:52px;font-weight:800;letter-spacing:.04em;line-height:1}
      .room-label{font-size:14px;opacity:.7;margin-top:4px;letter-spacing:.06em;text-transform:uppercase}
      .status-badge{display:inline-flex;align-items:center;gap:6px;margin-top:14px;background:${isApproved?'rgba(22,163,74,.25)':'rgba(251,191,36,.25)'};border:1.5px solid ${isApproved?'rgba(74,222,128,.5)':'rgba(251,191,36,.5)'};color:${isApproved?'#a7f3d0':'#fde68a'};padding:6px 16px;border-radius:30px;font-size:13px;font-weight:600}
      .notice-body{padding:26px 32px}
      .info-row{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:.5px solid #E8EAF0}
      .info-row:last-child{border-bottom:none}
      .info-icon{width:32px;height:32px;border-radius:8px;background:#EEF0FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px}
      .info-label{font-size:11px;color:#8890B5;margin-bottom:2px}
      .info-value{font-size:14px;font-weight:600;color:#1A1D3A}
      .notice-footer{padding:16px 32px;background:#F4F5FA;border-top:.5px solid #E8EAF0;text-align:center;font-size:11px;color:#8890B5}
      .print-btn{padding:12px 32px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;box-shadow:0 4px 16px rgba(56,65,157,.3)}
      @media print{body{background:white;padding:0;justify-content:flex-start}.notice{box-shadow:none;border-radius:0;width:100%}.print-btn{display:none}}
    </style>
  </head><body>
    <div class="notice">
      <div class="notice-header">
        <div class="room-number">ห้อง ${room}</div>
        <div class="room-label">ชั้น 6 · อาคาร 1 · ภาควิชาวิทยาการคอมพิวเตอร์</div>
        <div class="status-badge">
          ${isApproved?'✓ อนุมัติการจองแล้ว':'⏳ รอการอนุมัติ'}
        </div>
      </div>
      <div class="notice-body">
        <div class="info-row">
          <div class="info-icon">📋</div>
          <div><div class="info-label">รหัสการจอง</div><div class="info-value">${id}</div></div>
        </div>
        <div class="info-row">
          <div class="info-icon">👤</div>
          <div><div class="info-label">ผู้จอง</div><div class="info-value">${user} <span style="font-size:11px;color:#8890B5;font-weight:400">(${role})</span></div></div>
        </div>
        <div class="info-row">
          <div class="info-icon">📅</div>
          <div><div class="info-label">วันที่ใช้ห้อง</div><div class="info-value">${date}</div></div>
        </div>
        <div class="info-row">
          <div class="info-icon">⏰</div>
          <div><div class="info-label">เวลา</div><div class="info-value">${time}</div></div>
        </div>
        <div class="info-row">
          <div class="info-icon">📌</div>
          <div><div class="info-label">วัตถุประสงค์</div><div class="info-value">${title}</div></div>
        </div>
      </div>
      <div class="notice-footer">
        ระบบจองห้อง CPSU · จัดพิมพ์โดยเจ้าหน้าที่ · ${new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'})}
      </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
  </body></html>`);
  win.document.close();
  setTimeout(()=>win.focus(),300);
}


function showBkD(id){const b=BOOKINGS.find(x=>x.id===id);openModal(`รายละเอียด ${b.id}`,`<div>${[['ห้อง',`ห้อง ${b.room}`],['ผู้จอง',b.user],['วัตถุประสงค์',b.title],['วันที่',b.date],['เวลา',b.time],['สถานะ',stLabel(b.status)]].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:.5px solid #D8DBF0"><span style="font-size:11px;color:#4A4F7A">${k}</span><span style="font-size:12px;font-weight:500">${v}</span></div>`).join('')}</div>`,`<button class="btn btn-o" onclick="closeModal()">ปิด</button><button class="btn btn-p" onclick="closeModal();toast('สร้าง PDF...','i')">PDF</button>`);}
function cancelBk(id){const b=BOOKINGS.find(x=>x.id===id);if(b&&confirm('ต้องการยกเลิก?')){b.status='cancelled';toast('ยกเลิกแล้ว','i');navigate(state.page);}}
function approveBk(id){const b=BOOKINGS.find(x=>x.id===id);if(b){b.status='approved';toast('อนุมัติแล้ว','s');navigate(state.page);}}
