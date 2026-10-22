import { randomBytes } from 'node:crypto';
import { AppError } from '../../../utils/AppError.js';

// Icons the booking form knows how to draw (frontend/src/shared/icons.js);
// anything else falls back to a generic box.
const ICON_KEYS = ['mic', 'proj', 'wb', 'plug', 'hdmi', 'laser', 'monitor', 'box', 'tool'];

export class CreateEquipmentUseCase {
  constructor({ equipmentRepository }) {
    this.equipmentRepository = equipmentRepository;
  }

  async execute({ name, unit, iconKey, total }) {
    const trimmedName = name?.trim();
    const trimmedUnit = unit?.trim();
    if (!trimmedName) throw AppError.badRequest('name is required');
    if (!trimmedUnit) throw AppError.badRequest('unit is required');
    if (!Number.isInteger(total) || total < 0) throw AppError.badRequest('total must be a non-negative integer');
    if (await this.equipmentRepository.findActiveByName(trimmedName)) {
      throw AppError.conflict(`มีอุปกรณ์ "${trimmedName}" อยู่แล้ว`);
    }
    // Generated, not derived from the (Thai) name — it's stored inside every
    // booking's equipment JSON, so it must never be reused after a delete.
    const key = `eq_${randomBytes(4).toString('hex')}`;
    const equipment = await this.equipmentRepository.add({
      key, name: trimmedName, unit: trimmedUnit,
      iconKey: ICON_KEYS.includes(iconKey) ? iconKey : 'box', total,
    });
    return { success: true, equipment };
  }
}
