const EQUIPMENT_DATA=[
  {name:'โปรเจกเตอร์',total:5,working:5,broken:0,ic:'proj',unit:'เครื่อง'},
  {name:'ไมโครโฟน',total:5,working:4,broken:1,ic:'mic',unit:'ตัว'},
  {name:'ไวท์บอร์ด',total:5,working:5,broken:0,ic:'wb',unit:'แผ่น'},
  {name:'เครื่องปรับอากาศ',total:10,working:10,broken:0,ic:'gear',unit:'เครื่อง'},
  {name:'ปลั๊กพ่วง',total:30,working:28,broken:2,ic:'plug',unit:'อัน'},
  {name:'จอ TV',total:5,working:4,broken:1,ic:'monitor',unit:'เครื่อง'},
  {name:'Laser pointer',total:3,working:3,broken:0,ic:'laser',unit:'อัน'},
  {name:'สาย HDMI',total:10,working:9,broken:1,ic:'hdmi',unit:'เส้น'},
];

function renderEquipment(){
  return`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
    <div>
      <div style="font-size:17px;font-weight:700;color:#1A1D3A">จัดการอุปกรณ์</div>
      <div style="font-size:12px;color:#8890B5;margin-top:2px">${EQUIPMENT_DATA.length} รายการ · อัปเดตล่าสุดวันนี้</div>
    </div>
    <button onclick="showAddEquipment()" style="display:flex;align-items:center;gap:7px;padding:10px 16px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;box-shadow:0 2px 8px rgba(56,65,157,.3)">
      ${IC.plus} เพิ่มอุปกรณ์
    </button>
  </div>

  <!-- summary bar -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">
    ${(()=>{
      const total=EQUIPMENT_DATA.reduce((s,e)=>s+e.total,0);
      const working=EQUIPMENT_DATA.reduce((s,e)=>s+e.working,0);
      const broken=EQUIPMENT_DATA.reduce((s,e)=>s+e.broken,0);
      return [
        {l:'ทั้งหมด',n:total,unit:'ชิ้น',c:'#38419D',bg:'#EEF0FF',icK:'monitor'},
        {l:'ใช้งานได้',n:working,unit:'ชิ้น',c:'#166534',bg:'#dcfce7',icK:'ok'},
        {l:'ชำรุด',n:broken,unit:'ชิ้น',c:broken>0?'#991b1b':'#166534',bg:broken>0?'#fee2e2':'#dcfce7',icK:'clock'},
      ].map(s=>`<div style="background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 1px 3px rgba(42,34,98,.06);display:flex;align-items:center;gap:12px">
        <div style="width:38px;height:38px;border-radius:10px;background:${s.bg};display:flex;align-items:center;justify-content:center;color:${s.c};flex-shrink:0">${IC[s.icK]||''}</div>
        <div>
          <div style="font-size:20px;font-weight:700;color:${s.c};line-height:1">${s.n}</div>
          <div style="font-size:11px;color:#8890B5;margin-top:2px">${s.l} (${s.unit})</div>
        </div>
      </div>`).join('');
    })()}
  </div>

  <!-- equipment cards -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
    ${EQUIPMENT_DATA.map((e,i)=>{
      const pct=Math.round(e.working/e.total*100);
      const ok=e.broken===0;
      return`<div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(42,34,98,.07),0 4px 12px rgba(42,34,98,.05);border:.5px solid ${ok?'#E8EAF0':'#fca5a5'}">
        <!-- card header -->
        <div style="padding:14px 16px 12px;border-bottom:.5px solid #F4F5FA">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:38px;height:38px;border-radius:10px;background:${ok?'#EEF0FF':'#fff1f2'};display:flex;align-items:center;justify-content:center;color:${ok?'#38419D':'#ef4444'};flex-shrink:0">${IC[e.ic]||IC.gear}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:#1A1D3A">${e.name}</div>
              <div style="font-size:10px;color:#8890B5;margin-top:1px">ทั้งหมด ${e.total} ${e.unit}</div>
            </div>
            <div style="font-size:14px;font-weight:700;color:${ok?'#166534':'#ef4444'}">${pct}%</div>
          </div>
          <!-- progress bar -->
          <div style="margin-top:10px">
            <div style="height:6px;background:#F4F5FA;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${ok?'linear-gradient(90deg,#10b981,#34d399)':'linear-gradient(90deg,#ef4444,#f87171)'};border-radius:4px;transition:width .4s ease"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:10px">
              <span style="color:#166534;font-weight:500">ใช้งานได้ ${e.working} ${e.unit}</span>
              ${e.broken>0?`<span style="color:#ef4444;font-weight:600">ชำรุด ${e.broken} ${e.unit}</span>`:`<span style="color:#8890B5">ทุกชิ้นพร้อมใช้งาน</span>`}
            </div>
          </div>
        </div>
        <!-- card actions -->
        <div style="padding:10px 14px;background:#FAFBFF;display:flex;gap:7px">
          <button onclick="showEditEquipment(${i})" style="flex:1;padding:8px;background:#fff;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;font-family:Sarabun,sans-serif;transition:all .12s" onmouseover="this.style.borderColor='#38419D';this.style.color='#38419D'" onmouseout="this.style.borderColor='#D8DBF0';this.style.color='#4A4F7A'">แก้ไข</button>
          ${e.broken>0
            ?`<button onclick="repairEquipment(${i})" style="flex:1;padding:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif">ซ่อมแซม</button>`
            :`<button onclick="reportBroken(${i})" style="flex:1;padding:8px;background:#fff;color:#dc2626;border:.5px solid #fca5a5;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;font-family:Sarabun,sans-serif;transition:all .12s" onmouseover="this.style.background='#fff1f2'" onmouseout="this.style.background='#fff'">แจ้งชำรุด</button>`
          }
        </div>
      </div>`;}).join('')}
  </div>`;}

