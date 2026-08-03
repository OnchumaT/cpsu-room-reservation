function renderManageRooms(){
  return`
  <div class="sec-hdr">
    <span class="sec-ttl">จัดการห้อง (${ROOMS.length} ห้อง)</span>
    <button class="btn btn-p" onclick="showAddRoom()">+ เพิ่มห้องใหม่</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
    ${ROOMS.map(r=>{
      const stLbl={available:'ว่าง',occupied:'ไม่ว่าง',pending:'รอ'}[r.status];
      const stC={available:'#166534',occupied:'#991b1b',pending:'#92400e'}[r.status];
      const stBg={available:'#dcfce7',occupied:'#fee2e2',pending:'#FEF3C7'}[r.status];
      return`<div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;overflow:hidden">
        <div style="height:90px;background:${r.grad};display:flex;align-items:center;justify-content:center;position:relative">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"><rect x="2" y="7" width="20" height="14"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
          <div style="position:absolute;top:8px;left:10px;background:rgba(0,0,0,.35);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px">${r.id}</div>
          <div style="position:absolute;top:8px;right:10px;background:${stBg};color:${stC};font-size:9px;font-weight:600;padding:2px 8px;border-radius:5px">${stLbl}</div>
        </div>
        <div style="padding:12px">
          <div style="font-size:13px;font-weight:500;color:#1A1D3A;margin-bottom:3px">${r.name}</div>
          <div style="font-size:11px;color:#8890B5;margin-bottom:10px">ชั้น ${r.floor} · ${r.cap} ที่นั่ง</div>
          <div style="display:flex;gap:5px">
            <button class="btn btn-o" style="flex:1;font-size:10px;padding:5px" onclick="showEditRoom('${r.id}')">แก้ไข</button>
            <button class="btn" style="flex:1;font-size:10px;padding:5px;background:${r.status==='available'?'#FEF3C7':'#dcfce7'};color:${r.status==='available'?'#92400e':'#166534'};border:none;border-radius:6px;cursor:pointer" onclick="toggleRoomStatus('${r.id}')">${r.status==='available'?'ปิดใช้งาน':'เปิดใช้งาน'}</button>
            <button class="btn btn-d" style="font-size:10px;padding:5px 8px" onclick="deleteRoom('${r.id}')">ลบ</button>
          </div>
        </div>
      </div>`}).join('')}
  </div>`;}

