import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { PAGES } from '../router/pages.js';
import { useAppShell } from '../context/AppShellContext.jsx';

export function AppShell() {
  const { page, sidebarCollapsed, toggleSidebar } = useAppShell();
  const Page = PAGES[page] || PAGES.dashboard;

  return (
    <div className="app" style={{ display: 'flex' }}>
      <Sidebar />
      {/* Phone/iPad: the sidebar is a drawer; tapping the dimmed page behind it closes it (CSS shows this only there). */}
      {sidebarCollapsed && <div className="sb-backdrop" onClick={toggleSidebar} />}
      <div className="main">
        <Topbar />
        <div className="content">
          <Page />
        </div>
      </div>
    </div>
  );
}
