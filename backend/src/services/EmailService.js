import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

function esc(str) {
  return String(str ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/**
 * The mail transport. Uses the real SMTP server from SMTP_* when set,
 * otherwise Ethereal (https://ethereal.email, a sandbox whose preview
 * messages are public) when ETHEREAL_USER/ETHEREAL_PASS are set, otherwise
 * nothing — isConfigured() is false and jobs/emailOutboxJob.js leaves the
 * queue alone. Emails are never sent straight from a use case: they are
 * queued in email_outbox (EmailOutboxRepository) and sent by that job.
 */
export class EmailService {
  constructor() {
    this._transporter = null;
  }

  isConfigured() {
    return Boolean(env.smtp.host || (env.etherealUser && env.etherealPass));
  }

  _getTransporter() {
    if (!this._transporter) {
      this._transporter = env.smtp.host
        ? nodemailer.createTransport({
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.secure,
          auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
        })
        : nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: env.etherealUser, pass: env.etherealPass },
        });
    }
    return this._transporter;
  }

  /** Throws when the server refuses — the outbox job records it and retries. */
  async send({ to, subject, text, html }) {
    const info = await this._getTransporter().sendMail({
      from: env.mailFrom,
      // Recipients go in Bcc so a broadcast (e.g. to every staff member)
      // doesn't hand everyone's address to everyone else.
      to: env.mailFrom,
      bcc: to.join(', '),
      subject,
      text,
      html: html ?? `<p>${esc(text)}</p>`,
    });
    return { messageId: info.messageId };
  }
}

/** Subject/text/html for an email mirroring an in-app notification. */
export function renderNotificationEmail({ title, subtitle }) {
  const lines = String(subtitle ?? '').split('\n').filter(Boolean);
  const text = [title, '', ...lines, '', `เปิดระบบจองห้อง: ${env.appUrl}`, '', 'อีเมลนี้ส่งอัตโนมัติจากระบบจองห้อง ภาควิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยศิลปากร — ปิดการรับอีเมลได้ที่หน้าโปรไฟล์'].join('\n');
  const html = `<!DOCTYPE html><html lang="th"><body style="margin:0;background:#F4F5FA;font-family:Sarabun,Tahoma,sans-serif;color:#1A1D3A">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:linear-gradient(135deg,#2A2262,#38419D);color:#fff;border-radius:12px 12px 0 0;padding:16px 20px;font-size:15px;font-weight:700">CPSU Rooms · ระบบจองห้อง</div>
    <div style="background:#fff;border-radius:0 0 12px 12px;padding:20px;border:1px solid #D8DBF0;border-top:none">
      <div style="font-size:16px;font-weight:700;margin-bottom:10px">${esc(title)}</div>
      ${lines.map((l) => `<div style="font-size:14px;line-height:1.6;color:#4A4F7A">${esc(l)}</div>`).join('')}
      <a href="${esc(env.appUrl)}" style="display:inline-block;margin-top:18px;background:#38419D;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">เปิดระบบจองห้อง</a>
    </div>
    <div style="font-size:11px;color:#8890B5;text-align:center;margin-top:12px">อีเมลนี้ส่งอัตโนมัติจากระบบจองห้อง ภาควิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยศิลปากร<br>ปิดการรับอีเมลได้ที่หน้าโปรไฟล์ในระบบ</div>
  </div></body></html>`;
  return { subject: title, text, html };
}
