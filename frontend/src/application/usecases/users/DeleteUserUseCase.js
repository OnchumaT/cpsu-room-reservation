/** Admin-only — the backend rejects with 400 (and a friendly Thai message)
 * if the user has any booking history, since Booking.userId/approvedBy
 * can't be hard-deleted through; the caller shows that message as-is. */
export class DeleteUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ userId }) {
    await this.userRepository.remove(userId);
    return { success: true };
  }
}
