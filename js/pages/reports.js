function renderReports(){
  return`
  <div class="sec-hdr"><span class="sec-ttl">รายงาน</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
    ${[
      {title:'รายงานการจองประจำเดือน',desc:'สรุปการจองทั้งหมดเดือน มิ.ย. 2568',date:'มิ.ย. 2568',size:'245 KB',icK:'list'},
      {title:'รายงานการใช้งานห้อง',desc:'อัตราการใช้งานและสถิติแต่ละห้อง',date:'มิ.ย. 2568',size:'128 KB',icK:'door'},
      {title:'รายงานคำขอสิ่งอำนวยความสะดวกเพิ่มเติม',desc:'สรุปคำขออุปกรณ์และอาหาร',date:'มิ.ย. 2568',size:'89 KB',icK:'tool'},
      {title:'รายงานผู้ใช้งาน',desc:'สถิติผู้ใช้แยกตามบทบาท',date:'มิ.ย. 2568',size:'67 KB',icK:'users'},
      {title:'รายงานประจำปี 2567',desc:'สรุปการใช้งานระบบทั้งปี',date:'ธ.ค. 2567',size:'1.2 MB',icK:'file'},
      {title:'รายงานอุปกรณ์',desc:'สถานะและประวัติการซ่อมบำรุง',date:'มิ.ย. 2568',size:'112 KB',icK:'monitor'},
    ].map(r=>`<div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:32px;height:32px;border-radius:8px;background:#EEF0FF;display:flex;align-items:center;justify-content:center;color:#38419D">${IC[r.icK]||''}</div>
        <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;color:#1A1D3A">${r.title}</div></div>
      </div>
      <div style="font-size:11px;color:#8890B5;margin-bottom:8px">${r.desc}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#8890B5;margin-bottom:10px">
        <span>${r.date}</span><span>${r.size}</span>
      </div>
      <button class="btn btn-o" style="width:100%;font-size:11px;padding:6px" onclick="toast('กำลังดาวน์โหลด...','i')">ดาวน์โหลด PDF</button>
    </div>`).join('')}
  </div>`;}
