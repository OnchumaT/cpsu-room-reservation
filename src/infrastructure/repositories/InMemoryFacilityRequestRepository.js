import { IFacilityRequestRepository } from '../../application/ports/IFacilityRequestRepository.js';
import { FacilityRequest } from '../../domain/entities/FacilityRequest.js';
import { FACILITY_REQUESTS_SEED } from '../seed/facilityRequests.seed.js';

export class InMemoryFacilityRequestRepository extends IFacilityRequestRepository {
  constructor(seed = FACILITY_REQUESTS_SEED) {
    super();
    this._requests = seed.map((r) => new FacilityRequest(r));
  }

  getAll() {
    return this._requests;
  }

  add(facilityRequest) {
    this._requests.unshift(facilityRequest);
  }

  count() {
    return this._requests.length;
  }
}
