export class DuplicateTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ templateId }) {
    const template = await this.templateRepository.duplicate(templateId);
    return { success: true, template };
  }
}
