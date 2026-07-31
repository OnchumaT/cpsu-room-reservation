function renderAnalytics(){
  const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.'];
  const data=[12,18,15,22,19,28];
  const maxVal=Math.max(...data);
  return`
  <div class="stats" style="grid-template-columns:repeat(4,1fr)">
    ${[{icK:'list',ibg:'#EEF0FF',ic_c:'white',n:48,l:'การจองทั้งเดือน',ch:'↑ 12%',cc:'#166534'},
       {icK:'users',ibg:'#DBEAFE',ic_c:'white',n:127,l:'ผู้ใช้งานทั้งหมด',ch:'↑ 5 คนใหม่',cc:'#166534'},
       {icK:'door',ibg:'#dcfce7',ic_c:'white',n:'68%',l:'อัตราการใช้งาน',ch:'↑ 5% จากเดือนที่แล้ว',cc:'#166534'},
       {icK:'ok',ibg:'#FEF3C7',ic_c:'white',n:'92%',l:'อัตราการอนุมัติ',ch:'สูงกว่าเป้าหมาย',cc:'#166534'},
    ].map(s=>`<div class="stat"><div class="stat-ic" style="background:${s.ibg}">${IC[s.icK]||''}</div><div class="stat-n">${s.n}</div><div class="stat-l">${s.l}</div><div class="stat-ch" style="color:${s.cc}">${s.ch}</div></div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:4px">
    <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px">
      <div style="font-size:13px;font-weight:500;margin-bottom:14px">จำนวนการจองรายเดือน (2568)</div>
      <div style="display:flex;align-items:flex-end;gap:10px;height:120px">
        ${data.map((v,i)=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px">
          <div style="font-size:10px;font-weight:600;color:#38419D">${v}</div>
          <div style="width:100%;background:#38419D;border-radius:4px 4px 0 0;height:${Math.round(v/maxVal*90)}px;transition:height .3s"></div>
          <div style="font-size:9px;color:#8890B5">${months[i]}</div>
        </div>`).join('')}
      </div>
    </div>
    <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px">
      <div style="font-size:13px;font-weight:500;margin-bottom:12px">สัดส่วนผู้ใช้</div>
      ${[{l:'อาจารย์',pct:18,c:'#38419D'},{l:'นักศึกษา',pct:65,c:'#3887BE'},{l:'เจ้าหน้าที่',pct:12,c:'#10b981'},{l:'แอดมิน',pct:5,c:'#f59e0b'}].map(u=>`
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="color:#4A4F7A">${u.l}</span><span style="font-weight:600;color:${u.c}">${u.pct}%</span>
        </div>
        <div style="height:5px;background:#F4F5FA;border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${u.pct}%;background:${u.c};border-radius:3px"></div>
        </div>
      </div>`).join('')}
    </div>
  </div>
  <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px;margin-top:12px">
    <div style="font-size:13px;font-weight:500;margin-bottom:12px">ห้องที่ถูกจองมากที่สุด</div>
    ${[{room:'1637',cnt:18,pct:85},{room:'1638',cnt:14,pct:67},{room:'1639',cnt:12,pct:57},{room:'1640',cnt:8,pct:38},{room:'1641',cnt:10,pct:48}].map(r=>`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:500;color:#1A1D3A;min-width:60px">ห้อง ${r.room}</div>
      <div style="flex:1;height:6px;background:#F4F5FA;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${r.pct}%;background:#38419D;border-radius:3px"></div>
      </div>
      <div style="font-size:11px;color:#4A4F7A;min-width:40px;text-align:right">${r.cnt} ครั้ง</div>
    </div>`).join('')}
  </div>`;}
