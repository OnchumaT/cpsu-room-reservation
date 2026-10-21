import { Booking } from '../../domain/entities/Booking.js';
import { ApiError } from '../api/ApiClient.js';

export function createBookingRepository({ apiClient }) {
  let cache = [];

  async function refresh(filters = {}) {
    const { bookings } = await apiClient.get('/bookings', filters);
    cache = bookings.map((b) => new Booking(b));
    return cache;
  }

  function getAll() {
    return cache;
  }

  // Ids arrive both as numbers (bookings from the API) and as strings
  // (notifications' bookingId, route params) — compare them as strings.
  function findById(id) {
    return cache.find((b) => String(b.id) === String(id));
  }

  async function fetchById(id) {
    const { booking } = await apiClient.get(`/bookings/${id}`);
    return new Booking(booking);
  }

  /** @returns {{success:boolean, booking?:Booking, facilityRequest?:object, autoApproved?:boolean, conflict?:object}} */
  async function create(input) {
    try {
      const result = await apiClient.post('/bookings', input);
      return { success: true, booking: new Booking(result.booking), facilityRequest: result.facilityRequest, autoApproved: result.autoApproved };
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        return { success: false, conflict: err.details?.conflict ? new Booking(err.details.conflict) : null };
      }
      throw err;
    }
  }

  async function edit(id, changes) {
    const result = await apiClient.patch(`/bookings/${id}`, changes);
    return { ...result, booking: new Booking(result.booking) };
  }

  async function cancel(id) {
    const { booking } = await apiClient.post(`/bookings/${id}/cancel`);
    return new Booking(booking);
  }

  async function approve(id, { confirmResponsible = false } = {}) {
    const { booking } = await apiClient.patch(`/bookings/${id}/approve`, { confirmResponsible });
    return new Booking(booking);
  }

  async function reject(id, reason) {
    const { booking } = await apiClient.patch(`/bookings/${id}/reject`, { reason });
    return new Booking(booking);
  }

  async function checkAvailability({ room, date }) {
    return apiClient.get('/bookings/availability', { roomId: room, date });
  }

  async function getInRange({ start, end, roomId }) {
    const { bookings } = await apiClient.get('/bookings/calendar', { start, end, room_id: roomId });
    return bookings.map((b) => new Booking(b));
  }

  async function getPending() {
    const { bookings } = await apiClient.get('/bookings/pending');
    return bookings.map((b) => new Booking(b));
  }

  async function recordFacultyResult(id, { result, note }) {
    const { booking } = await apiClient.post(`/bookings/${id}/faculty-result`, { result, note });
    return new Booking(booking);
  }

  /** Asks to be told when any room frees up for this slot. */
  async function watchAvailability({ date, start, end, roomId = null }) {
    return apiClient.post('/bookings/watch', { date, start, end, roomId });
  }

  /** QR check-in: { roomId, token } from the scanned code -> { alreadyCheckedIn, booking }. */
  async function checkIn({ roomId, token }) {
    const result = await apiClient.post('/bookings/check-in', { roomId, token });
    return { ...result, booking: new Booking(result.booking) };
  }

  /** Staff/admin checking a booking in on the booker's behalf. */
  async function checkInOnBehalf(id) {
    const result = await apiClient.post(`/bookings/${id}/check-in`);
    return { ...result, booking: new Booking(result.booking) };
  }

  return { refresh, getAll, findById, fetchById, create, edit, cancel, approve, reject, checkAvailability, getInRange, getPending, recordFacultyResult, watchAvailability, checkIn, checkInOnBehalf };
}
