function renderRooms(){
  const avail=ROOMS.filter(r=>r.status==='available').length;
  const occupied=ROOMS.filter(r=>r.status==='occupied').length;
  const pending=ROOMS.filter(r=>r.status==='pending').length;
  return`
  <!-- search + filter bar -->
  <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
    <div style="flex:1;min-width:200px;display:flex;align-items:center;gap:8px;background:#fff;border:.5px solid #D8DBF0;border-radius:10px;padding:9px 14px;box-shadow:0 1px 4px rgba(42,34,98,.06)">
      <span style="color:#8890B5;flex-shrink:0">${IC.search}</span>
      <input placeholder="ค้นหาห้อง รหัส หรืออุปกรณ์..." oninput="filterRooms(this.value)"
        style="border:none;background:none;font-size:13px;font-family:Sarabun,sans-serif;color:#1A1D3A;outline:none;width:100%">
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="fchip on" onclick="setRF('all',this)">ทั้งหมด (${ROOMS.length})</button>
      <button class="fchip" onclick="setRF('available',this)">
        <span style="width:7px;height:7px;border-radius:50%;background:#10b981;display:inline-block;margin-right:4px"></span>ว่าง (${avail})
      </button>
      <button class="fchip" onclick="setRF('occupied',this)">
        <span style="width:7px;height:7px;border-radius:50%;background:#ef4444;display:inline-block;margin-right:4px"></span>ไม่ว่าง (${occupied})
      </button>
      <button class="fchip" onclick="setRF('pending',this)">
        <span style="width:7px;height:7px;border-radius:50%;background:#f59e0b;display:inline-block;margin-right:4px"></span>รอดำเนินการ (${pending})
      </button>
    </div>
  </div>
  <!-- room grid -->
  <div id="roomsGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
    ${ROOMS.map(roomCard).join('')}
  </div>`;}

