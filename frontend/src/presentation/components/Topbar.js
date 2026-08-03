import { ROLE_INFO } from '../../shared/constants.js';
import { openModal, closeModal } from './Modal.js';

export function createTopbar({ appState, onLogout }) {
  function render() {
    if (!appState.user) return;
    const roleInfo = ROLE_INFO[appState.role];

    const avatarEl = document.getElementById('avBtn');
    avatarEl.textContent = appState.user.name.trim().charAt(0);
    avatarEl.style.cssText = `background:${roleInfo.avBg};color:${roleInfo.avC};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0`;

    const roleLabelEl = document.getElementById('topRoleLabel');
    if (roleLabelEl) roleLabelEl.textContent = roleInfo.label;
  }

  function showAccountMenu() {
    const roleInfo = ROLE_INFO[appState.role];
    openModal(
      'บัญชีผู้ใช้',
      `<div style="background:linear-gradient(135deg,#2A2262,#38419D);border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:white;flex-shrink:0">${appState.user.name.trim().charAt(0)}</div>
        <div><div style="font-size:14px;font-weight:600;color:white">${appState.user.name}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.65);margin-top:2px">${roleInfo.label}${appState.canApprove ? ' · มีสิทธิ์อนุมัติ' : ''}</div>
          <div style="font-size:10.5px;color:rgba(255,255,255,.5);margin-top:1px">${appState.user.email}</div></div>
      </div>`,
      `<button class="btn btn-o" onclick="App.closeModal();App.navigate('profile')">โปรไฟล์</button>
       <button class="btn btn-d" onclick="App.logout()">ออกจากระบบ</button>`,
    );
  }

  function logout() {
    closeModal();
    onLogout();
  }

  return { render, showAccountMenu, logout };
}
