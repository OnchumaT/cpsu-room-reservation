import { EMAIL_MAX_ATTEMPTS } from '../infrastructure/repositories/EmailOutboxRepository.js';

// Notifications are queued as emails (NotificationRepository) and sent here,
// so mail problems never slow down or fail the action that triggered them.
const CHECK_INTERVAL_MS = 60 * 1000;
let warnedNotConfigured = false;

export async function tick({ emailOutboxRepository, emailService }) {
  await emailOutboxRepository.expireStale();
  if (!emailService.isConfigured()) {
    if (!warnedNotConfigured) {
      console.log('[emailOutboxJob] SMTP_HOST (or ETHEREAL_USER/PASS) not set — notification emails stay queued and expire after a day');
      warnedNotConfigured = true;
    }
    return;
  }
  const due = await emailOutboxRepository.takeDue();
  for (const row of due) {
    try {
      await emailService.send({ to: row.recipients, subject: row.subject, text: row.bodyText, html: row.bodyHtml ?? undefined });
      await emailOutboxRepository.markSent(row.id);
    } catch (err) {
      await emailOutboxRepository.markFailed(row, err);
      console.error(`[emailOutboxJob] email ${row.id} failed (attempt ${row.attempts + 1}/${EMAIL_MAX_ATTEMPTS}):`, err.message);
    }
  }
}

/** Started once from index.js after the server boots; returns a stop function for graceful shutdown. */
export function startEmailOutboxJob(deps) {
  const run = () => tick(deps).catch((err) => console.error('[emailOutboxJob] tick failed:', err));
  const id = setInterval(run, CHECK_INTERVAL_MS);
  return () => clearInterval(id);
}
