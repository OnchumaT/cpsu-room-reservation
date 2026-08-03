import { MENUS, APPROVER_MENU_ITEMS, ROLE_INFO } from '../../shared/constants.js';
import { IC } from '../../shared/icons.js';

export function createSidebar({ appState }) {
  function render() {
    if (!appState.user) return;
    const roleInfo = ROLE_INFO[appState.role];
    const items = appState.canApprove ? [...MENUS[appState.role], ...APPROVER_MENU_ITEMS] : MENUS[appState.role];

    const nav = document.getElementById('sbNav');
    nav.innerHTML = items.map((item) => {
      if (item.sec) return `<div class="sec-hd">${item.sec}</div>`;
      return `<div class="ni${appState.page === item.key ? ' on' : ''}" onclick="App.navigate('${item.key}')">
        <span class="ni-ic">${IC[item.ic] || ''}</span><span class="nav-lbl">${item.label}</span>
      </div>`;
    }).join('');

    const initial = appState.user.name.trim().charAt(0);
    document.getElementById('sbUser').innerHTML = `<div class="sb-av" style="background:${roleInfo.avBg};color:${roleInfo.avC}">${initial}</div><div class="sb-uinfo"><div class="sb-uname">${appState.user.name}</div><div class="sb-urole">${roleInfo.label}${appState.canApprove ? ' · มีสิทธิ์อนุมัติ' : ''}</div></div>`;
  }

  function toggleCollapsed() {
    appState.sidebarCollapsed = !appState.sidebarCollapsed;
    document.getElementById('sidebar').classList.toggle('col', appState.sidebarCollapsed);
  }

  return { render, toggleCollapsed };
}
