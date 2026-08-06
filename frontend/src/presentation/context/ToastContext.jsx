import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

const ICONS = {
  s: { color: '#16a34a', path: <polyline points="20 6 9 17 4 12" /> },
  e: { color: '#ef4444', path: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> },
  i: { color: '#38419D', path: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></> },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const showToast = useCallback((message, type = 'i') => {
    const id = nextId.current++;
    setToasts((cur) => [...cur, { id, message, type }]);
    setTimeout(() => {
      setToasts((cur) => cur.map((t) => (t.id === id ? { ...t, fading: true } : t)));
    }, 2500);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => {
          const icon = ICONS[t.type] || ICONS.i;
          return (
            <div key={t.id} className={`toast ${t.type}`} style={{ opacity: t.fading ? 0 : 1, transition: 'opacity .3s' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2.5">{icon.path}</svg>
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
