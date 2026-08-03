/**
 * Thin async wrapper — the backend now owns the FYI notifications to
 * Approvers/Staff (and the facility-specific one when a teacher also
 * changed their equipment/food ask). Returns { success, booking,
 * notifiedStaff } same as before.
 */
export class EditBookingUseCase {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  /** @param {{bookingId:string, date:string, start:string, end:string, title:string, note?:string, facility?:{equipment:Record<string,number>, food:string[]}}} input */
  async execute({ bookingId, date, start, end, title, note, facility }) {
    return this.bookingRepository.edit(bookingId, { date, start, end, title, note, facility });
  }
}
