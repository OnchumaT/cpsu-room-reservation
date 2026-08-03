const TPL_EQ_NAMES={mic:'ไมโครโฟน',wb:'ไวท์บอร์ด',ext:'ปลั๊กพ่วง',hdmi:'สาย HDMI'};

function promptSaveTemplate(){
  const snap=state.lastBookingSnapshot;
  if(!snap){toast('ไม่พบข้อมูลการจองล่าสุด','e');return;}
  const room=ROOMS.find(r=>r.id===snap.room);
  const suggested=snap.purpose+' · ห้อง '+snap.room;
  openModal('บันทึกเป็นรายการโปรด',
    `<div class="form-group"><label class="form-label">ชื่อเทมเพลต *</label><input class="form-control" id="tplName" value="${suggested}" placeholder="เช่น สอน CS301 ห้อง 1637"></div>
     <div style="background:#EEF0FF;border-radius:8px;padding:10px 12px;font-size:11px;color:#38419D">จะไม่บันทึกวันที่และเวลา — ต้องเลือกวันที่และเวลาใหม่ทุกครั้งตอนจองจากเทมเพลตนี้</div>`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-p" onclick="saveTemplateFromSnapshot()">บันทึก</button>`
  );
}
function saveTemplateFromSnapshot(){
  const name=document.getElementById('tplName')?.value?.trim();
  if(!name){toast('กรุณาตั้งชื่อเทมเพลต','e');return;}
  const list=TEMPLATES[state.role];
  if(!list)return;
  const snap=state.lastBookingSnapshot;
  list.unshift({id:'TPL'+Date.now(),name,...snap});
  closeModal();
  toast('บันทึกเทมเพลตเรียบร้อย','s');
}

function bookFromTemplate(id){
  const tpl=TEMPLATES[state.role]?.find(t=>t.id===id);
  if(!tpl){toast('ไม่พบเทมเพลต','e');return;}
  state.templateToApply={...tpl};
  navigate('book');
}

function duplicateTemplate(id){
  const list=TEMPLATES[state.role];
  const tpl=list?.find(t=>t.id===id);
  if(!tpl)return;
  list.unshift({...tpl,id:'TPL'+Date.now(),name:tpl.name+' (สำเนา)'});
  toast('ทำสำเนาเทมเพลตแล้ว','s');
  navigate('templates');
}

function deleteTemplate(id){
  if(!confirm('ต้องการลบเทมเพลตนี้หรือไม่?'))return;
  const list=TEMPLATES[state.role];
  if(!list)return;
  const i=list.findIndex(t=>t.id===id);
  if(i>-1)list.splice(i,1);
  toast('ลบเทมเพลตแล้ว','i');
  navigate('templates');
}

function showRenameTemplate(id){
  const tpl=TEMPLATES[state.role]?.find(t=>t.id===id);
  if(!tpl)return;
  openModal('แก้ไขชื่อเทมเพลต',
    `<div class="form-group"><label class="form-label">ชื่อเทมเพลต *</label><input class="form-control" id="tplRenameInp" value="${tpl.name}"></div>`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-p" onclick="saveRenameTemplate('${id}')">บันทึก</button>`
  );
}
function saveRenameTemplate(id){
  const name=document.getElementById('tplRenameInp')?.value?.trim();
  if(!name){toast('กรุณาตั้งชื่อเทมเพลต','e');return;}
  const tpl=TEMPLATES[state.role]?.find(t=>t.id===id);
  if(!tpl)return;
  tpl.name=name;
  closeModal();
  toast('เปลี่ยนชื่อเทมเพลตแล้ว','s');
  navigate('templates');
}

