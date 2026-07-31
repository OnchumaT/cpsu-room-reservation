import { IC } from '../../shared/icons.js';
import { showToast } from '../components/Toast.js';

const ROLE_TITLE = {
  admin: 'ผู้ดูแลระบบ', staff: 'เจ้าหน้าที่', head: 'หัวหน้าภาควิชา', teacher: 'อาจารย์', student: 'นักศึกษา',
};

/** Renders one of 5 role-specific branches, matching the old renderNotifs(). */
export function createNotificationsView({ appState, notificationRepository, updateNotificationUseCase, router }) {
  function readOnlyItem(n) {
    return `<div class="nitem${n.unr ? ' unr' : ''}">
      <div class="notif-ic" style="background:${n.ibg};color:#4A4F7A">${IC[n.ic] || ''}</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:${n.unr ? 600 : 400};color:#1A1D3A;margin-bottom:2px">${n.msg}</div>
        <div style="font-size:10px;color:#8890B5">${n.sub} · ${n.time}</div>
      </div>
      ${n.unr ? `<div style="width:8px;height:8px;border-radius:50%;background:#38419D;flex-shrink:0;margin-top:4px"></div>` : ''}
    </div>`;
  }

  function actionableItem(n) {
    return `<div class="staff-nitem${n.unr ? ' unr' : ''}">
      <div class="notif-ic" style="background:${n.ibg};color:#4A4F7A">${IC[n.icKey] || ''}</div>
      <div class="sni-body">
        <div class="sni-ti">${n.title}</div>
        <div class="sni-su">${n.sub}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
          <span style="font-size:10px;color:#8890B5">${n.time}</span>
          <span class="chip" style="background:${n.stBg};color:${n.stC}">${n.st}</span>
        </div>
        ${n.acts.length ? `<div class="sni-acts">${n.acts.map((a) => `<button class="sact ${a.c}" onclick="App.applyNotificationAction(${n.id},'${a.f}')">${a.l}</button>`).join('')}</div>` : ''}
      </div>
    </div>`;
  }

  function header(roleKey) {
    return `<div class="sec-hdr"><span class="sec-ttl">การแจ้งเตือน — ${ROLE_TITLE[roleKey]}</span>
      <button class="btn btn-o" onclick="App.toast('อ่านทั้งหมดแล้ว','s')">อ่านทั้งหมด</button></div>`;
  }

  function render() {
    const role = appState.role;

    if (role === 'admin') {
      return `${header('admin')}
      <div style="background:#EEF0FF;border-radius:8px;padding:8px 12px;font-size:11px;color:#38419D;margin-bottom:10px">
        แอดมินรับแจ้งเตือนเชิงระบบ — การดำเนินการรายบุคคลทำผ่านหน้าจัดการที่เกี่ยวข้อง
      </div>
      <div class="tbl-wrap">${notificationRepository.getAdminNotifications().map(readOnlyItem).join('')}</div>`;
    }

    if (role === 'staff') {
      return `${header('staff')}<div class="tbl-wrap">${notificationRepository.getStaffNotifications().map(actionableItem).join('')}</div>`;
    }

    if (role === 'head') {
      return `${header('head')}<div class="tbl-wrap">${notificationRepository.getHeadNotifications().map(actionableItem).join('')}</div>`;
    }

    if (role === 'teacher') {
      return `${header('teacher')}<div class="tbl-wrap">${notificationRepository.getTeacherNotifications().map(readOnlyItem).join('')}</div>`;
    }

    return `${header('student')}<div class="tbl-wrap">${notificationRepository.getStudentNotifications().map(readOnlyItem).join('')}</div>`;
  }

  function applyAction(id, action) {
    const result = updateNotificationUseCase.execute({ notificationId: id, action });
    if (!result.success) return;
    const messages = { approve: ['อนุมัติแล้ว', 's'], reject: ['ปฏิเสธแล้ว', 'i'], accept: ['รับงานแล้ว', 's'], done: ['จัดการเรียบร้อย', 's'] };
    const [message, type] = messages[action] || ['ดูรายละเอียด...', 'i'];
    showToast(message, type);
    router.navigate('notifications');
  }

  return { render, applyAction };
}
