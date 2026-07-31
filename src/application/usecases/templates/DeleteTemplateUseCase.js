export class DeleteTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  /** @param {{role:string, templateId:string}} input */
  execute({ role, templateId }) {
    this.templateRepository.removeForRole(role, templateId);
    return { success: true };
  }
}
