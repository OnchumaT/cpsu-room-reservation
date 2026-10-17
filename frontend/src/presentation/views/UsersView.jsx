import { useState } from 'react';
import { container } from '../../shared/di/container.js';
import { useModal } from '../context/ModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';
import { isLeadPosition, isSingleHolderPosition } from '../../domain/policies/DepartmentLeadPolicy.js';

const ROLE_LABEL = { teacher: 'อาจารย์', staff: 'เจ้าหน้าที่', admin: 'ผู้ดูแล', pending: 'รออนุมัติ' };
const ROLE_COLOR = { teacher: '#38419D', staff: '#166534', admin: '#92400e', pending: '#9a3412' };
const ROLE_BG = { teacher: '#EEF0FF', staff: '#dcfce7', admin: '#FEF3C7', pending: '#FFEDD5' };
// 'pending' is intentionally not assignable here — it's system-only (a
// fresh Google self-signup, see AuthService.loginWithGoogle); picking one
// of these roles for a pending user *is* the approval action.
const EDITABLE_ROLES = ['teacher', 'staff', 'admin'];

const ROLE_FILTERS = [
  ['all', 'ทั้งหมด'], ['pending', 'รออนุมัติ'], ['teacher', 'อาจารย์'], ['staff', 'เจ้าหน้าที่'], ['admin', 'ผู้ดูแลระบบ'],
];

const { userRepository, managementPositionRepository } = container.repositories;
const { createUserUseCase, updateUserUseCase, toggleUserStatusUseCase, deleteUserUseCase } = container.useCases;

