// App.jsx — provider nesting root (replaces main.js's manual wiring +
// window.App global). Composition-root DI wiring itself still lives in
// shared/di/container.js as a plain module singleton; this file only wires
// React context providers around it.

import { container } from './shared/di/container.js';
import { AuthProvider, useAuth } from './presentation/context/AuthContext.jsx';
import { AppShellProvider } from './presentation/context/AppShellContext.jsx';
import { ModalProvider } from './presentation/context/ModalContext.jsx';
import { ToastProvider } from './presentation/context/ToastContext.jsx';
import { LoginView } from './presentation/views/LoginView.jsx';
import { AppShell } from './presentation/components/AppShell.jsx';

function AuthGate() {
  const { isBooting, isAuthenticated } = useAuth();
  if (isBooting) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8890B5', fontSize: '13px' }}>กำลังโหลด...</div>;
  }
  return isAuthenticated ? <AppShell /> : <LoginView />;
}

export function App() {
  return (
    <AuthProvider authClient={container.authClient}>
      <AppShellProvider>
        <ModalProvider>
          <ToastProvider>
            <AuthGate />
          </ToastProvider>
        </ModalProvider>
      </AppShellProvider>
    </AuthProvider>
  );
}
