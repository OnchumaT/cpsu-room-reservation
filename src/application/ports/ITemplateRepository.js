export class ITemplateRepository {
  /** @returns {import('../../domain/entities/Template.js').Template[]} */
  getAllForRole(_role) { throw new Error('not implemented'); }

  /** @returns {import('../../domain/entities/Template.js').Template|undefined} */
  findByIdForRole(_role, _id) { throw new Error('not implemented'); }

  addForRole(_role, _template) { throw new Error('not implemented'); }

  removeForRole(_role, _id) { throw new Error('not implemented'); }
}
