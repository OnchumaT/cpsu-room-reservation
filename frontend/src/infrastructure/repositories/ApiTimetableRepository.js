// Timetable import is admin-only. Preview never writes; import is refused by the
// server unless every row passed the same checks. Reading a day's classes is open to all users.
export function createTimetableRepository({ apiClient }) {
  function preview(payload) {
    return apiClient.post('/timetable/preview', payload);
  }

  function importTimetable(payload) {
    return apiClient.post('/timetable/import', payload);
  }

  async function history() {
    const { imports } = await apiClient.get('/timetable/imports');
    return imports;
  }

  async function schedulesForDate(date) {
    const { schedules } = await apiClient.get('/timetable/schedules', { date });
    return schedules;
  }

  async function schedulesForRange(start, end) {
    const { schedules } = await apiClient.get('/timetable/schedules', { start, end });
    return schedules;
  }

  return { preview, importTimetable, history, schedulesForDate, schedulesForRange };
}
