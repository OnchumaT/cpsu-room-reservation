export class DuplicateTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  /** @param {{role:string, templateId:string}} input */
  execute({ role, templateId }) {
    const template = this.templateRepository.findByIdForRole(role, templateId);
    if (!template) return { success: false };
    const copy = template.duplicate();
    this.templateRepository.addForRole(role, copy);
    return { success: true, template: copy };
  }
}
