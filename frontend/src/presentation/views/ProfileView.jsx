import { ROLE_INFO } from '../../shared/constants.js';
import { useAuth } from '../context/AuthContext.jsx';

export function ProfileView() {
  const { user, role, canApprove } = useAuth();
  const info = ROLE_INFO[role];

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ background: 'linear-gradient(135deg,#2A2262,#3887BE)', borderRadius: '12px', padding: '22px 24px', marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 700, flexShrink: 0 }}>{user.name.trim().charAt(0)}</div>
        <div>
          <div style={{ fontSize: '19px', fontWeight: 600 }}>{user.name}</div>
          <div style={{ fontSize: '12.5px', opacity: .8, marginTop: '4px' }}>{info.label}{canApprove ? ' · มีสิทธิ์อนุมัติ' : ''} · ภาควิชาวิทยาการคอมพิวเตอร์</div>
        </div>
      </div>

      <div style={{ background: '#FFFFFF', border: '.5px solid #D8DBF0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#8890B5', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '14px' }}>ข้อมูลบัญชี</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">ชื่อ-นามสกุล</label><input className="form-control" value={user.name} readOnly style={{ background: '#F4F5FA' }} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">อีเมล</label><input className="form-control" value={user.email} readOnly style={{ background: '#F4F5FA' }} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">ประเภทผู้ใช้งาน</label><input className="form-control" value={`${info.label}${canApprove ? ' (มีสิทธิ์อนุมัติ)' : ''}`} readOnly style={{ background: '#F4F5FA' }} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">สถานะบัญชี</label><input className="form-control" value={user.isActive() ? 'ใช้งาน' : 'ระงับการใช้งาน'} readOnly style={{ background: '#F4F5FA' }} /></div>
        </div>
        <div style={{ background: '#EEF0FF', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#38419D', marginTop: '16px' }}>การแก้ไขข้อมูลส่วนตัว/รหัสผ่านยังไม่เปิดให้ใช้งานในเวอร์ชันนี้ — ติดต่อผู้ดูแลระบบหากต้องการเปลี่ยนแปลง</div>
      </div>
    </div>
  );
}
