import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { formatDateDMY } from '../utils/dateFormat.js';

/**
 * Sends mail through Ethereal (https://ethereal.email) — a fake SMTP
 * sandbox for development: nothing is actually delivered, but every send
 * gets a preview URL you can open to see the rendered email. If
 * ETHEREAL_USER/ETHEREAL_PASS aren't set, a throwaway test account is
 * created automatically on first send and logged to the console so you
 * can reuse it (put it in .env to stop it from rotating every restart).
 */
export class EmailService {
  constructor() {
    this._transporterPromise = null;
  }

  async _getTransporter() {
    if (!this._transporterPromise) {
      this._transporterPromise = this._createTransporter();
    }
    return this._transporterPromise;
  }

  async _createTransporter() {
    let user = env.etherealUser;
    let pass = env.etherealPass;

    if (!user || !pass) {
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
      console.log('\n[EmailService] No ETHEREAL_USER/ETHEREAL_PASS set — created a throwaway Ethereal account:');
      console.log(`[EmailService]   ETHEREAL_USER=${user}`);
      console.log(`[EmailService]   ETHEREAL_PASS=${pass}`);
      console.log('[EmailService] Add these to .env to reuse this inbox across restarts.\n');
    }

    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user, pass },
    });
  }

  async send({ to, subject, text, html }) {
    const transporter = await this._getTransporter();
    const info = await transporter.sendMail({
      from: '"CPSU Room Reservation" <no-reply@cpsu-room-reservation.local>',
      to: to.join(', '),
      subject,
      text,
      html: html ?? `<p>${text}</p>`,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[EmailService] Sent "${subject}" to ${to.join(', ')} — preview: ${previewUrl}`);
    return { messageId: info.messageId, previewUrl };
  }

  /** Notifies every management-position holder (head, vice-head, ...) and all staff that a booking was approved. */
  async sendBookingApprovedNotice({ to, booking }) {
    if (!to.length) return null;
    const roomLabel = booking.roomName ?? booking.room;
    const subject = `การจองห้อง ${roomLabel} ได้รับการอนุมัติแล้ว`;
    const text = [
      `ผู้จอง: ${booking.user}`,
      `ห้อง: ${roomLabel}`,
      `วันที่: ${formatDateDMY(booking.date)}`,
      `เวลา: ${booking.time}`,
      `วัตถุประสงค์: ${booking.title}`,
    ].join('\n');
    return this.send({ to, subject, text });
  }
}
