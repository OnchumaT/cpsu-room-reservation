import { AppError } from '../../../utils/AppError.js';

/** Saves the just-completed booking's editable fields (never date/time) as a new Template. */
export class SaveTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ userId, name, snapshot }) {
    if (!name?.trim()) throw AppError.badRequest('Template name is required');
    const template = await this.templateRepository.addForUser(userId, { ...snapshot, name: name.trim() });
    return { success: true, template };
  }
}
