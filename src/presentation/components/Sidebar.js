import { MENUS, ROLE_INFO } from '../../shared/constants.js';
import { IC } from '../../shared/icons.js';

export function createSidebar({ appState }) {
  function render() {
    const roleInfo = ROLE_INFO[appState.role];
    const nav = document.getElementById('sbNav');
    nav.innerHTML = MENUS[appState.role].map((item) => {
      if (item.sec) return `<div class="sec-hd">${item.sec}</div>`;
      return `<div class="ni${appState.page === item.key ? ' on' : ''}" onclick="App.navigate('${item.key}')">
        <span class="ni-ic">${IC[item.ic] || ''}</span><span class="nav-lbl">${item.label}</span>${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
      </div>`;
    }).join('');

    document.getElementById('sbUser').innerHTML = `<div class="sb-av" style="background:${roleInfo.avBg};color:${roleInfo.avC}">${roleInfo.short}</div><div class="sb-uinfo"><div class="sb-uname">${roleInfo.name}</div><div class="sb-urole">${roleInfo.label}</div></div>`;
  }

  function toggleCollapsed() {
    appState.sidebarCollapsed = !appState.sidebarCollapsed;
    document.getElementById('sidebar').classList.toggle('col', appState.sidebarCollapsed);
  }

  return { render, toggleCollapsed };
}
