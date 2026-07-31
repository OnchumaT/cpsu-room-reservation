import { ITemplateRepository } from '../../application/ports/ITemplateRepository.js';
import { Template } from '../../domain/entities/Template.js';
import { TEMPLATES_SEED } from '../seed/templates.seed.js';

export class InMemoryTemplateRepository extends ITemplateRepository {
  constructor(seed = TEMPLATES_SEED) {
    super();
    this._byRole = {
      teacher: seed.teacher.map((t) => new Template(t)),
      student: seed.student.map((t) => new Template(t)),
      head: seed.head.map((t) => new Template(t)),
    };
  }

  getAllForRole(role) {
    return this._byRole[role] || [];
  }

  findByIdForRole(role, id) {
    return this.getAllForRole(role).find((t) => t.id === id);
  }

  addForRole(role, template) {
    if (!this._byRole[role]) return;
    this._byRole[role].unshift(template);
  }

  removeForRole(role, id) {
    const list = this._byRole[role];
    if (!list) return;
    const i = list.findIndex((t) => t.id === id);
    if (i > -1) list.splice(i, 1);
  }
}
