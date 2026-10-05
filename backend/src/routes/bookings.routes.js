import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { authenticate, requireCanApprove } from '../middleware/auth.js';
import { BookingVisibilityPolicy } from '../domain/policies/BookingVisibilityPolicy.js';

const ROLES_THAT_CAN_BOOK = new Set(['teacher']);

export function bookingRoutes({ useCases, repositories }) {
  const router = Router();
  router.use(authenticate);

  async function viewFor(req, bookings) {
    const canApprove = await repositories.userRepository.canApprove(req.user.id);
    return bookings
      .map((booking) => BookingVisibilityPolicy.viewFor({ viewer: req.user, canApprove, booking }))
      .filter(Boolean);
  }

  router.get('/', asyncHandler(async (req, res) => {
    const { roomId, date, status, mine } = req.query;
    const filters = { roomId, date, status };
    if (mine === 'true') filters.userId = req.user.id;
    const bookings = await repositories.bookingRepository.getAll(filters);
    res.json({ bookings: await viewFor(req, bookings) });
  }));

  // Static sub-paths (calendar/my/pending/availability) must be registered
  // before the dynamic /:id route below, or Express would match them as
  // an id instead.
  router.get('/calendar', asyncHandler(async (req, res) => {
    const { start, end, room_id: roomId } = req.query;
    if (!start || !end) throw AppError.badRequest('start and end are required');
    const bookings = await repositories.bookingRepository.getInRange({ start, end, roomId });
    res.json({ bookings: await viewFor(req, bookings) });
  }));

  router.get('/my', asyncHandler(async (req, res) => {
    const bookings = await repositories.bookingRepository.getAll({ userId: req.user.id });
    res.json({ bookings });
  }));

  router.get('/pending', requireCanApprove(repositories), asyncHandler(async (req, res) => {
    const bookings = await repositories.bookingRepository.getPending();
    res.json({ bookings });
  }));

  router.get('/availability', asyncHandler(async (req, res) => {
    const result = await useCases.checkRoomAvailabilityUseCase.execute({ roomId: req.query.roomId, date: req.query.date });
    res.json(result);
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const found = await repositories.bookingRepository.findById(req.params.id);
    const [booking] = found ? await viewFor(req, [found]) : [];
    if (!booking) throw AppError.notFound('Booking not found');
    res.json({ booking });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    // Booking rooms is for teachers (+ anyone holding a can_approve
    // position, e.g. a head still books rooms like everyone else) —
    // mirrors the frontend's BookingPermissionPolicy.canBookRooms. Students
    // never book directly; a teacher books on their behalf via bookingForStudents.
    const allowed = ROLES_THAT_CAN_BOOK.has(req.user.role) || await repositories.userRepository.canApprove(req.user.id);
    if (!allowed) throw AppError.forbidden('This role cannot create bookings');

    const { roomId, date, start, end, purpose, participants, note, participatingTeachers, bookingForStudents, facility, roomResponsible } = req.body;
    // Defense in depth — the use-case re-checks this too, but failing fast
    // here avoids doing an overlap-check query for a request we'll reject anyway.
    const wantsFacility = facility && (Object.values(facility.equipment || {}).some((v) => v > 0) || (facility.food || []).length);
    if (wantsFacility && req.user.role !== 'teacher' && !(await repositories.userRepository.canApprove(req.user.id))) {
      throw AppError.forbidden('Only teachers can request facilities when booking');
    }
    const result = await useCases.createBookingUseCase.execute({
      actor: req.user, roomId, date, start, end, purpose, participants, note, participatingTeachers, bookingForStudents, facility, roomResponsible,
    });
    res.status(201).json(result);
  }));

  router.patch('/:id', asyncHandler(async (req, res) => {
    const { date, start, end, title, note, facility } = req.body;
    const result = await useCases.editBookingUseCase.execute({
      bookingId: req.params.id, actor: req.user, date, start, end, title, note, facility,
    });
    res.json(result);
  }));

  router.post('/:id/cancel', asyncHandler(async (req, res) => {
    const result = await useCases.cancelBookingUseCase.execute({ bookingId: req.params.id, actor: req.user });
    res.json(result);
  }));

  router.patch('/:id/approve', requireCanApprove(repositories), asyncHandler(async (req, res) => {
    const result = await useCases.approveRejectBookingUseCase.approve({ bookingId: req.params.id, approver: req.user });
    res.json(result);
  }));

  router.patch('/:id/reject', requireCanApprove(repositories), asyncHandler(async (req, res) => {
    const result = await useCases.approveRejectBookingUseCase.reject({
      bookingId: req.params.id, approver: req.user, reason: req.body.reason,
    });
    res.json(result);
  }));

  return router;
}
