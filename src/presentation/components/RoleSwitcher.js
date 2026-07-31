import { ROLE_INFO } from '../../shared/constants.js';
import { IC } from '../../shared/icons.js';
import { openModal, closeModal } from './Modal.js';
import { showToast } from './Toast.js';

const ROLE_OPTIONS = [
  { k: 'teacher', desc: 'จองห้อง · ขอสิ่งอำนวยความสะดวกเพิ่มเติม', ibg: '#EEF0FF', icC: '#38419D' },
  { k: 'student', desc: 'จองห้อง · รอการอนุมัติ', ibg: '#DBEAFE', icC: '#1e40af' },
  { k: 'head', desc: 'อนุมัติการจอง · จองห้องได้', ibg: '#F3E8FF', icC: '#6b21a8' },
  { k: 'staff', desc: 'ดูแลการใช้งานห้อง · จัดการคำขอสิ่งอำนวยความสะดวก', ibg: '#dcfce7', icC: '#166534' },
  { k: 'admin', desc: 'จัดการระบบทั้งหมด', ibg: '#FEF3C7', icC: '#92400e' },
];

/** The avatar-triggered "switch role" modal — this app's stand-in for a
 * real multi-account login, since there's no backend. */
export function createRoleSwitcher({ appState, sidebar, topbar, router }) {
  function showModal() {
    const current = ROLE_INFO[appState.role];
    openModal(
      'บัญชีผู้ใช้',
      `<div style="background:linear-gradient(135deg,#2A2262,#38419D);border-radius:10px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:white;flex-shrink:0">${current.short}</div>
        <div><div style="font-size:14px;font-weight:600;color:white">${current.name}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.65);margin-top:2px">${current.label} · ภาควิชาวิทยาการคอมพิวเตอร์</div></div>
      </div>
      <div style="font-size:11px;font-weight:600;color:#4A4F7A;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">สลับบทบาท</div>
      <div style="display:flex;flex-direction:column;gap:6px">
      ${ROLE_OPTIONS.map((opt) => `
      <div onclick="App.switchRole('${opt.k}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;border:2px solid ${appState.role === opt.k ? '#38419D' : '#D8DBF0'};background:${appState.role === opt.k ? '#EEF0FF' : '#FFFFFF'};transition:all .15s" onmouseover="if('${opt.k}'!=='${appState.role}')this.style.background='#F4F5FA'" onmouseout="if('${opt.k}'!=='${appState.role}')this.style.background='#FFFFFF'">
        <div style="width:34px;height:34px;border-radius:8px;background:${opt.ibg};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${opt.icC}">${IC.user}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:${appState.role === opt.k ? '#38419D' : '#1A1D3A'}">${ROLE_INFO[opt.k].label}</div>
          <div style="font-size:10px;color:#8890B5;margin-top:1px">${opt.desc}</div>
        </div>
        ${appState.role === opt.k
          ? `<div style="width:18px;height:18px;border-radius:50%;background:#38419D;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>`
          : '<div style="width:18px;height:18px;border-radius:50%;border:1.5px solid #D8DBF0;flex-shrink:0"></div>'}
      </div>`).join('')}
      </div>`,
      '<button class="btn btn-o" onclick="App.closeModal()">ปิด</button>',
    );
  }

  function switchRole(role) {
    closeModal();
    appState.role = role;
    appState.selectedDate = null;
    appState.resetBookingScratch();
    showToast(`เปลี่ยนเป็น${ROLE_INFO[role].label}เรียบร้อย`, 's');
    sidebar.render();
    topbar.render();
    router.navigate('dashboard');
  }

  return { showModal, switchRole };
}
