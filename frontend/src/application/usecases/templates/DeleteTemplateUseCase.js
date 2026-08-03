export class DeleteTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ templateId }) {
    await this.templateRepository.remove(templateId);
    return { success: true };
  }
}
