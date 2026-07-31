import { Template } from '../../../domain/entities/Template.js';

/** Saves the just-completed booking's editable fields (never date/time) as a new Template. */
export class SaveTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  /** @param {{role:string, name:string, snapshot:object}} input */
  execute({ role, name, snapshot }) {
    if (!name || !name.trim()) return { success: false, reason: 'missing-name' };
    const template = Template.fromBookingSnapshot(snapshot);
    template.rename(name.trim());
    this.templateRepository.addForRole(role, template);
    return { success: true, template };
  }
}
