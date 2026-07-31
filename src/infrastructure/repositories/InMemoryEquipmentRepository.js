import { IEquipmentRepository } from '../../application/ports/IEquipmentRepository.js';
import { EQUIPMENT_SEED } from '../seed/equipment.seed.js';

// Consumed by the Equipment use-cases/view in the follow-up migration phase.
export class InMemoryEquipmentRepository extends IEquipmentRepository {
  constructor(seed = EQUIPMENT_SEED) {
    super();
    this._items = seed.map((e) => ({ ...e }));
  }

  getAll() {
    return this._items;
  }

  add(equipment) {
    this._items.push(equipment);
  }

  update(index, changes) {
    if (this._items[index]) Object.assign(this._items[index], changes);
  }
}
