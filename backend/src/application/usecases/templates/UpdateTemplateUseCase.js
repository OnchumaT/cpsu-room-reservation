import { AppError } from '../../../utils/AppError.js';

/** Updates any/all editable fields of an existing Template, or just its name (rename). */
export class UpdateTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ userId, templateId, changes }) {
    const template = await this.templateRepository.findByIdForUser(userId, templateId);
    if (!template) throw AppError.notFound('Template not found');
    if ('name' in changes && !changes.name.trim()) throw AppError.badRequest('Template name is required');
    const updated = await this.templateRepository.update(templateId, changes);
    return { success: true, template: updated };
  }

  rename({ userId, templateId, name }) {
    return this.execute({ userId, templateId, changes: { name } });
  }
}