function showEditTemplate(id){
  const tpl=TEMPLATES[state.role]?.find(t=>t.id===id);
  if(!tpl)return;
  const isT=state.role==='teacher'||state.role==='head';
  window.tplEditEqQty={mic:0,wb:0,ext:0,hdmi:0,...(tpl.equipment||{})};
  window.tplEditFoodItems=[...(tpl.food||[])];
  const purposes=['สอน/บรรยาย','ประชุมกลุ่ม','สอบ','ปฏิบัติการ',...(isT?['จัดสอบโครงงานปริญญานิพนธ์','จัดประชุม']:[]),'อื่นๆ'];
  const facilityHtml=isT?`
    <div style="border-top:0.5px solid #D8DBF0;margin:12px 0 10px"></div>
    <div style="font-size:11px;font-weight:600;color:#4A4F7A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">ขอสิ่งอำนวยความสะดวกเพิ่มเติม</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
      ${Object.entries(TPL_EQ_NAMES).map(([k,nm])=>`
      <div style="background:#F4F5FA;border:0.5px solid #D8DBF0;border-radius:8px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:11px;font-weight:500;color:#1A1D3A">${nm}</span>
        <div style="display:flex;align-items:center;gap:5px">
          <button onclick="chTplEqQty('${k}',-1)" style="width:22px;height:22px;border:0.5px solid #C2C7E0;border-radius:5px;background:#fff;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center">−</button>
          <span id="tplEq-${k}" style="font-size:12px;font-weight:600;min-width:16px;text-align:center;color:#38419D">${window.tplEditEqQty[k]||0}</span>
          <button onclick="chTplEqQty('${k}',1)" style="width:22px;height:22px;border:0.5px solid #C2C7E0;border-radius:5px;background:#fff;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center">+</button>
        </div>
      </div>`).join('')}
    </div>
    <div class="form-group">
      <label class="form-label">อาหาร / เครื่องดื่ม (พิมพ์แล้วกด Enter)</label>
      <div style="border:0.5px solid #C2C7E0;border-radius:8px;overflow:hidden">
        <div style="display:flex">
          <input type="text" id="tplFoodInp" placeholder="เช่น กาแฟร้อน 5 แก้ว..." style="flex:1;border:none;padding:8px 10px;font-size:12px;font-family:Sarabun,sans-serif;outline:none;color:#1A1D3A" onkeydown="if(event.key==='Enter')addTplFood()">
          <button onclick="addTplFood()" style="padding:0 12px;background:#38419D;color:white;border:none;font-size:11px;cursor:pointer;font-family:Sarabun,sans-serif;font-weight:500">+ เพิ่ม</button>
        </div>
        <div id="tplFoodTags" style="display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;background:#F4F5FA;min-height:34px"></div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">หมายเหตุถึงเจ้าหน้าที่</label>
      <textarea class="form-control" id="tplFacilityNote" rows="2" placeholder="เช่น ต้องการก่อน 08:30 น. / มีผู้แพ้อาหาร...">${tpl.facilityNote||''}</textarea>
    </div>`:'';
  openModal('แก้ไขข้อมูลเทมเพลต',
    `<div class="form-group"><label class="form-label">ชื่อเทมเพลต *</label><input class="form-control" id="tplEditName" value="${tpl.name}"></div>
     <div class="form-group"><label class="form-label">ห้อง *</label>
       <select class="form-control" id="tplEditRoom">${ROOMS.map(r=>`<option value="${r.id}"${r.id===tpl.room?' selected':''}>${r.name}</option>`).join('')}</select>
     </div>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
       <div class="form-group"><label class="form-label">วัตถุประสงค์ *</label>
         <select class="form-control" id="tplEditPurpose">${purposes.map(p=>`<option value="${p}"${p===tpl.purpose?' selected':''}>${p}</option>`).join('')}</select>
       </div>
       <div class="form-group"><label class="form-label">จำนวนผู้เข้าร่วม</label>
         <input type="number" class="form-control" id="tplEditParticipants" value="${tpl.participants||10}" min="1" max="20">
       </div>
     </div>
     <div class="form-group"><label class="form-label">รายละเอียดเพิ่มเติม</label>
       <textarea class="form-control" id="tplEditNote" rows="2">${tpl.note||''}</textarea>
     </div>
     ${facilityHtml}`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-p" onclick="saveTemplateEdit('${id}')">บันทึก</button>`
  );
  renderTplFoodTags();
}
function chTplEqQty(k,d){
  if(!window.tplEditEqQty)window.tplEditEqQty={mic:0,wb:0,ext:0,hdmi:0};
  const max={mic:3,wb:2,ext:5,hdmi:4}[k]||5;
  window.tplEditEqQty[k]=Math.max(0,Math.min(max,(window.tplEditEqQty[k]||0)+d));
  const el=document.getElementById('tplEq-'+k);
  if(el)el.textContent=window.tplEditEqQty[k];
}
function addTplFood(){
  if(!window.tplEditFoodItems)window.tplEditFoodItems=[];
  const inp=document.getElementById('tplFoodInp');
  if(!inp)return;
  const val=inp.value.trim();
  if(!val)return;
  window.tplEditFoodItems.push(val);
  inp.value='';
  renderTplFoodTags();
  inp.focus();
}
function removeTplFood(i){
  if(!window.tplEditFoodItems)return;
  window.tplEditFoodItems.splice(i,1);
  renderTplFoodTags();
}
function renderTplFoodTags(){
  const w=document.getElementById('tplFoodTags');
  if(!w)return;
  const items=window.tplEditFoodItems||[];
  w.innerHTML=items.length
    ?items.map((item,i)=>`<div style="display:flex;align-items:center;gap:4px;background:#fff;border:.5px solid #C2C7E0;border-radius:20px;padding:3px 9px;font-size:11px;color:#1A1D3A"><span>${item}</span><span onclick="removeTplFood(${i})" style="color:#8890B5;cursor:pointer;font-size:13px">×</span></div>`).join('')
    :`<span style="font-size:11px;color:#8890B5">ยังไม่มีรายการ</span>`;
}
function saveTemplateEdit(id){
  const tpl=TEMPLATES[state.role]?.find(t=>t.id===id);
  if(!tpl)return;
  const name=document.getElementById('tplEditName')?.value?.trim();
  const room=document.getElementById('tplEditRoom')?.value;
  const purpose=document.getElementById('tplEditPurpose')?.value;
  if(!name||!room||!purpose){toast('กรุณากรอกข้อมูลให้ครบ','e');return;}
  tpl.name=name;
  tpl.room=room;
  tpl.purpose=purpose;
  tpl.participants=document.getElementById('tplEditParticipants')?.value||10;
  tpl.note=document.getElementById('tplEditNote')?.value||'';
  tpl.equipment={...(window.tplEditEqQty||{})};
  tpl.food=[...(window.tplEditFoodItems||[])];
  tpl.facilityNote=document.getElementById('tplFacilityNote')?.value||tpl.facilityNote||'';
  closeModal();
  toast('บันทึกเทมเพลตเรียบร้อย','s');
  navigate('templates');
}

