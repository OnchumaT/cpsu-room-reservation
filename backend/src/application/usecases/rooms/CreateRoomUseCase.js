import { AppError } from '../../../utils/AppError.js';

const GRADIENTS = [
  'linear-gradient(135deg,#2A2262,#38419D)',
  'linear-gradient(135deg,#4A1B6D,#7C3ABD)',
  'linear-gradient(135deg,#0F4C75,#1B9AAA)',
  'linear-gradient(135deg,#7A3B00,#D4820A)',
  'linear-gradient(135deg,#0A3D1E,#1B7A3A)',
];

export class CreateRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  async execute({ id, cap, floor, status }) {
    if (!id?.trim()) throw AppError.badRequest('Room id is required');
    if (await this.roomRepository.findById(id)) throw AppError.conflict(`Room ${id} already exists`);
    const rooms = await this.roomRepository.getAll();
    const room = await this.roomRepository.add({
      id: id.trim(), name: `ห้อง ${id.trim()}`, cap: cap || 20, floor: floor || 6,
      status: status || 'available', grad: GRADIENTS[rooms.length % GRADIENTS.length],
    });
    return { success: true, room };
  }
}