function roomCard(r){
  const stMap={available:{l:'ว่าง',c:'#166534',bg:'#dcfce7',dot:'#10b981'},occupied:{l:'ไม่ว่าง',c:'#991b1b',bg:'#fee2e2',dot:'#ef4444'},pending:{l:'รอดำเนินการ',c:'#92400e',bg:'#FEF3C7',dot:'#f59e0b'}};
  const st=stMap[r.status]||stMap.available;
  const canBook=state.role==='teacher'||state.role==='student'||state.role==='head';
  return`<div onclick="showRoomDetail('${r.id}')" style="background:#fff;border-radius:14px;overflow:hidden;cursor:pointer;box-shadow:0 1px 3px rgba(42,34,98,.07),0 4px 16px rgba(42,34,98,.05);transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 4px 12px rgba(42,34,98,.12),0 12px 32px rgba(42,34,98,.1)'" onmouseout="this.style.transform='';this.style.boxShadow='0 1px 3px rgba(42,34,98,.07),0 4px 16px rgba(42,34,98,.05)'">
    <!-- room image banner -->
    <div style="height:100px;background:${r.grad};position:relative;display:flex;align-items:center;justify-content:center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.2"><rect x="2" y="7" width="20" height="14"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
      <!-- room number badge -->
      <div style="position:absolute;top:10px;left:12px;background:rgba(0,0,0,.3);backdrop-filter:blur(4px);color:white;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;letter-spacing:.04em">${r.id}</div>
      <!-- status badge -->
      <div style="position:absolute;top:10px;right:12px;background:${st.bg};color:${st.c};font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;display:flex;align-items:center;gap:4px">
        <span style="width:6px;height:6px;border-radius:50%;background:${st.dot};display:inline-block"></span>${st.l}
      </div>
      <!-- floor badge -->
      <div style="position:absolute;bottom:10px;right:12px;background:rgba(0,0,0,.25);color:rgba(255,255,255,.85);font-size:10px;padding:2px 8px;border-radius:20px">ชั้น ${r.floor}</div>
    </div>
    <!-- room info -->
    <div style="padding:13px 14px 14px">
      <div style="font-size:14px;font-weight:600;color:#1A1D3A;margin-bottom:3px">${r.name}</div>
      <div style="font-size:11px;color:#8890B5;margin-bottom:10px;display:flex;align-items:center;gap:12px">
        <span style="display:flex;align-items:center;gap:4px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          ${r.cap} ที่นั่ง
        </span>
        <span style="display:flex;align-items:center;gap:4px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
          อาคาร 1 ชั้น ${r.floor}
        </span>
      </div>
      <!-- equipment tags -->
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">
        ${['Projector','Whiteboard','A/C','Mic'].map(eq=>`<span style="font-size:10px;background:#F4F5FA;color:#4A4F7A;padding:3px 8px;border-radius:20px;border:.5px solid #E8EAF0">${eq}</span>`).join('')}
      </div>
      <!-- action buttons -->
      <div style="display:flex;gap:7px">
        <button onclick="event.stopPropagation();showRoomDetail('${r.id}')" style="flex:1;padding:8px;background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;font-family:Sarabun,sans-serif;transition:all .12s" onmouseover="this.style.borderColor='#38419D';this.style.color='#38419D'" onmouseout="this.style.borderColor='#D8DBF0';this.style.color='#4A4F7A'">รายละเอียด</button>
        ${canBook&&r.status!=='occupied'?`<button onclick="event.stopPropagation();navigate('book')" style="flex:1;padding:8px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;transition:opacity .12s" onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">จองห้องนี้</button>`:`<button disabled style="flex:1;padding:8px;background:#F4F5FA;color:#C2C7E0;border:.5px solid #E8EAF0;border-radius:8px;font-size:11px;font-weight:500;cursor:not-allowed;font-family:Sarabun,sans-serif">${r.status==='occupied'?'ไม่ว่าง':'จองห้อง'}</button>`}
      </div>
    </div>
  </div>`;}

function filterRooms(q){
  const g=document.getElementById('roomsGrid');
  if(!g)return;
  const f=ROOMS.filter(r=>r.name.includes(q)||r.id.includes(q)||r.id.includes(q));
  g.innerHTML=f.length?f.map(roomCard).join(''):`<div style="grid-column:1/-1;text-align:center;padding:40px;color:#8890B5;font-size:13px">ไม่พบห้องที่ค้นหา</div>`;
}
function setRF(f,btn){
  document.querySelectorAll('.fchip').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  const g=document.getElementById('roomsGrid');
  if(g)g.innerHTML=(f==='all'?ROOMS:ROOMS.filter(r=>r.status===f)).map(roomCard).join('');
}
function showRoomDetail(id){
  const r=ROOMS.find(x=>x.id===id);
  openModal(`รายละเอียด ${r.name}`,
    `<div style="height:80px;background:${r.grad};border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;position:relative">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.5"><rect x="2" y="7" width="20" height="14"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
      <div style="position:absolute;bottom:8px;right:10px;background:rgba(0,0,0,.35);color:white;font-size:10px;padding:2px 8px;border-radius:5px">${{available:'ว่าง',occupied:'ไม่ว่าง',pending:'รอ'}[r.status]}</div></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px"><span class="chip chip-a">${r.cap} ที่นั่ง</span><span class="chip chip-a">ชั้น ${r.floor}</span></div>
    <div style="font-size:11px;font-weight:500;color:#4A4F7A;margin-bottom:8px">อุปกรณ์ในห้อง</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
      ${(()=>{
        const eq=r.equipment||{projector:1,whiteboard:1,ac:2,mic:1,tv:1,plug:6,sound:1};
        return [
          ['proj','Projector',eq.projector||1,'เครื่อง'],
          ['wb','Whiteboard',eq.whiteboard||1,'แผ่น'],
          ['gear','A/C',eq.ac||2,'เครื่อง'],
          ['mic','ไมโครโฟน',eq.mic||1,'ตัว'],
          ['user','โต๊ะ-เก้าอี้',r.cap||20,'ชุด'],
          ['plug','ปลั๊กไฟ',eq.plug||6,'จุด'],
          ['monitor','จอ TV',eq.tv||1,'เครื่อง'],
          ['bell','ระบบเสียง',eq.sound||1,'ชุด'],
        ].map(([k,l,qty,unit])=>`<div style="background:#F4F5FA;border:.5px solid #D8DBF0;border-radius:8px;padding:8px 6px;text-align:center">
          <div style="display:flex;justify-content:center;color:#38419D;margin-bottom:4px">${IC[k]||''}</div>
          <div style="font-size:10px;font-weight:500;color:#1A1D3A;margin-bottom:2px">${l}</div>
          <div style="font-size:11px;font-weight:600;color:#38419D">${qty} ${unit}</div>
        </div>`).join('');
      })()}
    </div>`,
    `<button class="btn btn-o" onclick="closeModal()">ปิด</button>${state.role==='teacher'||state.role==='student'||state.role==='head'?`<button class="btn btn-p" onclick="closeModal();navigate('book')">จองห้องนี้</button>`:``}`);
}
