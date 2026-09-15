const DAY_MS = 24 * 60 * 60 * 1000;
const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Local-calendar-date string for a Date object — NOT `.toISOString()`,
 * which reads the UTC date and silently returns "yesterday" for any local
 * midnight-anchored Date in a timezone ahead of UTC (e.g. ICT/UTC+7, this
 * server's zone). Every date here is constructed locally, so every
 * string built from it must also read local getters.
 */
const toLocalDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * `bookingDate` is a `@db.Date` (calendar-date, no time) column — building
 * its bounds from a locally-constructed `new Date(year, month, day)` and
 * letting Prisma serialize that would silently shift by a day in any
 * timezone ahead of UTC (e.g. ICT/UTC+7), since the JS Date only really
 * holds a UTC instant. Building the bound from a 'YYYY-MM-DD' string
 * instead (same convention BookingRepository already uses everywhere
 * else for this column) sidesteps that entirely.
 */
function monthBounds(now) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return {
    start: new Date(`${y}-${pad2(m + 1)}-01`),
    end: new Date(`${y}-${pad2(m + 1)}-${pad2(lastDay)}`),
  };
}

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
    const { start: monthStart, end: monthEnd } = monthBounds(now);
    const weekStart = new Date(todayStart.getTime() - 7 * DAY_MS);
    const todayStr = toLocalDateStr(now);

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
      this.bookingRepository.count({ bookingDateFrom: monthStart, bookingDateTo: monthEnd }),
      this.bookingRepository.count({ status: 'approved', bookingDateFrom: monthStart, bookingDateTo: monthEnd }),
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
