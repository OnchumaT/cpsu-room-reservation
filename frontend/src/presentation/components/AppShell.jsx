import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { PAGES } from '../router/pages.js';
import { useAppShell } from '../context/AppShellContext.jsx';

export function AppShell() {
  const { page } = useAppShell();
  const Page = PAGES[page] || PAGES.dashboard;

  return (
    <div className="app" style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          <Page />
        </div>
      </div>
    </div>
  );
}
