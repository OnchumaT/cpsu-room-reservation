import { prisma } from '../../lib/prisma.js';
import { toTimeValue } from './BookingRepository.js';

const BUFFER_MINUTES = 10;
const MINUTES_IN_DAY = 24 * 60;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (total) => {
  const clamped = Math.min(Math.max(total, 0), MINUTES_IN_DAY - 1);
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
};

export class ClashAttemptRepository {
  record({ userId, roomId = null, date, start, end }) {
    return prisma.clashAttempt.create({
      data: {
        userId,
        roomId,
        bookingDate: new Date(`${date}T00:00:00.000Z`),
        startTime: toTimeValue(start),
        endTime: toTimeValue(end),
      },
    });
  }

  async recordWatchIfNew({ userId, roomId = null, date, start, end }) {
    const existing = await prisma.$queryRaw`
      SELECT id FROM booking_clash_attempts
      WHERE user_id = ${userId}
        AND ((${roomId} IS NULL AND room_id IS NULL) OR room_id = ${roomId})
        AND booking_date = ${new Date(`${date}T00:00:00.000Z`)}
        AND TIME(start_time) = TIME(${toTimeValue(start)})
        AND TIME(end_time) = TIME(${toTimeValue(end)})
      LIMIT 1
    `;
    if (existing.length) return existing[0];
    return this.record({ userId, roomId, date, start, end });
  }

  // Attempts for this room, plus "any room" watches, whose slot overlaps the freed slot with the same turnaround buffer as bookings.
  async findNear({ roomId, date, start, end }) {
    const rows = await prisma.$queryRaw`
      SELECT id, user_id AS userId, room_id AS roomId,
        TIME_FORMAT(start_time, '%H:%i') AS start,
        TIME_FORMAT(end_time, '%H:%i') AS end
      FROM booking_clash_attempts
      WHERE (room_id = ${roomId} OR room_id IS NULL)
        AND booking_date = ${new Date(`${date}T00:00:00.000Z`)}
        AND TIME(start_time) < TIME(${toTimeValue(fromMinutes(toMinutes(end) + BUFFER_MINUTES))})
        AND TIME(end_time) > TIME(${toTimeValue(fromMinutes(toMinutes(start) - BUFFER_MINUTES))})
      ORDER BY id
    `;
    return rows.map((r) => ({ id: Number(r.id), userId: r.userId, roomId: r.roomId, start: r.start, end: r.end }));
  }

  async remove(id) {
    await prisma.clashAttempt.delete({ where: { id } });
  }
}

