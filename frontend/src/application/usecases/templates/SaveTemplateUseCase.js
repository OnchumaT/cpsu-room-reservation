/** Saves the just-completed booking's editable fields (never date/time) as a new Template. */
export class SaveTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ name, snapshot }) {
    if (!name || !name.trim()) return { success: false, reason: 'missing-name' };
    const template = await this.templateRepository.save({ name: name.trim(), snapshot });
    return { success: true, template };
  }
}
