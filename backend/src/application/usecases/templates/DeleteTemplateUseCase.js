export class DeleteTemplateUseCase {
  constructor({ templateRepository }) {
    this.templateRepository = templateRepository;
  }

  async execute({ userId, templateId }) {
    await this.templateRepository.removeForUser(userId, templateId);
    return { success: true };
  }
}
