/** Updates any/all editable fields of an existing Template (full-edit modal), or just its name (rename modal). */
export class UpdateTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  /** @param {{role:string, templateId:string, changes:object}} input */
  execute({ role, templateId, changes }) {
    const template = this.templateRepository.findByIdForRole(role, templateId);
    if (!template) return { success: false, reason: 'not-found' };
    if ('name' in changes && !changes.name.trim()) return { success: false, reason: 'missing-name' };
    Object.assign(template, changes);
    return { success: true, template };
  }

  rename({ role, templateId, name }) {
    return this.execute({ role, templateId, changes: { name } });
  }
}
