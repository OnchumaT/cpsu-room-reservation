import { ROLE_INFO } from '../../shared/constants.js';

export function createTopbar({ appState }) {
  function render() {
    const roleInfo = ROLE_INFO[appState.role];
    document.getElementById('nbDot').textContent = roleInfo.nb;

    const avatarEl = document.getElementById('avBtn');
    avatarEl.textContent = roleInfo.short;
    avatarEl.style.cssText = `background:${roleInfo.avBg};color:${roleInfo.avC};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0`;

    const roleLabelEl = document.getElementById('topRoleLabel');
    if (roleLabelEl) roleLabelEl.textContent = roleInfo.label;
  }

  return { render };
}
