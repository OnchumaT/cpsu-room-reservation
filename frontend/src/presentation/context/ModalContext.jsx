import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext(null);

/** Replaces the old single #modalOv + openModal(title, bodyHtml, footHtml)
 * (HTML strings) — callers now pass real JSX nodes and get real onClick
 * closures instead of onclick="App.xxx()" strings. */
export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null); // { title, body, footer } | null

  const openModal = useCallback((title, body, footer) => {
    setModal({ title, body, footer });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {modal && (
        <div className="modal-ov" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">
            <div className="modal-hd">
              <span className="modal-ti">{modal.title}</span>
              <button className="modal-x" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-bd">{modal.body}</div>
            <div className="modal-ft">
              {modal.footer || <button className="btn btn-o" onClick={closeModal}>ปิด</button>}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
