import { AppError } from '../../../utils/AppError.js';

/**
 * Rooms actually free for a given date+time range: active rooms, not
 * statically marked occupied, and without a pending/approved booking
 * overlapping the requested range — the same overlap rule the booking
 * creation flow itself enforces (BookingRepository.findConflict), just
 * checked across every room at once instead of one at a time.
 */
export class GetAvailableRoomsUseCase {
  constructor({ roomRepository, bookingRepository }) {
    this.roomRepository = roomRepository;
    this.bookingRepository = bookingRepository;
  }

  async execute({ date, start, end }) {
    if (!date || !start || !end) throw AppError.badRequest('date, start and end are required');
    if (start >= end) throw AppError.badRequest('start time must be before end time');

    const [rooms, conflictingRoomIds] = await Promise.all([
      this.roomRepository.getAll({ activeOnly: true }),
      this.bookingRepository.findConflictingRoomIds({ date, start, end }),
    ]);
    const conflicting = new Set(conflictingRoomIds);
    return rooms.filter((r) => r.status !== 'occupied' && !conflicting.has(r.id));
  }
}
