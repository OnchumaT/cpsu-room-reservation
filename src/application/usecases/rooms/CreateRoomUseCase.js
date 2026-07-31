import { Room } from '../../../domain/entities/Room.js';

const GRADIENTS = [
  'linear-gradient(135deg,#2A2262,#38419D)',
  'linear-gradient(135deg,#0F4C75,#1B9AAA)',
  'linear-gradient(135deg,#0A3D1E,#1B7A3A)',
];

export class CreateRoomUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  execute({ id, cap, floor, status }) {
    if (!id || !id.trim()) return { success: false, reason: 'missing-id' };
    if (this.roomRepository.findById(id)) return { success: false, reason: 'duplicate-id' };
    const rooms = this.roomRepository.getAll();
    const room = new Room({
      id, name: `ห้อง ${id}`, cap: cap || 20, floor: floor || 6,
      status: status || 'available', grad: GRADIENTS[rooms.length % GRADIENTS.length],
    });
    this.roomRepository.add(room);
    return { success: true, room };
  }
}
