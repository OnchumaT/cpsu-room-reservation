import { AppError } from '../../../utils/AppError.js';

export class DuplicateTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ userId, templateId }) {
    const template = await this.templateRepository.findByIdForUser(userId, templateId);
    if (!template) throw AppError.notFound('Template not found');
    const copy = await this.templateRepository.addForUser(userId, {
      room: template.room, name: `${template.name} (สำเนา)`, purpose: template.purpose,
      participants: template.participants, note: template.note, equipment: template.equipment,
      food: template.food, facilityNote: template.facilityNote,
    });
    return { success: true, template: copy };
  }
}
