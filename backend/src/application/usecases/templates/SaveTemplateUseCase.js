import { AppError } from '../../../utils/AppError.js';
import { isValidParticipants } from '../../../domain/policies/ParticipantsPolicy.js';

/** Saves the just-completed booking's editable fields (never date/time) as a new Template. */
export class SaveTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ userId, name, snapshot }) {
    if (!name?.trim()) throw AppError.badRequest('Template name is required');
    if (!isValidParticipants(snapshot?.participants)) throw AppError.badRequest('participants must be a whole number of at least 1');
    const template = await this.templateRepository.addForUser(userId, { ...snapshot, name: name.trim() });
    return { success: true, template };
  }
}
