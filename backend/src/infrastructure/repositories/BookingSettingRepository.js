import { prisma } from '../../lib/prisma.js';

// Single-row table — the department-wide default approval mode, read by
// CreateBookingUseCase on every new booking.
export class BookingSettingRepository {
  async get() {
    const row = await prisma.bookingSetting.findFirst({ orderBy: { id: 'desc' } });
    if (row) return row;
    return prisma.bookingSetting.create({ data: { approvalMode: 'manual' } });
  }

  async getMode() {
    return (await this.get()).approvalMode;
  }

  async setMode(mode, updatedBy) {
    const existing = await prisma.bookingSetting.findFirst({ orderBy: { id: 'desc' } });
    if (existing) {
      return prisma.bookingSetting.update({ where: { id: existing.id }, data: { approvalMode: mode, updatedBy } });
    }
    return prisma.bookingSetting.create({ data: { approvalMode: mode, updatedBy } });
  }

  async getMaxAdvanceDays() {
    return (await this.get()).maxAdvanceDays;
  }

  async setMaxAdvanceDays(days, updatedBy) {
    const existing = await prisma.bookingSetting.findFirst({ orderBy: { id: 'desc' } });
    if (existing) {
      return prisma.bookingSetting.update({ where: { id: existing.id }, data: { maxAdvanceDays: days, updatedBy } });
    }
    return prisma.bookingSetting.create({ data: { maxAdvanceDays: days, updatedBy } });
  }

  async getRetentionDays() {
    return (await this.get()).retentionDays;
  }

  async setRetentionDays(days, updatedBy) {
    const existing = await prisma.bookingSetting.findFirst({ orderBy: { id: 'desc' } });
    if (existing) {
      return prisma.bookingSetting.update({ where: { id: existing.id }, data: { retentionDays: days, updatedBy } });
    }
    return prisma.bookingSetting.create({ data: { retentionDays: days, updatedBy } });
  }
}
