/** Filters the room list by free-text query and/or status — backs both the
 * search box and the status filter chips on the Rooms page. */
export class SearchRoomsUseCase {
  constructor({ roomRepository }) {
    this.roomRepository = roomRepository;
  }

  /** @param {{query?:string, status?:string, buildingId?:string|number}} input */
  execute({ query = '', status = 'all', buildingId = 'all' } = {}) {
    let rooms = this.roomRepository.getAll();
    if (query) rooms = rooms.filter((r) => r.matchesSearch(query));
    if (status && status !== 'all') rooms = rooms.filter((r) => r.status === status);
    if (buildingId && buildingId !== 'all') rooms = rooms.filter((r) => String(r.building?.id) === String(buildingId));
    return { rooms };
  }
}