function templateCard(t){
  const room=ROOMS.find(r=>r.id===t.room);
  const eqBadges=Object.entries(t.equipment||{}).filter(([k,v])=>v>0).map(([k,v])=>`${TPL_EQ_NAMES[k]||k} ${v}`);
  const badges=[...eqBadges,...(t.food||[])];
  return`<div style="background:#fff;border-radius:14px;padding:16px 18px;box-shadow:0 1px 3px rgba(42,34,98,.07),0 4px 16px rgba(42,34,98,.05)">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px;min-width:0">
        <div style="width:32px;height:32px;border-radius:8px;background:#EEF0FF;color:#38419D;display:flex;align-items:center;justify-content:center;flex-shrink:0">${IC.bookmark}</div>
        <div style="min-width:0"><div style="font-size:13px;font-weight:600;color:#1A1D3A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</div>
        <div style="font-size:11px;color:#8890B5;margin-top:1px">${room?room.name:'ห้อง '+t.room} · ${t.purpose} · ${t.participants||10} คน</div></div>
      </div>
    </div>
    ${badges.length?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">${badges.map(b=>`<span style="font-size:10px;background:#F4F5FA;color:#4A4F7A;padding:3px 8px;border-radius:20px;border:.5px solid #E8EAF0">${b}</span>`).join('')}</div>`:'<div style="margin-bottom:12px"></div>'}
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button onclick="bookFromTemplate('${t.id}')" style="flex:1;min-width:120px;padding:8px;background:linear-gradient(135deg,#2A2262,#38419D);color:white;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif">จองจากเทมเพลต</button>
      <button onclick="showRenameTemplate('${t.id}')" style="padding:8px 10px;background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:8px;font-size:11px;cursor:pointer;font-family:Sarabun,sans-serif">แก้ไขชื่อ</button>
      <button onclick="showEditTemplate('${t.id}')" style="padding:8px 10px;background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:8px;font-size:11px;cursor:pointer;font-family:Sarabun,sans-serif">แก้ไขข้อมูล</button>
      <button onclick="duplicateTemplate('${t.id}')" style="padding:8px 10px;background:#F4F5FA;color:#4A4F7A;border:.5px solid #D8DBF0;border-radius:8px;font-size:11px;cursor:pointer;font-family:Sarabun,sans-serif">ทำสำเนา</button>
      <button onclick="deleteTemplate('${t.id}')" style="padding:8px 10px;background:#fee2e2;color:#991b1b;border:.5px solid #fca5a5;border-radius:8px;font-size:11px;cursor:pointer;font-family:Sarabun,sans-serif">ลบ</button>
    </div>
  </div>`;
}

function renderTemplates(){
  const list=TEMPLATES[state.role]||[];
  return`
  <div class="sec-hdr"><span class="sec-ttl">เทมเพลตการจองของฉัน (${list.length})</span></div>
  ${list.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">
    ${list.map(templateCard).join('')}
  </div>`:`<div style="text-align:center;padding:50px 20px;color:#8890B5">
    <div style="display:flex;justify-content:center;margin-bottom:10px;color:#D8DBF0">${IC.bookmark}</div>
    <div style="font-size:13px;font-weight:500;color:#4A4F7A;margin-bottom:4px">ยังไม่มีเทมเพลตการจอง</div>
    <div style="font-size:12px;margin-bottom:14px">จองห้องให้สำเร็จ แล้วกด "บันทึกเป็นรายการโปรด" เพื่อสร้างเทมเพลตแรกของคุณ</div>
    <button class="btn btn-p" onclick="navigate('book')">ไปจองห้อง</button>
  </div>`}`;
}
