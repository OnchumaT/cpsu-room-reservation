import { openModal, closeModal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';

const ROLE_LABEL = { teacher: 'อาจารย์', student: 'นักศึกษา', staff: 'เจ้าหน้าที่', admin: 'ผู้ดูแล' };
const ROLE_COLOR = { teacher: '#38419D', student: '#1e40af', staff: '#166534', admin: '#92400e' };
const ROLE_BG = { teacher: '#EEF0FF', student: '#DBEAFE', staff: '#dcfce7', admin: '#FEF3C7' };
const EDITABLE_ROLES = ['teacher', 'student', 'staff', 'admin'];

/** Admin-only user management. */
export function createUsersView({
  userRepository, createUserUseCase, updateUserUseCase, toggleUserStatusUseCase, router,
}) {
  async function load() {
    await userRepository.refresh();
  }

  function render() {
    const users = userRepository.getAll();
    return `
    <div class="sec-hdr">
      <span class="sec-ttl">จัดการผู้ใช้ (${users.length} คน)</span>
      <button class="btn btn-p" onclick="App.showAddUser()">+ เพิ่มผู้ใช้</button>
    </div>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>รหัส</th><th>ชื่อ-นามสกุล</th><th>อีเมล</th><th>บทบาท</th><th>สถานะ</th><th>วันที่เพิ่ม</th><th>ดำเนินการ</th></tr></thead>
      <tbody>${users.map((u) => `<tr>
        <td style="font-weight:500;color:#38419D">${u.id}</td>
        <td style="font-weight:500">${u.name}</td>
        <td style="font-size:11px;color:#4A4F7A">${u.email}</td>
        <td><span style="font-size:10px;font-weight:500;padding:3px 9px;border-radius:20px;background:${ROLE_BG[u.role]};color:${ROLE_COLOR[u.role]}">${ROLE_LABEL[u.role]}</span></td>
        <td><span style="font-size:10px;font-weight:500;padding:3px 9px;border-radius:20px;background:${u.isActive() ? '#dcfce7' : '#fee2e2'};color:${u.isActive() ? '#166534' : '#991b1b'}">${u.isActive() ? 'ใช้งาน' : 'ระงับ'}</span></td>
        <td style="font-size:11px;color:#4A4F7A">${u.joined}</td>
        <td><div style="display:flex;gap:4px">
          <button class="btn btn-o" style="padding:4px 10px;font-size:10px" onclick="App.showEditUser('${u.id}')">แก้ไข</button>
          <button class="btn" style="padding:4px 10px;font-size:10px;background:${u.isActive() ? '#FEF3C7' : '#dcfce7'};color:${u.isActive() ? '#92400e' : '#166534'};border:none;border-radius:6px;cursor:pointer" onclick="App.toggleUserStatus('${u.id}')">${u.isActive() ? 'ระงับ' : 'เปิดใช้'}</button>
        </div></td>
      </tr>`).join('')}
      </tbody></table></div>`;
  }

  function showAddModal() {
    openModal(
      'เพิ่มผู้ใช้ใหม่',
      `<div class="form-group"><label class="form-label">ชื่อ-นามสกุล *</label><input class="form-control" id="newName" placeholder="ชื่อ-นามสกุล"></div>
       <div class="form-group"><label class="form-label">อีเมล (@su.ac.th) *</label><input class="form-control" id="newEmail" placeholder="email@su.ac.th"></div>
       <div class="form-group"><label class="form-label">รหัสผ่านเริ่มต้น *</label><input class="form-control" id="newPassword" type="password" placeholder="อย่างน้อย 8 ตัวอักษร"></div>
       <div class="form-group"><label class="form-label">บทบาท *</label>
         <select class="form-control" id="newRole">
           <option value="teacher">อาจารย์</option>
           <option value="student">นักศึกษา</option>
           <option value="staff">เจ้าหน้าที่</option>
           <option value="admin">ผู้ดูแลระบบ</option>
         </select>
       </div>`,
      `<button class="btn btn-o" onclick="App.closeModal()">ยกเลิก</button>
       <button class="btn btn-p" onclick="App.addUser()">เพิ่มผู้ใช้</button>`,
    );
  }

  async function add() {
    const name = document.getElementById('newName')?.value?.trim();
    const email = document.getElementById('newEmail')?.value?.trim();
    const password = document.getElementById('newPassword')?.value;
    const role = document.getElementById('newRole')?.value;
    try {
      const result = await createUserUseCase.execute({ name, email, role, password });
      if (!result.success) { showToast('กรุณากรอกข้อมูลให้ครบ', 'e'); return; }
      refresh('เพิ่มผู้ใช้เรียบร้อย', 's');
    } catch (err) {
      showToast(err.message || 'เพิ่มผู้ใช้ไม่สำเร็จ', 'e');
    }
  }

  function showEditModal(id) {
    const user = userRepository.findById(id);
    if (!user) return;
    openModal(
      'แก้ไขข้อมูลผู้ใช้',
      `<div class="form-group"><label class="form-label">ชื่อ-นามสกุล</label><input class="form-control" id="editName" value="${user.name}"></div>
       <div class="form-group"><label class="form-label">อีเมล</label><input class="form-control" value="${user.email}" readonly style="background:#F4F5FA"></div>
       <div class="form-group"><label class="form-label">บทบาท</label>
         <select class="form-control" id="editRole">
           ${EDITABLE_ROLES.map((r) => `<option value="${r}"${user.role === r ? ' selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}
         </select>
       </div>`,
      `<button class="btn btn-o" onclick="App.closeModal()">ยกเลิก</button>
       <button class="btn btn-p" onclick="App.saveUser('${id}')">บันทึก</button>`,
    );
  }

  async function save(id) {
    const name = document.getElementById('editName')?.value;
    const role = document.getElementById('editRole')?.value;
    await updateUserUseCase.execute({ userId: id, name, role });
    refresh('บันทึกข้อมูลเรียบร้อย', 's');
  }

  async function toggleStatus(id) {
    const result = await toggleUserStatusUseCase.execute({ userId: id });
    if (!result.success) return;
    showToast(result.user.isActive() ? 'เปิดใช้งานแล้ว' : 'ระงับบัญชีแล้ว', 'i');
    router.navigate('users');
  }

  function refresh(message, type) {
    closeModal();
    showToast(message, type);
    router.navigate('users');
  }

  return { render, load, showAddModal, add, showEditModal, save, toggleStatus };
}
