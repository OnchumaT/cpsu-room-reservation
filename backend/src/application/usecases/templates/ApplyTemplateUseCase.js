import { AppError } from '../../../utils/AppError.js';

/** Turns a saved Template into a prefill draft for the booking form. */
export class ApplyTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ userId, templateId }) {
    const template = await this.templateRepository.findByIdForUser(userId, templateId);
    if (!template) throw AppError.notFound('Template not found');
    const { id, name, ...draft } = template;
    return { success: true, draft };
  }
}
