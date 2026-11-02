import { prisma } from '../../lib/prisma.js';

// A queued email older than this is never sent (marked expired) — a
// "your booking starts in 30 minutes" mail is worse than none a day later,
// e.g. after SMTP was down or only configured afterwards.
export const EMAIL_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const EMAIL_MAX_ATTEMPTS = 5;

export class EmailOutboxRepository {
  /** Queues one email (in the caller's transaction when `client` is a tx). */
  async enqueue({ recipients, subject, text, html, notificationId, bookingId }, client = prisma) {
    if (!recipients?.length) return null;
    return client.emailOutbox.create({
      data: {
        recipients: [...new Set(recipients)],
        subject: subject.slice(0, 255),
        bodyText: text,
        bodyHtml: html ?? null,
        notificationId: notificationId ?? null,
        bookingId: bookingId ? Number(bookingId) : null,
      },
    });
  }

  /** Pending emails young enough to send, oldest first. */
  async takeDue(limit = 20, now = new Date()) {
    return prisma.emailOutbox.findMany({
      where: { status: 'pending', createdAt: { gte: new Date(now.getTime() - EMAIL_MAX_AGE_MS) } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async expireStale(now = new Date()) {
    const result = await prisma.emailOutbox.updateMany({
      where: { status: 'pending', createdAt: { lt: new Date(now.getTime() - EMAIL_MAX_AGE_MS) } },
      data: { status: 'expired' },
    });
    return result.count;
  }

  async markSent(id) {
    return prisma.emailOutbox.update({ where: { id }, data: { status: 'sent', sentAt: new Date(), attempts: { increment: 1 }, lastError: null } });
  }

  /** Stays pending for another try until EMAIL_MAX_ATTEMPTS, then failed. */
  async markFailed(row, error) {
    const attempts = row.attempts + 1;
    return prisma.emailOutbox.update({
      where: { id: row.id },
      data: { attempts, lastError: String(error?.message || error).slice(0, 2000), status: attempts >= EMAIL_MAX_ATTEMPTS ? 'failed' : 'pending' },
    });
  }
}
