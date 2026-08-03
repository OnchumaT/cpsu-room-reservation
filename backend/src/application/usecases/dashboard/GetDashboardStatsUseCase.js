const DAY_MS = 24 * 60 * 60 * 1000;
const toDateOnly = (d) => d.toISOString().slice(0, 10);

/**
 * All the raw counts the dashboard's stat cards need, computed live from
 * the database — one shape returned regardless of role/canApprove, the
 * view picks which numbers to show. No historical trend tracking exists
 * yet, so "change" figures are kept to things we can compute honestly
 * (e.g. counts within a real time window), never fabricated percentages.
 */
export class GetDashboardStatsUseCase {
  constructor({ bookingRepository, roomRepository, facilityRequestRepository, userRepository }) {
    this.bookingRepository = bookingRepository;
    this.roomRepository = roomRepository;
    this.facilityRequestRepository = facilityRequestRepository;
    this.userRepository = userRepository;
  }

  async execute({ actor }) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(todayStart.getTime() - 7 * DAY_MS);
    const todayStr = toDateOnly(todayStart);

    const [
      pendingBookings,
      pendingBookingsToday,
      totalBookings,
      bookingsThisMonth,
      approvedThisMonth,
      roomsAvailable,
      totalRooms,
      myBookings,
      myBookingsThisWeek,
      myApproved,
      myPending,
      myFacilityRequestsPending,
      facilityRequestsPending,
      totalUsers,
      todaysApprovedBookings,
    ] = await Promise.all([
      this.bookingRepository.count({ status: 'pending' }),
      this.bookingRepository.count({ status: 'pending', createdFrom: todayStart }),
      this.bookingRepository.count(),
      this.bookingRepository.count({ bookingDateFrom: monthStart }),
      this.bookingRepository.count({ status: 'approved', bookingDateFrom: monthStart }),
      this.roomRepository.count({ status: 'available', activeOnly: true }),
      this.roomRepository.count({ activeOnly: true }),
      this.bookingRepository.count({ userId: actor.id }),
      this.bookingRepository.count({ userId: actor.id, createdFrom: weekStart }),
      this.bookingRepository.count({ userId: actor.id, status: 'approved' }),
      this.bookingRepository.count({ userId: actor.id, status: 'pending' }),
      this.facilityRequestRepository.count({ status: 'pending', userId: actor.id }),
      this.facilityRequestRepository.count({ status: 'pending' }),
      this.userRepository.count({ activeOnly: true }),
      this.bookingRepository.getAll({ status: 'approved', date: todayStr }),
    ]);

    const roomsInUseToday = new Set(todaysApprovedBookings.map((b) => b.roomId)).size;

    return {
      pendingBookings,
      pendingBookingsToday,
      totalBookings,
      bookingsThisMonth,
      approvedThisMonth,
      roomsAvailable,
      totalRooms,
      myBookings,
      myBookingsThisWeek,
      myApproved,
      myPending,
      myFacilityRequestsPending,
      facilityRequestsPending,
      roomsInUseToday,
      totalUsers,
    };
  }
}
