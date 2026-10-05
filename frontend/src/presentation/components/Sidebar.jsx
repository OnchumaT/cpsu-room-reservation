import { MENUS, APPROVER_MENU_ITEMS, APPROVER_ANALYTICS_ITEMS, ROLE_INFO } from '../../shared/constants.js';
import { IC } from '../../shared/icons.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';

export function Sidebar() {
  const { user, role, canApprove } = useAuth();
  const { page, navigate, sidebarCollapsed } = useAppShell();
  if (!user) return null;

  const roleInfo = ROLE_INFO[role];
  const items = canApprove
    ? [...MENUS[role], ...APPROVER_MENU_ITEMS, ...(role === 'admin' ? [] : APPROVER_ANALYTICS_ITEMS)]
    : MENUS[role];
  const initial = user.name.trim().charAt(0);

  return (
    <div className={`sidebar${sidebarCollapsed ? ' col' : ''}`} id="sidebar">
      <div className="sb-logo">
        <div className="logo-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
        <div className="logo-tx">CPSU Rooms<small>ภาควิชา CS · ศิลปากร</small></div>
      </div>
      <div className="sb-nav">
        {items.map((item, i) => item.sec
          ? <div className="sec-hd" key={`sec-${i}`}>{item.sec}</div>
          : (
            <div
              className={`ni${page === item.key ? ' on' : ''}`}
              key={item.key}
              onClick={() => navigate(item.key)}
            >
              <span className="ni-ic" dangerouslySetInnerHTML={{ __html: IC[item.ic] || '' }} />
              <span className="nav-lbl">{item.label}</span>
            </div>
          ))}
      </div>
      <div className="sb-user">
        <div className="sb-av" style={{ background: roleInfo.avBg, color: roleInfo.avC }}>{initial}</div>
        <div className="sb-uinfo">
          <div className="sb-uname">{user.name}</div>
          <div className="sb-urole">{roleInfo.label}{canApprove ? ' · มีสิทธิ์อนุมัติ' : ''}</div>
        </div>
      </div>
    </div>
  );
}
