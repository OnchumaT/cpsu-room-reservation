function renderProfile(){const ri=ROLE_INFO[state.role];return`<div style="max-width:440px">
  <div style="background:linear-gradient(135deg,#2A2262,#3887BE);border-radius:12px;padding:18px;margin-bottom:12px;color:white;display:flex;align-items:center;gap:14px">
    <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">${ri.short}</div>
    <div><div style="font-size:15px;font-weight:500">${ri.name}</div><div style="font-size:11px;opacity:.75;margin-top:2px">${ri.label} · ภาควิชาวิทยาการคอมพิวเตอร์</div></div>
  </div>
  <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px">
    <div class="form-group"><label class="form-label">ชื่อ-นามสกุล</label><input class="form-control" value="${ri.name}"></div>
    <div class="form-group"><label class="form-label">อีเมล (มหาวิทยาลัย)</label><input class="form-control" value="${ri.name.toLowerCase().replace(/[\s.]/g,'_')}@su.ac.th" readonly></div>
    <div class="form-group"><label class="form-label">รหัสผ่านใหม่</label><input class="form-control" type="password" placeholder="เว้นว่างถ้าไม่ต้องการเปลี่ยน"></div>
    <button class="btn btn-p" style="width:100%" onclick="toast('บันทึกเรียบร้อย','s')">บันทึก</button>
  </div></div>`;}
