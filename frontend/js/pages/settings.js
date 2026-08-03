function renderSettings(){
  const settings=[
    {title:'การอนุมัติอัตโนมัติสำหรับอาจารย์',desc:'อนุมัติการจองของอาจารย์โดยอัตโนมัติ',key:'autoApprove',val:true},
    {title:'การแจ้งเตือนทางอีเมล',desc:'ส่งอีเมลยืนยันทุกการจอง',key:'emailNotif',val:true},
    {title:'แจ้งเตือนก่อนถึงเวลา 30 นาที',desc:'แจ้งผู้จองก่อนถึงเวลาใช้ห้อง',key:'reminder',val:false},
    {title:'ป้องกันการจองทับซ้อน',desc:'ตรวจสอบและบล็อกการจองที่ซ้ำกัน',key:'overlap',val:true},
    {title:'อนุญาตนักศึกษาจองได้ล่วงหน้า',desc:'กำหนดจำนวนวันที่นักศึกษาจองล่วงหน้าได้',key:'studentAdv',val:true},
  ];
  return`
  <div class="sec-hdr"><span class="sec-ttl">ตั้งค่าระบบ</span>
    <button class="btn btn-p" onclick="toast('บันทึกการตั้งค่า','s')">บันทึกทั้งหมด</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:8px;max-width:600px">
    ${settings.map((s,i)=>`
    <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between">
      <div><div style="font-size:13px;font-weight:500;color:#1A1D3A">${s.title}</div>
        <div style="font-size:11px;color:#8890B5;margin-top:2px">${s.desc}</div></div>
      <label style="position:relative;width:42px;height:24px;cursor:pointer;flex-shrink:0;margin-left:16px">
        <input type="checkbox" ${s.val?'checked':''} style="opacity:0;width:0;height:0" onchange="this.parentElement.querySelector('span').style.background=this.checked?'#38419D':'#D8DBF0';this.parentElement.querySelector('em').style.left=this.checked?'20px':'2px';toast('บันทึกแล้ว','s')">
        <span style="position:absolute;inset:0;border-radius:12px;background:${s.val?'#38419D':'#D8DBF0'};transition:.25s"></span>
        <em style="position:absolute;left:${s.val?'20':'2'}px;top:2px;width:20px;height:20px;border-radius:50%;background:white;transition:.25s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></em>
      </label>
    </div>`).join('')}
    <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:14px 16px">
      <div style="font-size:13px;font-weight:500;color:#1A1D3A;margin-bottom:10px">จำนวนวันสูงสุดที่จองล่วงหน้า</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label class="form-label">อาจารย์</label><input type="number" class="form-control" value="60" min="1" max="365"></div>
        <div><label class="form-label">นักศึกษา</label><input type="number" class="form-control" value="14" min="1" max="60"></div>
      </div>
    </div>
  </div>`;}