function showAddEquipment(){
  openModal('เพิ่มอุปกรณ์ใหม่',
    `<div class="form-group"><label class="form-label">ชื่ออุปกรณ์ *</label><input class="form-control" id="eqName" placeholder="เช่น จอ Interactive"></div>
     <div class="form-row">
       <div class="form-group"><label class="form-label">จำนวนทั้งหมด *</label><input type="number" class="form-control" id="eqTotal" value="5" min="1"></div>
       <div class="form-group"><label class="form-label">หน่วย</label><input class="form-control" id="eqUnit" value="เครื่อง"></div>
     </div>
     <div class="form-group"><label class="form-label">จำนวนที่ชำรุด</label><input type="number" class="form-control" id="eqBroken" value="0" min="0"></div>`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-p" onclick="addEquipment()">เพิ่มอุปกรณ์</button>`);
}
function addEquipment(){
  const name=document.getElementById('eqName')?.value?.trim();
  const total=parseInt(document.getElementById('eqTotal')?.value||'1');
  const unit=document.getElementById('eqUnit')?.value||'เครื่อง';
  const broken=parseInt(document.getElementById('eqBroken')?.value||'0');
  if(!name){toast('กรุณากรอกชื่ออุปกรณ์','e');return;}
  EQUIPMENT_DATA.push({name,total,working:total-broken,broken,ic:'monitor',unit});
  closeModal();toast('เพิ่ม'+name+'เรียบร้อย','s');navigate('equipment');
}
function showEditEquipment(i){
  const e=EQUIPMENT_DATA[i];
  openModal('แก้ไข: '+e.name,
    `<div class="form-group"><label class="form-label">ชื่ออุปกรณ์</label><input class="form-control" id="eName" value="${e.name}"></div>
     <div class="form-row">
       <div class="form-group"><label class="form-label">จำนวนทั้งหมด</label><input type="number" class="form-control" id="eTotal" value="${e.total}" min="1"></div>
       <div class="form-group"><label class="form-label">หน่วย</label><input class="form-control" id="eUnit" value="${e.unit}"></div>
     </div>
     <div class="form-group"><label class="form-label">จำนวนที่ชำรุด</label><input type="number" class="form-control" id="eBroken" value="${e.broken}" min="0" max="${e.total}"></div>`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-p" onclick="saveEquipment(${i})">บันทึก</button>`);
}
function saveEquipment(i){
  const e=EQUIPMENT_DATA[i];
  e.name=document.getElementById('eName')?.value||e.name;
  e.total=parseInt(document.getElementById('eTotal')?.value)||e.total;
  e.unit=document.getElementById('eUnit')?.value||e.unit;
  e.broken=parseInt(document.getElementById('eBroken')?.value)||0;
  e.working=e.total-e.broken;
  closeModal();toast('แก้ไข'+e.name+'เรียบร้อย','s');navigate('equipment');
}
function repairEquipment(i){
  const e=EQUIPMENT_DATA[i];
  openModal('แจ้งซ่อม: '+e.name,
    `<div style="background:#EEF0FF;border-radius:8px;padding:10px 12px;font-size:12px;color:#38419D;margin-bottom:12px">ชำรุดอยู่ ${e.broken} ${e.unit} จากทั้งหมด ${e.total} ${e.unit}</div>
     <div class="form-group"><label class="form-label">จำนวนที่ซ่อมแล้ว</label><input type="number" class="form-control" id="repairQty" value="${e.broken}" min="1" max="${e.broken}"></div>
     <div class="form-group"><label class="form-label">หมายเหตุ</label><textarea class="form-control" rows="2" placeholder="รายละเอียดการซ่อม..."></textarea></div>`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-s" onclick="confirmRepair(${i})">ยืนยันการซ่อม</button>`);
}
function confirmRepair(i){
  const e=EQUIPMENT_DATA[i];
  
  const qty=parseInt(document.getElementById('repairQty')?.value||0);
  e.broken=Math.max(0,e.broken-qty);e.working=e.total-e.broken;
  closeModal();toast('บันทึกการซ่อม'+e.name+'แล้ว','s');navigate('equipment');
}
function reportBroken(i){
  const e=EQUIPMENT_DATA[i];
  openModal('แจ้งชำรุด: '+e.name,
    `<div class="form-group"><label class="form-label">จำนวนที่ชำรุด</label><input type="number" class="form-control" id="brokenQty" value="1" min="1" max="${e.working}"></div>
     <div class="form-group"><label class="form-label">รายละเอียดการชำรุด *</label><textarea class="form-control" id="brokenNote" rows="2" placeholder="อธิบายลักษณะการชำรุด..."></textarea></div>`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-d" onclick="confirmBroken(${i})">ยืนยันการแจ้ง</button>`);
}
function confirmBroken(i){
  const e=EQUIPMENT_DATA[i];
  const qty=parseInt(document.getElementById('brokenQty')?.value||1);
  e.broken=Math.min(e.total,e.broken+qty);e.working=e.total-e.broken;
  closeModal();toast('แจ้งชำรุด'+e.name+'แล้ว','i');navigate('equipment');
}