/** Admin-only user management. */
export function UsersView() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { loading, error, refetch } = useRepository(() => Promise.all([userRepository.refresh(), managementPositionRepository.refresh()]));
  const [filterRole, setFilterRole] = useState('all');

  function showAddModal() {
    const form = { name: '', email: '', password: '', role: 'teacher' };
    openModal(
      'เพิ่มผู้ใช้ใหม่',
      <>
        <div className="form-group"><label className="form-label">ชื่อ-นามสกุล *</label><input className="form-control" placeholder="ชื่อ-นามสกุล" onChange={(e) => { form.name = e.target.value; }} /></div>
        <div className="form-group"><label className="form-label">อีเมล (@su.ac.th หรือ @silpakorn.edu) *</label><input className="form-control" placeholder="email@su.ac.th" onChange={(e) => { form.email = e.target.value; }} /></div>
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
    const isPending = user.role === 'pending';
    const form = { name: user.name, role: isPending ? EDITABLE_ROLES[0] : user.role };
    const leadPositions = managementPositionRepository.getAll().filter(isLeadPosition);
    const currentLeadId = user.positions.find(isLeadPosition)?.id ?? null;
    form.leadPositionId = currentLeadId;
    openModal(
      'แก้ไขข้อมูลผู้ใช้',
      <>
        {isPending && (
          <div style={{ background: '#FFEDD5', color: '#9a3412', borderRadius: '8px', padding: '9px 12px', fontSize: '11.5px', marginBottom: '14px' }}>
            ผู้ใช้นี้รออนุมัติ — เลือกบทบาทแล้วบันทึกเพื่ออนุมัติ
          </div>
        )}
        <div className="form-group"><label className="form-label">ชื่อ-นามสกุล</label><input className="form-control" defaultValue={user.name} onChange={(e) => { form.name = e.target.value; }} /></div>
        <div className="form-group"><label className="form-label">อีเมล</label><input className="form-control" defaultValue={user.email} readOnly style={{ background: '#F4F5FA' }} /></div>
        <div className="form-group">
          <label className="form-label">บทบาท</label>
          <select className="form-control" defaultValue={form.role} onChange={(e) => { form.role = e.target.value; }}>
            {EDITABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        {leadPositions.length > 0 && (
          <div className="form-group">
            <label className="form-label">ตำแหน่งบริหาร</label>
            <select className="form-control" defaultValue={currentLeadId ?? ''} onChange={(e) => { form.leadPositionId = e.target.value ? Number(e.target.value) : null; }}>
              <option value="">— ไม่มี —</option>
              {leadPositions.map((p) => {
                const holder = isSingleHolderPosition(p) && userRepository.getAll().find((u) => u.id !== id && u.holdsPosition(p.id));
                return <option key={p.id} value={p.id}>{p.positionName}{holder ? ` (ปัจจุบัน: ${holder.name})` : ''}</option>;
              })}
            </select>
            <div style={{ fontSize: '11px', color: '#8890B5', marginTop: '5px' }}>หัวหน้าภาควิชามีได้คนเดียว — ถ้าเลือกตอนที่มีคนถืออยู่ ตำแหน่งจะย้ายมาที่ผู้ใช้นี้ · รองหัวหน้าภาควิชามีได้หลายคน</div>
          </div>
        )}
      </>,
      <>
        <button className="btn btn-o" onClick={closeModal}>ยกเลิก</button>
        <button
          className="btn btn-p"
          onClick={async () => {
            const newLeadId = form.leadPositionId;
            const newLead = leadPositions.find((p) => p.id === newLeadId);
            if (newLead && newLeadId !== currentLeadId && isSingleHolderPosition(newLead)) {
              const holders = userRepository.getAll().filter((u) => u.id !== id && u.holdsPosition(newLeadId));
              if (holders.length && !confirm(`ตำแหน่ง${newLead.positionName}ตอนนี้เป็นของ ${holders.map((u) => u.name).join(', ')}\nต้องการย้ายมาให้ ${user.name} ใช่หรือไม่?`)) return;
            }
            try {
              await updateUserUseCase.execute({ userId: id, name: form.name, role: form.role });
              // Assigning a lead position also drops this user's other lead position and,
              // for หัวหน้าภาควิชา, clears it from its old holder — server-side (DepartmentLeadPolicy).
              if (newLeadId !== currentLeadId) {
                if (newLeadId != null) await managementPositionRepository.assign(id, newLeadId);
                else await managementPositionRepository.unassign(id, currentLeadId);
              }
            } catch (err) {
              showToast(err.message || 'บันทึกข้อมูลไม่สำเร็จ', 'e');
              refetch();
              return;
            }
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

  async function deleteUser(id) {
    const user = userRepository.findById(id);
    if (!user) return;
    if (!confirm(`ต้องการลบผู้ใช้ "${user.name}" ถาวรใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    try {
      await deleteUserUseCase.execute({ userId: id });
      showToast('ลบผู้ใช้เรียบร้อย', 's');
      refetch();
    } catch (err) {
      showToast(err.message || 'ลบผู้ใช้ไม่สำเร็จ', 'e');
    }
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const all = userRepository.getAll();
  const positions = managementPositionRepository.getAll().filter(isLeadPosition);
  // Filter keys are a role, or `pos:<id>` for holders of a management position.
  const users = all.filter((u) => {
    if (filterRole === 'all') return true;
    if (filterRole.startsWith('pos:')) return u.holdsPosition(Number(filterRole.slice(4)));
    return u.role === filterRole;
  });

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
        {positions.map((p) => (
          <button key={p.id} className={`fchip${filterRole === `pos:${p.id}` ? ' on' : ''}`} onClick={() => setFilterRole(`pos:${p.id}`)}>{p.positionName}</button>
        ))}
      </div>
      {users.length ? (
      <div className="tbl-wrap">
        <table className="tbl tbl-lg">
          <thead><tr><th>รหัส</th><th>ชื่อ-นามสกุล</th><th>อีเมล</th><th>บทบาท</th><th>ตำแหน่งบริหาร</th><th>สถานะ</th><th>วันที่เพิ่ม</th><th>ดำเนินการ</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500, color: '#38419D' }}>{u.id}</td>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td style={{ fontSize: '13px', color: '#4A4F7A' }}>{u.email}</td>
                <td><span style={{ fontSize: '12px', fontWeight: 500, padding: '5px 13px', borderRadius: '20px', whiteSpace: 'nowrap', display: 'inline-block', background: ROLE_BG[u.role], color: ROLE_COLOR[u.role] }}>{ROLE_LABEL[u.role]}</span></td>
                <td>
                  {u.positions.some(isLeadPosition)
                    ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>{u.positions.filter(isLeadPosition).map((p) => (
                      <span key={p.id} style={{ fontSize: '12px', fontWeight: 500, padding: '5px 11px', borderRadius: '20px', whiteSpace: 'nowrap', background: p.canApprove ? '#F3E8FF' : '#F1F5F9', color: p.canApprove ? '#6B21A8' : '#475569' }}>{p.positionName}</span>
                    ))}</div>
                    : <span style={{ color: '#C2C7E0' }}>—</span>}
                </td>
                <td><span style={{ fontSize: '12px', fontWeight: 500, padding: '5px 13px', borderRadius: '20px', whiteSpace: 'nowrap', display: 'inline-block', background: u.isActive() ? '#dcfce7' : '#fee2e2', color: u.isActive() ? '#166534' : '#991b1b' }}>{u.isActive() ? 'ใช้งาน' : 'ระงับ'}</span></td>
                <td style={{ fontSize: '13px', color: '#4A4F7A', whiteSpace: 'nowrap' }}>{u.joined}</td>
                <td>
                  <div style={{ display: 'flex', gap: '7px' }}>
                    <button className="btn btn-o" style={{ padding: '7px 14px', fontSize: '12.5px' }} onClick={() => showEditModal(u.id)}>แก้ไข</button>
                    <button style={{ padding: '7px 14px', fontSize: '12.5px', fontWeight: 500, fontFamily: 'Sarabun,sans-serif', background: u.isActive() ? '#FEF3C7' : '#dcfce7', color: u.isActive() ? '#92400e' : '#166534', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => toggleStatus(u.id)}>{u.isActive() ? 'ระงับ' : 'เปิดใช้'}</button>
                    <button style={{ padding: '7px 14px', fontSize: '12.5px', fontWeight: 500, fontFamily: 'Sarabun,sans-serif', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => deleteUser(u.id)}>ลบ</button>
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
