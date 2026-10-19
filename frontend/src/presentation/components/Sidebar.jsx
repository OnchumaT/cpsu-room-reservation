import { MENUS, APPROVER_MENU_ITEMS, APPROVER_ANALYTICS_ITEMS, ROLE_INFO } from '../../shared/constants.js';
import { IC } from '../../shared/icons.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';

// Must match the drawer breakpoint in public/css/style.css ([หมวด 15] Responsive).
const MOBILE_NAV_QUERY = '(max-width: 900px)';

// MENUS bakes "อื่นๆ" (notifications/profile) in as each role's last group,
// so when canApprove appends more sections (อนุมัติ, วิเคราะห์) after it,
// "อื่นๆ" ends up sandwiched in the middle instead of staying the bottom
// utility group — pull it out and re-append it last, after everything else.
function moveOthersGroupToEnd(items) {
  const start = items.findIndex((item) => item.sec === 'อื่นๆ');
  if (start === -1) return items;
  let end = items.findIndex((item, i) => i > start && item.sec);
  if (end === -1) end = items.length;
  const othersGroup = items.slice(start, end);
  const rest = [...items.slice(0, start), ...items.slice(end)];
  return [...rest, ...othersGroup];
}

export function Sidebar() {
  const { user, role, canApprove } = useAuth();
  const { page, navigate, sidebarCollapsed, toggleSidebar, facilityPendingCount } = useAppShell();
  if (!user) return null;

  const roleInfo = ROLE_INFO[role];
  const items = moveOthersGroupToEnd(canApprove
    ? [...MENUS[role], ...APPROVER_MENU_ITEMS, ...(role === 'admin' ? [] : APPROVER_ANALYTICS_ITEMS)]
    : MENUS[role]);
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
              onClick={() => {
                navigate(item.key);
                // On a phone/iPad the open sidebar covers the page — close it once a page is picked.
                if (sidebarCollapsed && window.matchMedia(MOBILE_NAV_QUERY).matches) toggleSidebar();
              }}
            >
              <span className="ni-ic" dangerouslySetInnerHTML={{ __html: IC[item.ic] || '' }} />
              <span className="nav-lbl">{item.label}</span>
              {item.key === 'facilityqueue' && facilityPendingCount > 0 && (
                <span className="nav-badge">{facilityPendingCount}</span>
              )}
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
