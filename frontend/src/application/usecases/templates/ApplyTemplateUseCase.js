/** Turns a saved Template into a prefill draft for the booking form. */
export class ApplyTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ templateId }) {
    const draft = await this.templateRepository.apply(templateId);
    if (!draft) return { success: false };
    return { success: true, draft };
  }
}
