import { ROLE_INFO, PAGE_TITLES } from '../../shared/constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useModal } from '../context/ModalContext.jsx';

export function Topbar() {
  const { user, role, canApprove, logout } = useAuth();
  const { page, navigate, toggleSidebar, unreadCount: unread } = useAppShell();
  const { openModal, closeModal } = useModal();
  if (!user) return null;

  const roleInfo = ROLE_INFO[role];
  const initial = user.name.trim().charAt(0);

  function showAccountMenu() {
    openModal(
      'บัญชีผู้ใช้',
      <div
        style={{ background: 'linear-gradient(135deg,#2A2262,#38419D)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        onClick={() => { closeModal(); navigate('profile'); }}
        title="ไปที่หน้าโปรไฟล์"
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: 'white', flexShrink: 0 }}>{initial}</div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{user.name}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.65)', marginTop: '2px' }}>{roleInfo.label}{canApprove ? ' · มีสิทธิ์อนุมัติ' : ''}</div>
          <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,.5)', marginTop: '1px' }}>{user.email}</div>
        </div>
      </div>,
      <>
        <button className="btn btn-o" onClick={() => { closeModal(); navigate('profile'); }}>โปรไฟล์</button>
        <button className="btn btn-d" onClick={() => { closeModal(); logout(); }}>ออกจากระบบ</button>
      </>,
    );
  }

  return (
    <div className="topbar">
      <div className="tog" onClick={toggleSidebar}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
      </div>
      <div className="tb-title">{PAGE_TITLES[page] || ''}</div>
      <div className="tb-right">
        <div className="nb" onClick={() => navigate('notifications')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
          {unread > 0 && <div className="nb-dot" style={{ display: 'flex' }}>{unread}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer' }} onClick={showAccountMenu}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#4A4F7A', fontWeight: 500 }}>{roleInfo.label}</div>
          </div>
          <div
            className="av"
            style={{ background: roleInfo.avBg, color: roleInfo.avC, width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            {initial}
          </div>
        </div>
      </div>
    </div>
  );
}
