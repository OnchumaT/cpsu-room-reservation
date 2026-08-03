const USERS=[
  {id:'U001',name:'ผศ.ดร.สมชาย วงศ์ดี',email:'somchai.w@su.ac.th',role:'teacher',status:'active',joined:'2024-01-10'},
  {id:'U002',name:'อ.วรรณา สุขใจ',email:'wanna.s@su.ac.th',role:'teacher',status:'active',joined:'2024-01-10'},
  {id:'U003',name:'นายพงศ์ธร มีสุข',email:'pongthon.m@student.su.ac.th',role:'student',status:'active',joined:'2024-06-01'},
  {id:'U004',name:'น.ส.กมลชนก จริงจิต',email:'kamonchok.j@student.su.ac.th',role:'student',status:'active',joined:'2024-06-01'},
  {id:'U005',name:'นายธีรภัทร ดีงาม',email:'theerapatr.d@student.su.ac.th',role:'student',status:'inactive',joined:'2024-06-01'},
  {id:'U006',name:'น.ส.วิภา สมใจ',email:'vipa.s@su.ac.th',role:'staff',status:'active',joined:'2024-01-10'},
  {id:'U007',name:'นายสกล รักดี',email:'sakol.r@su.ac.th',role:'staff',status:'active',joined:'2024-01-10'},
  {id:'U008',name:'รศ.ดร.สุรเดช ปัญญาวัฒน์',email:'suradet.p@su.ac.th',role:'head',status:'active',joined:'2024-01-10'},
];

function renderUsers(){
  const roleLabel={teacher:'อาจารย์',student:'นักศึกษา',staff:'เจ้าหน้าที่',admin:'ผู้ดูแล',head:'หัวหน้าภาควิชา'};
  const roleColor={teacher:'#38419D',student:'#1e40af',staff:'#166534',admin:'#92400e',head:'#6b21a8'};
  const roleBg={teacher:'#EEF0FF',student:'#DBEAFE',staff:'#dcfce7',admin:'#FEF3C7',head:'#F3E8FF'};
  return`
  <div class="sec-hdr">
    <span class="sec-ttl">จัดการผู้ใช้ (${USERS.length} คน)</span>
    <button class="btn btn-p" onclick="showAddUser()">+ เพิ่มผู้ใช้</button>
  </div>
  <div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>รหัส</th><th>ชื่อ-นามสกุล</th><th>อีเมล</th><th>บทบาท</th><th>สถานะ</th><th>วันที่เพิ่ม</th><th>ดำเนินการ</th></tr></thead>
    <tbody>${USERS.map(u=>`<tr>
      <td style="font-weight:500;color:#38419D">${u.id}</td>
      <td style="font-weight:500">${u.name}</td>
      <td style="font-size:11px;color:#4A4F7A">${u.email}</td>
      <td><span style="font-size:10px;font-weight:500;padding:3px 9px;border-radius:20px;background:${roleBg[u.role]};color:${roleColor[u.role]}">${roleLabel[u.role]}</span></td>
      <td><span style="font-size:10px;font-weight:500;padding:3px 9px;border-radius:20px;background:${u.status==='active'?'#dcfce7':'#fee2e2'};color:${u.status==='active'?'#166534':'#991b1b'}">${u.status==='active'?'ใช้งาน':'ระงับ'}</span></td>
      <td style="font-size:11px;color:#4A4F7A">${u.joined}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-o" style="padding:4px 10px;font-size:10px" onclick="showEditUser('${u.id}')">แก้ไข</button>
        <button class="btn" style="padding:4px 10px;font-size:10px;background:${u.status==='active'?'#FEF3C7':'#dcfce7'};color:${u.status==='active'?'#92400e':'#166534'};border:none;border-radius:6px;cursor:pointer" onclick="toggleUser('${u.id}')">${u.status==='active'?'ระงับ':'เปิดใช้'}</button>
      </div></td>
    </tr>`).join('')}
    </tbody></table></div>`;}

function showAddUser(){
  openModal('เพิ่มผู้ใช้ใหม่',
    `<div class="form-group"><label class="form-label">ชื่อ-นามสกุล *</label><input class="form-control" id="newName" placeholder="ชื่อ-นามสกุล"></div>
     <div class="form-group"><label class="form-label">อีเมล (@su.ac.th) *</label><input class="form-control" id="newEmail" placeholder="email@su.ac.th"></div>
     <div class="form-group"><label class="form-label">บทบาท *</label>
       <select class="form-control" id="newRole">
         <option value="teacher">อาจารย์</option>
         <option value="student">นักศึกษา</option>
         <option value="staff">เจ้าหน้าที่</option>
         <option value="head">หัวหน้าภาควิชา</option>
       </select>
     </div>`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-p" onclick="addUser()">เพิ่มผู้ใช้</button>`);
}
function addUser(){
  const name=document.getElementById('newName')?.value?.trim();
  const email=document.getElementById('newEmail')?.value?.trim();
  const role=document.getElementById('newRole')?.value;
  if(!name||!email){toast('กรุณากรอกข้อมูลให้ครบ','e');return;}
  const id='U00'+(USERS.length+1);
  USERS.push({id,name,email,role,status:'active',joined:new Date().toISOString().slice(0,10)});
  closeModal();toast('เพิ่มผู้ใช้เรียบร้อย','s');navigate('users');
}
function showEditUser(id){
  const u=USERS.find(x=>x.id===id);
  openModal('แก้ไขข้อมูลผู้ใช้',
    `<div class="form-group"><label class="form-label">ชื่อ-นามสกุล</label><input class="form-control" id="editName" value="${u.name}"></div>
     <div class="form-group"><label class="form-label">อีเมล</label><input class="form-control" value="${u.email}" readonly style="background:#F4F5FA"></div>
     <div class="form-group"><label class="form-label">บทบาท</label>
       <select class="form-control" id="editRole">
         ${['teacher','student','staff','head'].map(r=>`<option value="${r}"${u.role===r?' selected':''}>${{teacher:'อาจารย์',student:'นักศึกษา',staff:'เจ้าหน้าที่',head:'หัวหน้าภาควิชา'}[r]}</option>`).join('')}
       </select>
     </div>`,
    `<button class="btn btn-o" onclick="closeModal()">ยกเลิก</button>
     <button class="btn btn-p" onclick="saveUser('${id}')">บันทึก</button>`);
}
function saveUser(id){
  const u=USERS.find(x=>x.id===id);
  u.name=document.getElementById('editName')?.value||u.name;
  u.role=document.getElementById('editRole')?.value||u.role;
  closeModal();toast('บันทึกข้อมูลเรียบร้อย','s');navigate('users');
}
function toggleUser(id){
  const u=USERS.find(x=>x.id===id);
  u.status=u.status==='active'?'inactive':'active';
  toast(u.status==='active'?'เปิดใช้งานแล้ว':'ระงับบัญชีแล้ว','i');
  navigate('users');
}
