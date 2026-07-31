import { IC } from '../../shared/icons.js';
import { showToast } from '../components/Toast.js';
import { APPROVAL_MODE } from '../../domain/policies/ApprovalPolicy.js';

const MODES = [
  {
    key: APPROVAL_MODE.AUTO, label: 'อนุมัติอัตโนมัติ', en: 'Automatic Approval',
    icon: 'ok', iconBg: '#dcfce7', iconColor: '#166534',
    points: [
      'เมื่อผู้ใช้งานส่งคำขอจองห้อง ระบบจะอนุมัติการจองทันทีโดยอัตโนมัติ',
      'สถานะการจองจะเปลี่ยนเป็น “อนุมัติแล้ว” ทันที',
      'ผู้จองจะได้รับการแจ้งเตือนผ่านอีเมลและการแจ้งเตือนในระบบโดยอัตโนมัติ',
    ],
  },
  {
    key: APPROVAL_MODE.MANUAL, label: 'อนุมัติแบบแมนนวล', en: 'Manual Approval',
    icon: 'clock', iconBg: '#FEF3C7', iconColor: '#92400e',
    points: [
      'เมื่อผู้ใช้งานส่งคำขอจองห้อง ระบบจะกำหนดสถานะเป็น “รอการอนุมัติ”',
      'หัวหน้าภาควิชาจะต้องตรวจสอบคำขอและเลือกอนุมัติหรือปฏิเสธด้วยตนเอง',
      'หลังจากดำเนินการแล้ว ผู้จองจะได้รับการแจ้งเตือนผ่านอีเมลและการแจ้งเตือนในระบบ',
    ],
  },
];

/** Head-only: picks the department-wide default approval mode. */
export function createApprovalSettingsView({ appState, setApprovalModeUseCase, router }) {
  function render() {
    return `
    <div style="max-width:640px">
      <div style="margin-bottom:16px">
        <div style="font-size:15px;font-weight:600;color:#1A1D3A">ตั้งค่าการอนุมัติ</div>
        <div style="font-size:12px;color:#8890B5;margin-top:2px">เลือกรูปแบบการอนุมัติที่จะใช้กับคำขอจองห้องใหม่ทั้งหมด — มีผลทันทีเมื่อเลือก ไม่มีผลย้อนหลังกับคำขอที่ส่งไปแล้ว</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${MODES.map((m) => {
          const on = appState.approvalMode === m.key;
          return `
        <div onclick="App.setApprovalMode('${m.key}')" style="background:#fff;border-radius:14px;padding:18px 20px;cursor:pointer;border:2px solid ${on ? '#38419D' : '#D8DBF0'};box-shadow:${on ? '0 4px 16px rgba(56,65,157,.12)' : '0 1px 3px rgba(42,34,98,.06)'};transition:all .15s">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div style="width:38px;height:38px;border-radius:10px;background:${m.iconBg};color:${m.iconColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">${IC[m.icon] || ''}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="font-size:14px;font-weight:600;color:#1A1D3A">${m.label}</div>
                <div style="font-size:11px;color:#8890B5">(${m.en})</div>
              </div>
              <ul style="margin:8px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:4px">
                ${m.points.map((p) => `<li style="font-size:11px;color:#4A4F7A;line-height:1.5">${p}</li>`).join('')}
              </ul>
            </div>
            ${on
              ? `<div style="width:20px;height:20px;border-radius:50%;background:#38419D;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>`
              : `<div style="width:20px;height:20px;border-radius:50%;border:1.5px solid #D8DBF0;flex-shrink:0"></div>`}
          </div>
        </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  function setMode(mode) {
    const result = setApprovalModeUseCase.execute({ mode });
    if (!result.success || !result.changed) return;
    showToast(mode === APPROVAL_MODE.AUTO ? 'เปลี่ยนเป็นอนุมัติอัตโนมัติแล้ว' : 'เปลี่ยนเป็นอนุมัติแบบแมนนวลแล้ว', 's');
    router.navigate('approvalsettings');
  }

  return { render, setMode };
}
