import { formatDateDMY } from '../../../utils/dateFormat.js';

/** After a booking stops holding a slot, tells the people waiting on that slot that it is free again. */
export class NotifyFreedSlotUseCase {
  constructor({ clashAttemptRepository, bookingRepository, timetableRepository, notificationRepository, roomRepository }) {
    this.clashAttemptRepository = clashAttemptRepository;
    this.bookingRepository = bookingRepository;
    this.timetableRepository = timetableRepository;
    this.notificationRepository = notificationRepository;
    this.roomRepository = roomRepository;
  }

  async execute({ roomId, date, time }) {
    const [start, end] = time.split('-');
    const attempts = await this.clashAttemptRepository.findNear({ roomId, date, start, end });
    if (!attempts.length) return;
    const room = await this.roomRepository.findById(roomId);
    const roomName = room?.name ?? roomId;

    for (const attempt of attempts) {
      const taken = await this.bookingRepository.findConflict({ roomId, date, start: attempt.start, end: attempt.end });
      if (taken) continue;
      const classSession = (await this.timetableRepository.sessionConflicts({ roomId, date, start: attempt.start, end: attempt.end }))[0];
      if (classSession) continue;

      await this.notificationRepository.addForUser(attempt.userId, {
        iconKey: 'cal', iconBg: '#dcfce7',
        title: `ห้อง ${roomName} ว่างแล้ว`,
        subtitle: `${formatDateDMY(date)} · ${attempt.start}-${attempt.end} · ลองจองได้อีกครั้ง`,
        kind: 'booking',
      });
      await this.clashAttemptRepository.remove(attempt.id);
    }
  }
}
