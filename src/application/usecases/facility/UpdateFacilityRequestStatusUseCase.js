export class UpdateFacilityRequestStatusUseCase {
  constructor({ facilityRequestRepository }) {
    this.facilityRequestRepository = facilityRequestRepository;
  }

  accept(id) {
    const request = this.facilityRequestRepository.findById(id);
    if (!request) return { success: false };
    request.accept();
    return { success: true, request };
  }

  markDone(id) {
    const request = this.facilityRequestRepository.findById(id);
    if (!request) return { success: false };
    request.markDone();
    return { success: true, request };
  }
}
