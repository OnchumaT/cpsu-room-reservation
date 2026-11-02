import { AppError } from '../../../utils/AppError.js';
import { bookingDates, normalizeWeekdays, normalizeDateList, MAX_BOOKING_DAYS } from '../../../domain/policies/MultiDayBookingPolicy.js';

/**
 * Rooms actually free for a given date+time range: active rooms, not
 * statically marked occupied, and without a pending/approved booking
 * overlapping the requested range — the same overlap rule the booking
 * creation flow itself enforces (BookingRepository.findConflict), just
 * checked across every room at once instead of one at a time. With an
 * `endDate`, a room counts as free only if it is free on every day of the
 * range (see MultiDayBookingPolicy).
 */
export class GetAvailableRoomsUseCase {
  constructor({ roomRepository, bookingRepository, timetableRepository, holidayRepository }) {
    this.holidayRepository = holidayRepository;
    this.roomRepository = roomRepository;
    this.bookingRepository = bookingRepository;
    this.timetableRepository = timetableRepository;
  }

  async execute({ date, endDate, skipNonWorkingDays, weekdays, excludeDates, start, end }) {
    if (!date || !start || !end) throw AppError.badRequest('date, start and end are required');
    if (start >= end) throw AppError.badRequest('start time must be before end time');
    const lastDate = endDate || date;
    if (lastDate < date) throw AppError.badRequest('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');

    const holidayDates = lastDate === date ? [] : await this.holidayRepository.datesInRange(date, lastDate);
    const dates = bookingDates({ date, endDate: lastDate, skipNonWorkingDays: Boolean(skipNonWorkingDays), holidayDates, weekdays: normalizeWeekdays(weekdays), excludeDates: normalizeDateList(excludeDates) });
    if (dates.length > MAX_BOOKING_DAYS) throw AppError.badRequest(`จองได้ไม่เกิน ${MAX_BOOKING_DAYS} วันต่อครั้ง`);
    const [rooms, ...perDay] = await Promise.all([
      this.roomRepository.getAll({ activeOnly: true }),
      ...dates.map((d) => Promise.all([
        this.bookingRepository.findConflictingRoomIds({ date: d, start, end }),
        this.timetableRepository.sessionConflicts({ roomId: null, date: d, start, end }),
      ])),
    ]);
    const conflicting = new Set(perDay.flatMap(([roomIds, sessions]) => [...roomIds, ...sessions.map((s) => s.roomId)]));
    return rooms.filter((r) => r.status !== 'occupied' && !conflicting.has(r.id));
  }
}
