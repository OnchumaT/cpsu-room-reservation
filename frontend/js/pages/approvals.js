function renderApprovals(){const pend=BOOKINGS.filter(b=>b.status==='pending');return`
  <div class="sec-hdr"><span class="sec-ttl">คิวรออนุมัติ (${pend.length})</span><button class="btn btn-s" onclick="approveAll()">อนุมัติทั้งหมด</button></div>
  ${!pend.length?`<div style="text-align:center;padding:40px;color:#8890B5">ไม่มีรายการรออนุมัติ</div>`:pend.map(b=>`<div class="ap-card">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
      <div><div style="font-size:13px;font-weight:500;margin-bottom:3px">${b.user}</div>
        <div style="font-size:11px;color:#8890B5;margin-bottom:8px">${b.title}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip chip-a">ห้อง ${b.room}</span><span class="chip chip-a">${b.date}</span><span class="chip chip-a">${b.time}</span><span class="chip chip-p">นักศึกษา</span></div></div>
      <div style="display:flex;gap:5px;flex-shrink:0"><button class="btn btn-s" onclick="approveBk('${b.id}');navigate('approvals')">อนุมัติ</button><button class="btn btn-d" onclick="rejectBk('${b.id}')">ปฏิเสธ</button></div>
    </div></div>`).join('')}`;}
function approveAll(){BOOKINGS.filter(b=>b.status==='pending').forEach(b=>b.status='approved');toast('อนุมัติทั้งหมดแล้ว','s');navigate('approvals');}
function rejectBk(id){const b=BOOKINGS.find(x=>x.id===id);if(b){b.status='rejected';toast('ปฏิเสธแล้ว','i');navigate('approvals');}}
