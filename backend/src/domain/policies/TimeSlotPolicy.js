import { AppError } from '../../utils/AppError.js';

// Rooms keep a 10-minute turnaround on both sides of every active booking
// (enforced by BookingRepository.findConflict). Booking times are whole
// 5-minute steps, the finest step the booking form offers.
export const ROOM_TURNAROUND_MINUTES = 10;
export const SLOT_STEP_MINUTES = 5;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function assertSlotAligned(start, end) {
  const aligned = [start, end].every((t) => toMinutes(t) % SLOT_STEP_MINUTES === 0);
  if (!aligned) throw AppError.badRequest(`Booking times must be in ${SLOT_STEP_MINUTES}-minute steps`);
}
