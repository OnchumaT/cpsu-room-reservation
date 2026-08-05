import { useState } from 'react';
import { container } from '../../shared/di/container.js';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const ROLE_LABEL = { teacher: 'อาจารย์', student: 'นักศึกษา', staff: 'เจ้าหน้าที่', admin: 'ผู้ดูแล' };
const ROLE_COLOR = { teacher: '#38419D', student: '#1e40af', staff: '#166534', admin: '#92400e' };
const ROLE_BG = { teacher: '#EEF0FF', student: '#DBEAFE', staff: '#dcfce7', admin: '#FEF3C7' };
const EDITABLE_ROLES = ['teacher', 'staff', 'admin'];

const ROLE_FILTERS = [
  ['all', 'ทั้งหมด'], ['teacher', 'อาจารย์'], ['staff', 'เจ้าหน้าที่'], ['admin', 'ผู้ดูแลระบบ'],
];

const { userRepository } = container.repositories;
const { createUserUseCase, updateUserUseCase, toggleUserStatusUseCase } = container.useCases;

/** Admin-only user management. */
export function UsersView() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { loading, error, refetch } = useRepository(() => userRepository.refresh());
  const [filterRole, setFilterRole] = useState('all');

  function showAddModal() {
    const form = { name: '', email: '', password: '', role: 'teacher' };
    openModal(
      'เพิ่มผู้ใช้ใหม่',
      <>
        <div className="form-group"><label className="form-label">ชื่อ-นามสกุล *</label><input className="form-control" placeholder="ชื่อ-นามสกุล" onChange={(e) => { form.name = e.target.value; }} /></div>
        <div className="form-group"><label className="form-label">อีเมล (@su.ac.th) *</label><input className="form-control" placeholder="email@su.ac.th" onChange={(e) => { form.email = e.target.value; }} /></div>
        <div className="form-group"><label className="form-label">รหัสผ่านเริ่มต้น *</label><input className="form-control" type="password" placeholder="อย่างน้อย 8 ตัวอักษร" onChange={(e) => { form.password = e.target.value; }} /></div>
        <div className="form-group">
          <label className="form-label">บทบาท *</label>
          <select className="form-control" defaultValue="teacher" onChange={(e) => { form.role = e.target.value; }}>
            <option value="teacher">อาจารย์</option>
            <option value="staff">เจ้าหน้าที่</option>
            <option value="admin">ผู้ดูแลระบบ</option>
          </select>
        </div>
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ยกเลิก</button>
        <button
          className="btn btn-p"
          onClick={async () => {
            try {
              const result = await createUserUseCase.execute({ name: form.name.trim(), email: form.email.trim(), role: form.role, password: form.password });
              if (!result.success) { showToast('กรุณากรอกข้อมูลให้ครบ', 'e'); return; }
              closeModal();
              showToast('เพิ่มผู้ใช้เรียบร้อย', 's');
              refetch();
            } catch (err) {
              showToast(err.message || 'เพิ่มผู้ใช้ไม่สำเร็จ', 'e');
            }
          }}
        >
          เพิ่มผู้ใช้
        </button>
      </>,
    );
  }

  function showEditModal(id) {
    const user = userRepository.findById(id);
    if (!user) return;
    const form = { name: user.name, role: user.role };
    openModal(
      'แก้ไขข้อมูลผู้ใช้',
      <>
        <div className="form-group"><label className="form-label">ชื่อ-นามสกุล</label><input className="form-control" defaultValue={user.name} onChange={(e) => { form.name = e.target.value; }} /></div>
        <div className="form-group"><label className="form-label">อีเมล</label><input className="form-control" defaultValue={user.email} readOnly style={{ background: '#F4F5FA' }} /></div>
        <div className="form-group">
          <label className="form-label">บทบาท</label>
          <select className="form-control" defaultValue={user.role} onChange={(e) => { form.role = e.target.value; }}>
            {EDITABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ยกเลิก</button>
        <button
          className="btn btn-p"
          onClick={async () => {
            await updateUserUseCase.execute({ userId: id, name: form.name, role: form.role });
            closeModal();
            showToast('บันทึกข้อมูลเรียบร้อย', 's');
            refetch();
          }}
        >
          บันทึก
        </button>
      </>,
    );
  }

  async function toggleStatus(id) {
    const result = await toggleUserStatusUseCase.execute({ userId: id });
    if (!result.success) return;
    showToast(result.user.isActive() ? 'เปิดใช้งานแล้ว' : 'ระงับบัญชีแล้ว', 'i');
    refetch();
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  // This page manages teacher/staff/admin accounts only — student accounts
  // aren't shown or creatable here (they still exist and can book rooms,
  // just aren't administered from this screen).
  const all = userRepository.getAll().filter((u) => u.role !== 'student');
  const users = filterRole === 'all' ? all : all.filter((u) => u.role === filterRole);

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-ttl">จัดการผู้ใช้ ({users.length} คน)</span>
        <button className="btn btn-p" onClick={showAddModal}>+ เพิ่มผู้ใช้</button>
      </div>
      <div className="filter-row">
        {ROLE_FILTERS.map(([key, label]) => (
          <button key={key} className={`fchip${filterRole === key ? ' on' : ''}`} onClick={() => setFilterRole(key)}>{label}</button>
        ))}
      </div>
      {users.length ? (
      <div className="tbl-wrap">
        <table className="tbl tbl-lg">
          <thead><tr><th>รหัส</th><th>ชื่อ-นามสกุล</th><th>อีเมล</th><th>บทบาท</th><th>สถานะ</th><th>วันที่เพิ่ม</th><th>ดำเนินการ</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500, color: '#38419D' }}>{u.id}</td>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td style={{ fontSize: '13px', color: '#4A4F7A' }}>{u.email}</td>
                <td><span style={{ fontSize: '12px', fontWeight: 500, padding: '5px 13px', borderRadius: '20px', background: ROLE_BG[u.role], color: ROLE_COLOR[u.role] }}>{ROLE_LABEL[u.role]}</span></td>
                <td><span style={{ fontSize: '12px', fontWeight: 500, padding: '5px 13px', borderRadius: '20px', background: u.isActive() ? '#dcfce7' : '#fee2e2', color: u.isActive() ? '#166534' : '#991b1b' }}>{u.isActive() ? 'ใช้งาน' : 'ระงับ'}</span></td>
                <td style={{ fontSize: '13px', color: '#4A4F7A' }}>{u.joined}</td>
                <td>
                  <div style={{ display: 'flex', gap: '7px' }}>
                    <button className="btn btn-o" style={{ padding: '7px 14px', fontSize: '12.5px' }} onClick={() => showEditModal(u.id)}>แก้ไข</button>
                    <button style={{ padding: '7px 14px', fontSize: '12.5px', fontWeight: 500, fontFamily: 'Sarabun,sans-serif', background: u.isActive() ? '#FEF3C7' : '#dcfce7', color: u.isActive() ? '#92400e' : '#166534', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => toggleStatus(u.id)}>{u.isActive() ? 'ระงับ' : 'เปิดใช้'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8890B5', fontSize: '12.5px', background: '#fff', border: '.5px solid #D8DBF0', borderRadius: '12px' }}>ไม่มีรายการ</div>
      )}
    </>
  );
}
