const ROLES = ['teacher', 'student', 'staff', 'admin'];
const pad2 = (n) => String(n).padStart(2, '0');
const toMonthKey = (year, month) => `${year}-${pad2(month + 1)}`;

/**
 * Local-calendar-date string — NOT `.toISOString()`, which reads the UTC
 * date and silently returns "yesterday" for any locally-constructed
 * midnight Date in a timezone ahead of UTC (e.g. ICT/UTC+7, this server's
 * zone). Every date here is built from local getters, so it must be
 * formatted back the same way.
 */
const toLocalDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Backs the admin-only "วิเคราะห์ข้อมูล" page — every number here is a
 * live aggregate, not the static demo data AnalyticsView shipped with
 * originally. Kept as one wide read rather than several small endpoints
 * since the page renders everything together in one screen.
 */
export class GetAnalyticsUseCase {
  constructor({ bookingRepository, roomRepository, userRepository }) {
    this.bookingRepository = bookingRepository;
    this.roomRepository = roomRepository;
    this.userRepository = userRepository;
  }

  async execute() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthStart = new Date(`${y}-${pad2(m + 1)}-01`);
    const monthEnd = new Date(`${y}-${pad2(m + 1)}-${pad2(new Date(y, m + 1, 0).getDate())}`);
    const sixMonthsAgoStart = new Date(y, m - 5, 1);
    const currentMonthKey = toMonthKey(y, m);

    const [
      bookingsThisMonth,
      approvedDecidedThisMonth,
      rejectedDecidedThisMonth,
      totalRooms,
      roleCounts,
      totalUsers,
      rooms,
      recentBookings,
    ] = await Promise.all([
      this.bookingRepository.count({ bookingDateFrom: monthStart, bookingDateTo: monthEnd, excludeArchived: true }),
      this.bookingRepository.count({ status: 'approved', decidedFrom: monthStart, excludeArchived: true }),
      this.bookingRepository.count({ status: 'rejected', decidedFrom: monthStart, excludeArchived: true }),
      this.roomRepository.count({ activeOnly: true }),
      this.userRepository.countByRole(),
      this.userRepository.count({ activeOnly: true }),
      this.roomRepository.getAll({ activeOnly: true }),
      this.bookingRepository.getInRange({ start: toLocalDateStr(sixMonthsAgoStart), end: toLocalDateStr(now), excludeArchived: true }),
    ]);

    // Monthly bookings — last 6 months including the current one. `date`
    // on a serialized booking is a plain 'YYYY-MM-DD' string, so a prefix
    // match sidesteps any Date/timezone parsing entirely.
    const monthlyBookings = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = toMonthKey(d.getFullYear(), d.getMonth());
      monthlyBookings.push({ month: key, count: recentBookings.filter((b) => b.date.startsWith(key)).length });
    }

    // Room usage — active (pending/approved) bookings over the same 6-month window.
    const activeRecent = recentBookings.filter((b) => b.status === 'pending' || b.status === 'approved');
    const countByRoom = new Map();
    activeRecent.forEach((b) => countByRoom.set(b.roomId, (countByRoom.get(b.roomId) || 0) + 1));
    const roomUsage = rooms
      .map((r) => ({ roomId: r.id, roomName: r.name, count: countByRoom.get(r.id) || 0 }))
      .sort((a, b) => b.count - a.count);

    // Utilization — rooms with >=1 approved booking this month, of all active rooms.
    const roomsUsedThisMonth = new Set(
      recentBookings.filter((b) => b.status === 'approved' && b.date.startsWith(currentMonthKey)).map((b) => b.roomId),
    ).size;
    const utilizationRatePct = totalRooms > 0 ? Math.round((roomsUsedThisMonth / totalRooms) * 100) : 0;

    const decidedThisMonth = approvedDecidedThisMonth + rejectedDecidedThisMonth;
    const approvalRatePct = decidedThisMonth > 0 ? Math.round((approvedDecidedThisMonth / decidedThisMonth) * 100) : null;

    const userShare = ROLES.map((role) => {
      const count = roleCounts[role] || 0;
      return { role, count, pct: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0 };
    });

    return {
      bookingsThisMonth, totalUsers, utilizationRatePct, approvalRatePct,
      monthlyBookings, userShare, roomUsage,
    };
  }
}
