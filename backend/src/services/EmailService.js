import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { formatDateDMY } from '../utils/dateFormat.js';

/**
 * Sends mail through Ethereal (https://ethereal.email), a fake SMTP sandbox. Preview
 * messages are public, so sending only happens when ETHEREAL_USER/ETHEREAL_PASS are set;
 * otherwise sends are skipped rather than creating an account automatically.
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
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: env.etherealUser, pass: env.etherealPass },
    });
  }

  async send({ to, subject, text, html }) {
    if (!env.etherealUser || !env.etherealPass) {
      console.log(`[EmailService] ETHEREAL_USER/ETHEREAL_PASS not set — skipped "${subject}"`);
      return { skipped: true };
    }
    const transporter = await this._getTransporter();
    const info = await transporter.sendMail({
      from: '"CPSU Room Reservation" <no-reply@cpsu-room-reservation.local>',
      to: to.join(', '),
      subject,
      text,
      html: html ?? `<p>${text}</p>`,
    });
    console.log(`[EmailService] Sent "${subject}" to ${to.length} recipient(s)`);
    return { messageId: info.messageId };
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
