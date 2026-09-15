import { IC } from '../../shared/icons.js';
import { ROLE_INFO } from '../../shared/constants.js';
import { formatDateTime } from '../formatters/statusLabels.js';
import { container } from '../../shared/di/container.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppShell } from '../context/AppShellContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRepository } from '../hooks/useRepository.js';
import { useBookingDetailModal } from '../components/BookingDetailModal.jsx';
import { useRejectReasonModal } from '../hooks/useRejectReasonModal.jsx';
import { LoadingPlaceholder, ErrorPlaceholder } from '../components/StatusPlaceholders.jsx';

const { notificationRepository } = container.repositories;
const { updateNotificationUseCase, approveRejectBookingUseCase } = container.useCases;

function ReadOnlyItem({ n, onAction }) {
  const clickable = Boolean(n.bookingId) || n.kind === 'user-registration';
  return (
    <div
      className={`nitem${n.unr ? ' unr' : ''}`}
      style={clickable ? { cursor: 'pointer' } : undefined}
      onClick={clickable ? () => onAction(n.id, 'detail') : undefined}
    >
      <div className="notif-ic" style={{ background: n.ibg, color: '#4A4F7A' }} dangerouslySetInnerHTML={{ __html: IC[n.icKey] || '' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14.5px', fontWeight: n.unr ? 600 : 400, color: '#1A1D3A', marginBottom: '3px' }}>{n.title}</div>
        <div style={{ fontSize: '12.5px', color: '#8890B5' }}>{n.sub || ''}{n.sub ? ' · ' : ''}{formatDateTime(n.time)}</div>
      </div>
      {n.unr && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38419D', flexShrink: 0, marginTop: '5px' }} />}
    </div>
  );
}

function ActionableItem({ n, onAction }) {
  const hasDetail = n.acts.some((a) => a.f === 'detail');
  const otherActs = n.acts.filter((a) => a.f !== 'detail');
  const classes = `staff-nitem${n.unr ? ' unr' : ''}${hasDetail ? ' clickable' : ''}`;
  return (
    <div
      className={classes}
      style={hasDetail ? { cursor: 'pointer' } : undefined}
      onClick={hasDetail ? () => onAction(n.id, 'detail') : undefined}
    >
      <div className="notif-ic" style={{ background: n.ibg, color: '#4A4F7A' }} dangerouslySetInnerHTML={{ __html: IC[n.icKey] || '' }} />
      <div className="sni-body">
        <div className="sni-ti">{n.title}</div>
        <div className="sni-su">{n.sub || ''}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
          <span style={{ fontSize: '12.5px', color: '#8890B5' }}>{formatDateTime(n.time)}</span>
          <span className="chip" style={{ background: n.stBg, color: n.stC, fontSize: '12px', padding: '4px 11px' }}>{n.st}</span>
        </div>
        {otherActs.length > 0 && (
          <div className="sni-acts">
            {otherActs.map((a) => (
              <button key={a.f} className={`sact ${a.c}`} onClick={(e) => { e.stopPropagation(); onAction(n.id, a.f); }}>{a.l}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Item({ n, onAction }) {
  return n.acts.length ? <ActionableItem n={n} onAction={onAction} /> : <ReadOnlyItem n={n} onAction={onAction} />;
}

function Section({ title, list, onAction }) {
  return (
    <>
      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4A4F7A', textTransform: 'uppercase', letterSpacing: '.06em', margin: '18px 0 10px' }}>{title}</div>
      <div className="tbl-wrap">
        {list.length
          ? list.map((n) => <Item key={n.id} n={n} onAction={onAction} />)
          : <div style={{ padding: '20px', textAlign: 'center', color: '#8890B5', fontSize: '13px' }}>ไม่มีรายการ</div>}
      </div>
    </>
  );
}

/**
 * Own role's inbox (read-only summary items for admin/teacher,
 * actionable cards for staff — decided by whether the item actually has
 * `acts`, not by role) plus, for anyone holding a can_approve position,
 * the shared "approvers" inbox merged in above it.
 */
export function NotificationsView() {
  const { role, canApprove } = useAuth();
  const { navigate, refreshUnreadCount } = useAppShell();
  const { showToast } = useToast();
  const { show: showBookingDetail } = useBookingDetailModal();
  const { askRejectReason } = useRejectReasonModal();
  const { loading, error, refetch } = useRepository(() => {
    const tasks = [notificationRepository.refresh()];
    if (canApprove) tasks.push(notificationRepository.refreshApproverInbox());
    return Promise.all(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canApprove]);

  function findNotification(id) {
    return [...notificationRepository.getAll(), ...notificationRepository.getApproverInbox()].find((n) => String(n.id) === String(id));
  }

  async function applyAction(id, action) {
    const notification = findNotification(id);

    if (action === 'detail') {
      // Opening a notification reads it — fire-and-refetch so the unread
      // dot clears without making the click wait on a network round trip.
      if (notification?.unr) {
        updateNotificationUseCase.execute({ notificationId: id, action: 'read' }).then(() => { refetch(); refreshUnreadCount(); });
      }
      // Staff jump to the queue (that's where they action a request) — anyone
      // else (the teacher who made the request, an approver's FYI copy) has
      // no access to that page, so their own booking detail is the useful
      // landing spot instead.
      if (notification?.kind === 'facility-request') {
        if (role === 'staff') { navigate('facilityqueue'); return; }
        if (notification.bookingId) { showBookingDetail(notification.bookingId); return; }
        return;
      }
      if (notification?.kind === 'user-registration') { navigate('users'); return; }
      if (notification?.bookingId) { showBookingDetail(notification.bookingId); return; }
      showToast('ดูรายละเอียด...', 'i');
      return;
    }

    if ((action === 'approve' || action === 'reject') && notification?.bookingId) {
      try {
        if (action === 'approve') {
          await approveRejectBookingUseCase.approve(notification.bookingId);
        } else {
          const reason = await askRejectReason();
          if (!reason) return;
          await approveRejectBookingUseCase.reject(notification.bookingId, reason);
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
    refetch();
    refreshUnreadCount();
  }

  async function markAllRead() {
    const unread = [...notificationRepository.getAll(), ...notificationRepository.getApproverInbox()].filter((n) => n.unr);
    if (!unread.length) { showToast('ไม่มีรายการที่ยังไม่ได้อ่าน', 'i'); return; }
    await Promise.all(unread.map((n) => updateNotificationUseCase.execute({ notificationId: n.id, action: 'read' })));
    showToast('อ่านทั้งหมดแล้ว', 's');
    refetch();
    refreshUnreadCount();
  }

  if (loading) return <LoadingPlaceholder />;
  if (error) return <ErrorPlaceholder error={error} />;

  const roleLabel = ROLE_INFO[role]?.label || role;
  const own = notificationRepository.getAll();
  const approverInbox = canApprove ? notificationRepository.getApproverInbox() : [];
  const hasUnread = [...own, ...approverInbox].some((n) => n.unr);

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-ttl">การแจ้งเตือน — {roleLabel}</span>
        <button className="btn btn-o" disabled={!hasUnread} onClick={markAllRead}>อ่านทั้งหมด</button>
      </div>
      {canApprove && <Section title="รอการอนุมัติ" list={approverInbox} onAction={applyAction} />}
      <Section title={canApprove ? 'แจ้งเตือนอื่นๆ' : 'ทั้งหมด'} list={own} onAction={applyAction} />
    </>
  );
}
