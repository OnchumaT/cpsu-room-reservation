const FACILITY_REQUESTS=[
  {id:'FR001',who:'ผศ.ดร.สมชาย วงศ์ดี',room:'1637',bkId:'BK001',date:'2025-06-02',time:'09:00-12:00',
   equip:['ไมโครโฟน 2 ตัว','โปรเจกเตอร์ 1 เครื่อง'],food:['กาแฟร้อน 10 แก้ว','น้ำดื่ม 20 ขวด'],note:'ต้องการก่อน 08:30 น.',submitted:'เมื่อสักครู่',st:'pending'},
  {id:'FR002',who:'อ.วรรณา สุขใจ',room:'1639',bkId:'BK003',date:'2025-06-02',time:'13:00-16:00',
   equip:['ไวท์บอร์ดเพิ่ม 1 แผ่น'],food:['ข้าวกล่อง 8 กล่อง','น้ำผลไม้ 8 กล่อง'],note:'',submitted:'20 นาทีที่แล้ว',st:'pending'},
  {id:'FR003',who:'ผศ.ดร.สมชาย วงศ์ดี',room:'1637',bkId:'BK004',date:'2025-06-05',time:'09:00-12:00',
   equip:['สาย HDMI 1 เส้น','Laser pointer 1 อัน'],food:[],note:'',submitted:'2 ชม.ที่แล้ว',st:'accepted'},
];

function showFacilityDetail(id){
  const r=FACILITY_REQUESTS.find(x=>x.id===id);
  if(!r)return;
  const stLabel={pending:'รอดำเนินการ',accepted:'รับงานแล้ว',done:'จัดการแล้ว'}[r.st]||r.st;
  const stBg={pending:'#FEF3C7',accepted:'#EEF0FF',done:'#dcfce7'}[r.st]||'#F4F5FA';
  const stC={pending:'#92400e',accepted:'#38419D',done:'#166534'}[r.st]||'#4A4F7A';
  openModal('รายละเอียดคำขอ '+r.id,
    `<div style="background:linear-gradient(135deg,#2A2262,#38419D);border-radius:10px;padding:14px 16px;color:white;margin-bottom:14px">
      <div style="font-size:15px;font-weight:600">${r.who}</div>
      <div style="font-size:11px;opacity:.8;margin-top:3px">ห้อง ${r.room} · ${r.date} · ${r.time}</div>
    </div>
    ${r.equip.length?`
    <div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:600;color:#4A4F7A;margin-bottom:6px">อุปกรณ์ที่ขอ</div>
      ${r.equip.map(e=>`<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:.5px solid #D8DBF0">
        <div style="width:6px;height:6px;border-radius:50%;background:#38419D;flex-shrink:0"></div>
        <span style="font-size:12px;color:#1A1D3A">${e}</span>
      </div>`).join('')}
    </div>`:''}
    ${r.food.length?`
    <div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:600;color:#4A4F7A;margin-bottom:6px">อาหาร/เครื่องดื่ม</div>
      ${r.food.map(f=>`<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:.5px solid #D8DBF0">
        <div style="width:6px;height:6px;border-radius:50%;background:#10b981;flex-shrink:0"></div>
        <span style="font-size:12px;color:#1A1D3A">${f}</span>
      </div>`).join('')}
    </div>`:''}
    ${r.note?`<div style="background:#F4F5FA;border-radius:8px;padding:10px 12px;font-size:11px;color:#4A4F7A"><strong>หมายเหตุ:</strong> ${r.note}</div>`:''}
    <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;color:#8890B5">ส่งเมื่อ: ${r.submitted}</span>
      <span style="background:${stBg};color:${stC};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500">${stLabel}</span>
    </div>`,
    `<button class="btn btn-o" onclick="closeModal()">ปิด</button>
     ${r.st==='pending'?`<button class="btn btn-s" onclick="acceptFR('${r.id}')">รับงาน</button>`:''}
     ${r.st==='accepted'?`<button class="btn btn-s" onclick="doneFR('${r.id}')">เสร็จสิ้น</button>`:''}`
  );
}

function acceptFR(id){
  const r=FACILITY_REQUESTS.find(x=>x.id===id);
  if(r){r.st='accepted';closeModal();toast('รับงานแล้ว','s');navigate('facilityqueue');}
}
function doneFR(id){
  const r=FACILITY_REQUESTS.find(x=>x.id===id);
  if(r){r.st='done';closeModal();toast('จัดการเรียบร้อย','s');navigate('facilityqueue');}
}

function renderFacilityQueue(){
  const stLabel={pending:'รอดำเนินการ',accepted:'รับงานแล้ว',done:'จัดการแล้ว'};
  return`
  <div class="sec-hdr">
    <span class="sec-ttl">คำขอสิ่งอำนวยความสะดวก (${FACILITY_REQUESTS.length})</span>
  </div>
  <div style="background:#EEF0FF;border-radius:8px;padding:8px 12px;font-size:11px;color:#38419D;margin-bottom:12px">เฉพาะอาจารย์เท่านั้นที่สามารถส่งคำขอได้ · เจ้าหน้าที่จัดการคำขอในหน้านี้</div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>รหัส</th><th>ผู้ขอ</th><th>ห้อง</th><th>รายการ</th><th>ส่งเมื่อ</th><th>สถานะ</th><th>ดำเนินการ</th></tr></thead>
    <tbody>${FACILITY_REQUESTS.map(r=>`<tr>
      <td style="font-weight:500;color:#38419D">${r.id}</td>
      <td style="font-weight:500">${r.who.split(' ')[0]}</td>
      <td>ห้อง ${r.room}</td>
      <td style="font-size:10px;color:#4A4F7A;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${[...r.equip,...r.food].join(' · ')}</td>
      <td style="font-size:10px;color:#8890B5;white-space:nowrap">${r.submitted}</td>
      <td><span style="font-size:10px;font-weight:500;padding:3px 10px;border-radius:20px;white-space:nowrap;background:${{pending:'#FEF3C7',accepted:'#EEF0FF',done:'#dcfce7'}[r.st]||'#F4F5FA'};color:${{pending:'#92400e',accepted:'#38419D',done:'#166534'}[r.st]||'#4A4F7A'}">${{pending:'รอดำเนินการ',accepted:'รับงานแล้ว',done:'จัดการแล้ว'}[r.st]||r.st}</span></td>
      <td><div style="display:flex;gap:4px;align-items:center">
        <button class="btn btn-o" style="padding:4px 10px;font-size:10px" onclick="showFacilityDetail('${r.id}')">ดู</button>
        ${r.st==='pending'?`<button class="btn btn-s" style="padding:4px 10px;font-size:10px" onclick="acceptFR('${r.id}')">รับงาน</button>`:''}
        ${r.st==='accepted'?`<button class="btn btn-p" style="padding:4px 10px;font-size:10px" onclick="doneFR('${r.id}')">เสร็จสิ้น</button>`:''}
      </div></td>
    </tr>`).join('')}
    </tbody></table></div>`;}