function showAddRoom(){
  openModal('เพิ่มห้องใหม่',
    `<div class="form-row">
      <div class="form-group"><label class="form-label">รหัสห้อง *</label><input class="form-control" id="newRoomId" placeholder="เช่น 1642"></div>
      <div class="form-group"><label class="form-label">จำนวนที่นั่ง *</label><input type="number" class="form-control" id="newRoomCap" value="20" min="1" max="100"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">ชั้น</label><input type="number" class="form-control" id="newRoomFloor" value="6" min="1"></div>
      <div class="form-group"><label class="form-label">สถานะ</label>
        <select class="form-control" id="newRoomStatus">
          <option value="available">ว่าง (พร้อมใช้งาน)</option>
          <option value="occupied">ไม่ว่าง</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">อุปกรณ์ในห้อง</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:#F4F5FA;border-radius:8px">
        ${['Projector','Whiteboard','A/C','Mic','TV','ปลั๊กไฟ','ระบบเสียง'].map(eq=>`
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px">
          <input type="checkbox" value="${eq}" checked style="accent-color:#38419D"> ${eq}
        </label>`).join('')}
      </div>
    </div>`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-p" onclick="addRoom()">เพิ่มห้อง</button>`);
}

function addRoom(){
  const id=document.getElementById('newRoomId')?.value?.trim();
  const cap=parseInt(document.getElementById('newRoomCap')?.value||'20');
  const floor=parseInt(document.getElementById('newRoomFloor')?.value||'6');
  const status=document.getElementById('newRoomStatus')?.value||'available';
  if(!id){toast('กรุณากรอกรหัสห้อง','e');return;}
  if(ROOMS.find(r=>r.id===id)){toast('รหัสห้องนี้มีอยู่แล้ว','e');return;}
  const grads=['linear-gradient(135deg,#2A2262,#38419D)','linear-gradient(135deg,#0F4C75,#1B9AAA)','linear-gradient(135deg,#0A3D1E,#1B7A3A)'];
  ROOMS.push({id,name:'ห้อง '+id,cap,status,floor,grad:grads[ROOMS.length%grads.length]});
  closeModal();toast('เพิ่มห้อง '+id+' เรียบร้อย','s');navigate('managerooms');
}

function showEditRoom(id){
  const r=ROOMS.find(x=>x.id===id);
  const eq=r.equipment||{projector:1,whiteboard:1,ac:2,mic:1,tv:1,plug:6,sound:1,laser:1};
  const eqItems=[
    {k:'projector',label:'Projector',unit:'เครื่อง'},
    {k:'whiteboard',label:'Whiteboard',unit:'แผ่น'},
    {k:'ac',label:'เครื่องปรับอากาศ',unit:'เครื่อง'},
    {k:'mic',label:'ไมโครโฟน',unit:'ตัว'},
    {k:'tv',label:'จอ TV',unit:'เครื่อง'},
    {k:'plug',label:'ปลั๊กไฟ',unit:'จุด'},
    {k:'sound',label:'ระบบเสียง',unit:'ชุด'},
    {k:'laser',label:'Laser pointer',unit:'อัน'},
  ];
  openModal('แก้ไขห้อง '+r.name,
    `<div class="form-row">
      <div class="form-group"><label class="form-label">จำนวนที่นั่ง</label><input type="number" class="form-control" id="editCap" value="${r.cap}" min="1"></div>
      <div class="form-group"><label class="form-label">ชั้น</label><input type="number" class="form-control" id="editFloor" value="${r.floor}" min="1"></div>
    </div>
    <div class="form-group"><label class="form-label">สถานะ</label>
      <select class="form-control" id="editStatus">
        <option value="available"${r.status==='available'?' selected':''}>ว่าง (พร้อมใช้งาน)</option>
        <option value="occupied"${r.status==='occupied'?' selected':''}>ไม่ว่าง</option>
        <option value="pending"${r.status==='pending'?' selected':''}>รอดำเนินการ</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">จำนวนอุปกรณ์ในห้อง</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px;background:#F4F5FA;border-radius:8px">
        ${eqItems.map(e=>`
        <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:8px;padding:7px 10px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:11px;font-weight:500;color:#1A1D3A">${e.label}</span>
          <div style="display:flex;align-items:center;gap:4px">
            <input type="number" id="eq_${e.k}" value="${eq[e.k]||0}" min="0" max="50"
              style="width:44px;padding:3px 5px;border:.5px solid #C2C7E0;border-radius:5px;font-size:12px;font-family:Sarabun,sans-serif;text-align:center;color:#1A1D3A;outline:none">
            <span style="font-size:10px;color:#8890B5">${e.unit}</span>
          </div>
        </div>`).join('')}
      </div>
    </div>`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-p" onclick="saveRoom('${id}')">บันทึก</button>`);
}

function saveRoom(id){
  const r=ROOMS.find(x=>x.id===id);
  r.cap=parseInt(document.getElementById('editCap')?.value)||r.cap;
  r.floor=parseInt(document.getElementById('editFloor')?.value)||r.floor;
  r.status=document.getElementById('editStatus')?.value||r.status;
  const eqKeys=['projector','whiteboard','ac','mic','tv','plug','sound','laser'];
  r.equipment={};
  eqKeys.forEach(k=>{
    const el=document.getElementById('eq_'+k);
    if(el) r.equipment[k]=parseInt(el.value)||0;
  });
  closeModal();toast('แก้ไขห้อง '+r.name+' เรียบร้อย','s');navigate('managerooms');
}

function toggleRoomStatus(id){
  const r=ROOMS.find(x=>x.id===id);
  r.status=r.status==='available'?'occupied':'available';
  toast('เปลี่ยนสถานะห้อง '+r.name+' แล้ว','i');navigate('managerooms');
}

function deleteRoom(id){
  if(!confirm('ต้องการลบห้อง '+id+' ใช่หรือไม่?'))return;
  const idx=ROOMS.findIndex(x=>x.id===id);
  if(idx!==-1)ROOMS.splice(idx,1);
  toast('ลบห้อง '+id+' แล้ว','i');navigate('managerooms');
}
