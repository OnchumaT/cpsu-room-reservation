import { ROLE_INFO } from '../../shared/constants.js';
import { showToast } from '../components/Toast.js';

export function createProfileView({ appState }) {
  function render() {
    const info = ROLE_INFO[appState.role];
    const user = appState.user;
    return `<div style="max-width:440px">
      <div style="background:linear-gradient(135deg,#2A2262,#3887BE);border-radius:12px;padding:18px;margin-bottom:12px;color:white;display:flex;align-items:center;gap:14px">
        <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">${user.name.trim().charAt(0)}</div>
        <div><div style="font-size:15px;font-weight:500">${user.name}</div><div style="font-size:11px;opacity:.75;margin-top:2px">${info.label}${appState.canApprove ? ' · มีสิทธิ์อนุมัติ' : ''} · ภาควิชาวิทยาการคอมพิวเตอร์</div></div>
      </div>
      <div style="background:#FFFFFF;border:.5px solid #D8DBF0;border-radius:12px;padding:16px">
        <div class="form-group"><label class="form-label">ชื่อ-นามสกุล</label><input class="form-control" value="${user.name}" readonly style="background:#F4F5FA"></div>
        <div class="form-group"><label class="form-label">อีเมล</label><input class="form-control" value="${user.email}" readonly style="background:#F4F5FA"></div>
        <div style="background:#EEF0FF;border-radius:8px;padding:9px 12px;font-size:11px;color:#38419D">การแก้ไขข้อมูลส่วนตัว/รหัสผ่านยังไม่เปิดให้ใช้งานในเวอร์ชันนี้ — ติดต่อผู้ดูแลระบบหากต้องการเปลี่ยนแปลง</div>
      </div></div>`;
  }

  function save() {
    showToast('การแก้ไขโปรไฟล์ยังไม่เปิดให้ใช้งาน', 'i');
  }

  return { render, save };
}
