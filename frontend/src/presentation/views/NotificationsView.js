import { IC } from '../../shared/icons.js';
import { showToast } from '../components/Toast.js';
import { ROLE_INFO } from '../../shared/constants.js';
import { formatDateTime } from '../formatters/statusLabels.js';

/**
 * Own role's inbox (read-only summary items for admin/teacher/student,
 * actionable cards for staff — decided by whether the item actually has
 * `acts`, not by role) plus, for anyone holding a can_approve position,
 * the shared "approvers" inbox merged in above it.
 */
export function createNotificationsView({ appState, notificationRepository, updateNotificationUseCase, approveRejectBookingUseCase, bookingDetailModal, router }) {
  async function load() {
    const tasks = [notificationRepository.refresh()];
    if (appState.canApprove) tasks.push(notificationRepository.refreshApproverInbox());
    await Promise.all(tasks);
  }

  function readOnlyItem(n) {
    const clickable = n.bookingId ? ` onclick="App.showBookingDetail('${n.bookingId}')" style="cursor:pointer"` : '';
    return `<div class="nitem${n.unr ? ' unr' : ''}"${clickable}>
      <div class="notif-ic" style="background:${n.ibg};color:#4A4F7A">${IC[n.icKey] || ''}</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:${n.unr ? 600 : 400};color:#1A1D3A;margin-bottom:2px">${n.title}</div>
        <div style="font-size:10px;color:#8890B5">${n.sub || ''}${n.sub ? ' · ' : ''}${formatDateTime(n.time)}</div>
      </div>
      ${n.unr ? `<div style="width:8px;height:8px;border-radius:50%;background:#38419D;flex-shrink:0;margin-top:4px"></div>` : ''}
    </div>`;
  }

  function actionableItem(n) {
    const hasDetail = n.acts.some((a) => a.f === 'detail');
    const otherActs = n.acts.filter((a) => a.f !== 'detail');
    const classes = `staff-nitem${n.unr ? ' unr' : ''}${hasDetail ? ' clickable' : ''}`;
    const clickAttr = hasDetail ? ` onclick="App.applyNotificationAction(${n.id},'detail')" style="cursor:pointer"` : '';
    return `<div class="${classes}"${clickAttr}>
      <div class="notif-ic" style="background:${n.ibg};color:#4A4F7A">${IC[n.icKey] || ''}</div>
      <div class="sni-body">
        <div class="sni-ti">${n.title}</div>
        <div class="sni-su">${n.sub || ''}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
          <span style="font-size:10px;color:#8890B5">${formatDateTime(n.time)}</span>
          <span class="chip" style="background:${n.stBg};color:${n.stC}">${n.st}</span>
        </div>
        ${otherActs.length ? `<div class="sni-acts">${otherActs.map((a) => `<button class="sact ${a.c}" onclick="event.stopPropagation();App.applyNotificationAction(${n.id},'${a.f}')">${a.l}</button>`).join('')}</div>` : ''}
      </div>
    </div>`;
  }

  function item(n) {
    return n.acts.length ? actionableItem(n) : readOnlyItem(n);
  }

  function section(title, list) {
    return `<div style="font-size:11px;font-weight:600;color:#4A4F7A;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px">${title}</div>
    <div class="tbl-wrap">${list.length ? list.map(item).join('') : '<div style="padding:16px;text-align:center;color:#8890B5;font-size:12px">ไม่มีรายการ</div>'}</div>`;
  }

  function render() {
    const roleLabel = ROLE_INFO[appState.role]?.label || appState.role;
    const own = notificationRepository.getAll();
    const approverInbox = appState.canApprove ? notificationRepository.getApproverInbox() : [];

    return `<div class="sec-hdr"><span class="sec-ttl">การแจ้งเตือน — ${roleLabel}</span></div>
    ${appState.canApprove ? section('รอการอนุมัติ', approverInbox) : ''}
    ${section(appState.canApprove ? 'แจ้งเตือนอื่นๆ' : 'ทั้งหมด', own)}`;
  }

  function findNotification(id) {
    return [...notificationRepository.getAll(), ...notificationRepository.getApproverInbox()].find((n) => String(n.id) === String(id));
  }

  async function applyAction(id, action) {
    const notification = findNotification(id);

    if (action === 'detail') {
      if (notification?.kind === 'facility-request') { router.navigate('facilityqueue'); return; }
      if (notification?.bookingId) { bookingDetailModal.show(notification.bookingId); return; }
      showToast('ดูรายละเอียด...', 'i');
      return;
    }

    if ((action === 'approve' || action === 'reject') && notification?.bookingId) {
      try {
        if (action === 'approve') {
          await approveRejectBookingUseCase.approve(notification.bookingId);
        } else {
          const reason = prompt('เหตุผลที่ปฏิเสธ:');
          if (!reason?.trim()) return;
          await approveRejectBookingUseCase.reject(notification.bookingId, reason.trim());
        }
      } catch (err) {
        showToast(err.message || 'ดำเนินการไม่สำเร็จ', 'e');
        return;
      }
    }

    const result = await updateNotificationUseCase.execute({ notificationId: id, action });
    if (!result.success) return;
    const messages = { approve: ['อนุมัติแล้ว', 's'], reject: ['ปฏิเสธแล้ว', 'i'], accept: ['รับงานแล้ว', 's'], done: ['จัดการเรียบร้อย', 's'] };
    const [message, type] = messages[action] || ['ดำเนินการแล้ว', 'i'];
    showToast(message, type);
    router.navigate('notifications');
  }

  return { render, load, applyAction };
}
