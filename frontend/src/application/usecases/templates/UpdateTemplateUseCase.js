/** Updates any/all editable fields of an existing Template (full-edit modal), or just its name (rename modal). */
export class UpdateTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ templateId, changes }) {
    if ('name' in changes && !changes.name.trim()) return { success: false, reason: 'missing-name' };
    const template = await this.templateRepository.update(templateId, changes);
    return { success: true, template };
  }

  rename({ templateId, name }) {
    return this.execute({ templateId, changes: { name } });
  }
}
