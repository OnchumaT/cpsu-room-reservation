import { apiClient } from '../../infrastructure/api/ApiClient.js';
import { createAuthClient } from '../../infrastructure/api/AuthClient.js';

import { createRoomRepository } from '../../infrastructure/repositories/ApiRoomRepository.js';
import { createBookingRepository } from '../../infrastructure/repositories/ApiBookingRepository.js';
import { createTemplateRepository } from '../../infrastructure/repositories/ApiTemplateRepository.js';
import { createNotificationRepository } from '../../infrastructure/repositories/ApiNotificationRepository.js';
import { createFacilityRequestRepository } from '../../infrastructure/repositories/ApiFacilityRequestRepository.js';
import { createUserRepository } from '../../infrastructure/repositories/ApiUserRepository.js';
import { createSettingsRepository } from '../../infrastructure/repositories/ApiSettingsRepository.js';
import { createDashboardRepository } from '../../infrastructure/repositories/ApiDashboardRepository.js';
import { createAnalyticsRepository } from '../../infrastructure/repositories/ApiAnalyticsRepository.js';

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
import { CreateRoomUseCase } from '../../application/usecases/rooms/CreateRoomUseCase.js';
import { UpdateRoomUseCase } from '../../application/usecases/rooms/UpdateRoomUseCase.js';
import { ToggleRoomStatusUseCase } from '../../application/usecases/rooms/ToggleRoomStatusUseCase.js';
import { DeleteRoomUseCase } from '../../application/usecases/rooms/DeleteRoomUseCase.js';

import { UpdateFacilityRequestStatusUseCase } from '../../application/usecases/facility/UpdateFacilityRequestStatusUseCase.js';
import { UpdateNotificationUseCase } from '../../application/usecases/notifications/UpdateNotificationUseCase.js';
import { SetApprovalModeUseCase } from '../../application/usecases/approvalSettings/SetApprovalModeUseCase.js';
import { SetMaxAdvanceDaysUseCase } from '../../application/usecases/settings/SetMaxAdvanceDaysUseCase.js';
import { SetRetentionDaysUseCase } from '../../application/usecases/settings/SetRetentionDaysUseCase.js';
import { SetSystemToggleUseCase } from '../../application/usecases/settings/SetSystemToggleUseCase.js';
import { ArchiveOldBookingsUseCase } from '../../application/usecases/settings/ArchiveOldBookingsUseCase.js';

import { CreateUserUseCase } from '../../application/usecases/users/CreateUserUseCase.js';
import { UpdateUserUseCase } from '../../application/usecases/users/UpdateUserUseCase.js';
import { ToggleUserStatusUseCase } from '../../application/usecases/users/ToggleUserStatusUseCase.js';
import { DeleteUserUseCase } from '../../application/usecases/users/DeleteUserUseCase.js';

/**
 * Composition root's dependency graph, built in one place (Dependency
 * Inversion in practice): every use-case is constructed here against the
 * concrete `Api*Repository` implementations (real backend, cache-backed —
 * see each repository's `refresh()`), but only ever consumed elsewhere
 * through the same method names the original `I*Repository` ports used.
 */
export function createContainer() {
  const authClient = createAuthClient({ apiClient });

  const repositories = {
    roomRepository: createRoomRepository({ apiClient }),
    bookingRepository: createBookingRepository({ apiClient }),
    templateRepository: createTemplateRepository({ apiClient }),
    notificationRepository: createNotificationRepository({ apiClient }),
    facilityRequestRepository: createFacilityRequestRepository({ apiClient }),
    userRepository: createUserRepository({ apiClient }),
    settingsRepository: createSettingsRepository({ apiClient }),
    dashboardRepository: createDashboardRepository({ apiClient }),
    analyticsRepository: createAnalyticsRepository({ apiClient }),
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
    createRoomUseCase: new CreateRoomUseCase(repositories),
    updateRoomUseCase: new UpdateRoomUseCase(repositories),
    toggleRoomStatusUseCase: new ToggleRoomStatusUseCase(repositories),
    deleteRoomUseCase: new DeleteRoomUseCase(repositories),

    updateFacilityRequestStatusUseCase: new UpdateFacilityRequestStatusUseCase(repositories),
    updateNotificationUseCase: new UpdateNotificationUseCase(repositories),
    setApprovalModeUseCase: new SetApprovalModeUseCase(repositories),
    setMaxAdvanceDaysUseCase: new SetMaxAdvanceDaysUseCase(repositories),
    setRetentionDaysUseCase: new SetRetentionDaysUseCase(repositories),
    setSystemToggleUseCase: new SetSystemToggleUseCase(repositories),
    archiveOldBookingsUseCase: new ArchiveOldBookingsUseCase(repositories),

    createUserUseCase: new CreateUserUseCase(repositories),
    updateUserUseCase: new UpdateUserUseCase(repositories),
    toggleUserStatusUseCase: new ToggleUserStatusUseCase(repositories),
    deleteUserUseCase: new DeleteUserUseCase(repositories),
  };

  return { apiClient, authClient, repositories, useCases };
}

// Module singleton — every component/hook imports this same instance, so
// repository caches (and the one ApiClient/token) stay shared app-wide
// without needing a React context for plain, non-reactive DI wiring.
export const container = createContainer();
