import { AppState } from '../../presentation/state/AppState.js';

import { InMemoryRoomRepository } from '../../infrastructure/repositories/InMemoryRoomRepository.js';
import { InMemoryBookingRepository } from '../../infrastructure/repositories/InMemoryBookingRepository.js';
import { InMemoryTemplateRepository } from '../../infrastructure/repositories/InMemoryTemplateRepository.js';
import { InMemoryNotificationRepository } from '../../infrastructure/repositories/InMemoryNotificationRepository.js';
import { InMemoryFacilityRequestRepository } from '../../infrastructure/repositories/InMemoryFacilityRequestRepository.js';
import { InMemoryUserRepository } from '../../infrastructure/repositories/InMemoryUserRepository.js';
import { InMemoryEquipmentRepository } from '../../infrastructure/repositories/InMemoryEquipmentRepository.js';

import { CreateBookingUseCase } from '../../application/usecases/booking/CreateBookingUseCase.js';
import { CheckRoomAvailabilityUseCase } from '../../application/usecases/booking/CheckRoomAvailabilityUseCase.js';
import { EditBookingUseCase } from '../../application/usecases/booking/EditBookingUseCase.js';
import { CancelBookingUseCase } from '../../application/usecases/booking/CancelBookingUseCase.js';
import { ApproveRejectBookingUseCase } from '../../application/usecases/booking/ApproveRejectBookingUseCase.js';

import { SaveTemplateUseCase } from '../../application/usecases/templates/SaveTemplateUseCase.js';
import { ApplyTemplateUseCase } from '../../application/usecases/templates/ApplyTemplateUseCase.js';
import { UpdateTemplateUseCase } from '../../application/usecases/templates/UpdateTemplateUseCase.js';
import { DuplicateTemplateUseCase } from '../../application/usecases/templates/DuplicateTemplateUseCase.js';
import { DeleteTemplateUseCase } from '../../application/usecases/templates/DeleteTemplateUseCase.js';

import { SearchRoomsUseCase } from '../../application/usecases/rooms/SearchRoomsUseCase.js';

/**
 * Composition root's dependency graph, built in one place (Dependency
 * Inversion in practice): every use-case is constructed here against the
 * concrete `InMemory*Repository` implementations, but only ever consumed
 * elsewhere through the `I*Repository` port shape. Swapping storage later
 * means changing only this file.
 */
export function createContainer() {
  const appState = new AppState();

  const repositories = {
    roomRepository: new InMemoryRoomRepository(),
    bookingRepository: new InMemoryBookingRepository(),
    templateRepository: new InMemoryTemplateRepository(),
    notificationRepository: new InMemoryNotificationRepository(),
    facilityRequestRepository: new InMemoryFacilityRequestRepository(),
    userRepository: new InMemoryUserRepository(),
    equipmentRepository: new InMemoryEquipmentRepository(),
  };

  const useCases = {
    createBookingUseCase: new CreateBookingUseCase(repositories),
    checkRoomAvailabilityUseCase: new CheckRoomAvailabilityUseCase(repositories),
    editBookingUseCase: new EditBookingUseCase(repositories),
    cancelBookingUseCase: new CancelBookingUseCase(repositories),
    approveRejectBookingUseCase: new ApproveRejectBookingUseCase(repositories),

    saveTemplateUseCase: new SaveTemplateUseCase(repositories),
    applyTemplateUseCase: new ApplyTemplateUseCase(repositories),
    updateTemplateUseCase: new UpdateTemplateUseCase(repositories),
    duplicateTemplateUseCase: new DuplicateTemplateUseCase(repositories),
    deleteTemplateUseCase: new DeleteTemplateUseCase(repositories),

    searchRoomsUseCase: new SearchRoomsUseCase(repositories),
  };

  return { appState, repositories, useCases };
}
