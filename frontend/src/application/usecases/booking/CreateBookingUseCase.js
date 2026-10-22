/**
 * Thin async wrapper — the backend now owns conflict-checking, the
 * approval decision, filing the facility request, and notifying staff/
 * approvers. This just calls the API and returns its result in the same
 * { success, booking, autoApproved, facilityRequest, conflict } shape
 * the view already expects.
 */
export class CreateBookingUseCase {
  constructor({ bookingRepository }) {
    this.bookingRepository = bookingRepository;
  }

  /** endDate (+ skipNonWorkingDays) books the same room and time on every day from date to endDate.
   * @param {{room:string, date:string, endDate?:string, skipNonWorkingDays?:boolean, start:string, end:string, purpose:string, participants?:number, note?:string, participatingTeachers?:string[], bookingForStudents?:{name:string,studentId:string}[], facility?:object, roomResponsible?:{type:'self'|'other', name?:string, phone?:string}}} input */
  async execute({ room, date, endDate, skipNonWorkingDays, start, end, purpose, participants, note, participatingTeachers, bookingForStudents, facility, roomResponsible }) {
    return this.bookingRepository.create({
      roomId: room, date, endDate, skipNonWorkingDays, start, end, purpose, participants, note, participatingTeachers, bookingForStudents, facility, roomResponsible,
    });
  }
}
