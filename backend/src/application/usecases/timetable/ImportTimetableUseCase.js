import { AppError } from '../../../utils/AppError.js';
import { analyzeTimetable } from '../../../timetable/timetableCsv.js';

const MAX_CSV_CHARS = 1_000_000;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertInput({ academicYear, semester, building, termStartDate, termEndDate, fileName, csv }) {
  if (!academicYear || !semester || !building) throw AppError.badRequest('academicYear, semester and building are required');
  if (!DATE_RE.test(termStartDate ?? '') || !DATE_RE.test(termEndDate ?? '')) {
    throw AppError.badRequest('termStartDate and termEndDate are required (YYYY-MM-DD)');
  }
  if (termEndDate < termStartDate) throw AppError.badRequest('วันสิ้นสุดภาคเรียนต้องไม่ก่อนวันเริ่มภาคเรียน');
  if (!fileName) throw AppError.badRequest('fileName is required');
  if (typeof csv !== 'string' || !csv.trim()) throw AppError.badRequest('csv is empty');
  if (csv.length > MAX_CSV_CHARS) throw AppError.badRequest('csv is too large');
}

export class ImportTimetableUseCase {
  constructor({ timetableRepository }) {
    this.timetableRepository = timetableRepository;
  }

  // Preview: reads rooms and checks every row. Never writes.
  async preview(input) {
    assertInput(input);
    const rooms = await this.timetableRepository.rooms();
    return analyzeTimetable({ csv: input.csv, rooms });
  }

  // Import: only when every row passed the same checks as preview. Adds new
  // rows and updates existing ones by identity; never deletes — unless the
  // caller explicitly opts into `clearExisting`, which wipes every schedule
  // row from a prior import of this exact term/building first.
  async import({ actor, clearExisting, ...input }) {
    assertInput(input);
    const rooms = await this.timetableRepository.rooms();
    const analysis = analyzeTimetable({ csv: input.csv, rooms });
    if (!analysis.canImport) {
      throw AppError.badRequest('มีแถวที่ยังไม่พร้อมนำเข้า แก้ไขก่อนจึงจะนำเข้าได้', { summary: analysis.summary });
    }

    return this.timetableRepository.transaction(async (tx) => {
      const removedCount = clearExisting
        ? await this.timetableRepository.deleteSchedulesForTerm(tx, {
          academicYear: input.academicYear, semester: input.semester, building: input.building,
        })
        : 0;
      const importRow = await this.timetableRepository.createImport(tx, {
        academicYear: input.academicYear,
        semester: input.semester,
        building: input.building,
        termStartDate: new Date(`${input.termStartDate}T00:00:00.000Z`),
        termEndDate: new Date(`${input.termEndDate}T00:00:00.000Z`),
        fileName: input.fileName,
        importedBy: actor.id,
        totalRows: analysis.rows.length,
        addedCount: 0,
        updatedCount: 0,
      });
      let added = 0;
      let updated = 0;
      for (const row of analysis.rows) {
        const outcome = await this.timetableRepository.upsertSchedule(tx, {
          academicYear: input.academicYear,
          semester: input.semester,
          roomId: row.roomId,
          dayOfWeek: row.dayOfWeek,
          start: row.start,
          end: row.end,
          courseCode: row.courseCode,
          section: row.section,
          importId: importRow.id,
        });
        if (outcome === 'added') added += 1;
        else updated += 1;
      }
      await tx.timetableImport.update({
        where: { id: importRow.id },
        data: { addedCount: added, updatedCount: updated },
      });
      return { importId: importRow.id, totalRows: analysis.rows.length, addedCount: added, updatedCount: updated, removedCount };
    });
  }
}
