/** Turns a saved Template into a prefill draft for the booking form. */
export class ApplyTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  /** @param {{role:string, templateId:string}} input */
  execute({ role, templateId }) {
    const template = this.templateRepository.findByIdForRole(role, templateId);
    if (!template) return { success: false };
    return { success: true, draft: template.toBookingDraft() };
  }
}
