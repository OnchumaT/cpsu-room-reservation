/** Thin async wrapper — the backend owns the requester FYI notification. */
export class UpdateFacilityRequestStatusUseCase {
  constructor({ facilityRequestRepository }) {
    this.facilityRequestRepository = facilityRequestRepository;
  }

  async accept(id) {
    const request = await this.facilityRequestRepository.accept(id);
    return { success: true, request };
  }

  async markDone(id) {
    const request = await this.facilityRequestRepository.markDone(id);
    return { success: true, request };
  }

  async markNotDone(id) {
    const request = await this.facilityRequestRepository.markNotDone(id);
    return { success: true, request };
  }
}
