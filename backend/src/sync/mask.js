export function maskBooking(row) {
  return {
    ...row,
    participatingTeachers: (row.participatingTeachers ?? []).map((_, i) => `อาจารย์ทดสอบ #${i + 1}`),
    bookingForStudents: (row.bookingForStudents ?? []).map((s, i) => ({
      ...s,
      name: `นักศึกษาทดสอบ #${i + 1}`,
      studentId: '0000000000',
    })),
    roomResponsibleName: row.roomResponsibleName == null ? null : `ผู้รับผิดชอบทดสอบ #${row.id}`,
    roomResponsiblePhone: row.roomResponsiblePhone == null ? null : '0000000000',
  };
}
