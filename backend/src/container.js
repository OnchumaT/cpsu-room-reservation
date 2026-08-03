import { UserRepository } from './infrastructure/repositories/UserRepository.js';
import { ManagementPositionRepository } from './infrastructure/repositories/ManagementPositionRepository.js';
import { RoomRepository } from './infrastructure/repositories/RoomRepository.js';
import { BookingSettingRepository } from './infrastructure/repositories/BookingSettingRepository.js';
import { BookingRepository } from './infrastructure/repositories/BookingRepository.js';
import { FacilityRequestRepository } from './infrastructure/repositories/FacilityRequestRepository.js';
import { NotificationRepository } from './infrastructure/repositories/NotificationRepository.js';
import { TemplateRepository } from './infrastructure/repositories/TemplateRepository.js';
import { AuditLogRepository } from './infrastructure/repositories/AuditLogRepository.js';

import { AuthService } from './services/AuthService.js';
import { EmailService } from './services/EmailService.js';

import { CreateBookingUseCase } from './application/usecases/bookings/CreateBookingUseCase.js';
import { EditBookingUseCase } from './application/usecases/bookings/EditBookingUseCase.js';
import { ApproveRejectBookingUseCase } from './application/usecases/bookings/ApproveRejectBookingUseCase.js';
import { CancelBookingUseCase } from './application/usecases/bookings/CancelBookingUseCase.js';
import { CheckRoomAvailabilityUseCase } from './application/usecases/bookings/CheckRoomAvailabilityUseCase.js';

import { UpdateFacilityRequestStatusUseCase } from './application/usecases/facilityRequests/UpdateFacilityRequestStatusUseCase.js';
import { UpdateNotificationUseCase } from './application/usecases/notifications/UpdateNotificationUseCase.js';

import { GetAvailableRoomsUseCase } from './application/usecases/rooms/GetAvailableRoomsUseCase.js';
import { CreateRoomUseCase } from './application/usecases/rooms/CreateRoomUseCase.js';
import { UpdateRoomUseCase } from './application/usecases/rooms/UpdateRoomUseCase.js';
import { ToggleRoomStatusUseCase } from './application/usecases/rooms/ToggleRoomStatusUseCase.js';
import { DeleteRoomUseCase } from './application/usecases/rooms/DeleteRoomUseCase.js';

import { SaveTemplateUseCase } from './application/usecases/templates/SaveTemplateUseCase.js';
import { ApplyTemplateUseCase } from './application/usecases/templates/ApplyTemplateUseCase.js';
import { UpdateTemplateUseCase } from './application/usecases/templates/UpdateTemplateUseCase.js';
import { DuplicateTemplateUseCase } from './application/usecases/templates/DuplicateTemplateUseCase.js';
import { DeleteTemplateUseCase } from './application/usecases/templates/DeleteTemplateUseCase.js';

import { CreateUserUseCase } from './application/usecases/users/CreateUserUseCase.js';
import { UpdateUserUseCase } from './application/usecases/users/UpdateUserUseCase.js';
import { ToggleUserStatusUseCase } from './application/usecases/users/ToggleUserStatusUseCase.js';

import { SetApprovalModeUseCase } from './application/usecases/settings/SetApprovalModeUseCase.js';
import { AssignManagementPositionUseCase } from './application/usecases/managementPositions/AssignManagementPositionUseCase.js';

import { GetDashboardStatsUseCase } from './application/usecases/dashboard/GetDashboardStatsUseCase.js';

/**
 * Composition root: every use-case is built here against the concrete
 * repositories, but the use-cases only ever depend on the repository
 * shape (constructor destructuring), never on Prisma directly.
 */
export function createContainer() {
  const repositories = {
    userRepository: new UserRepository(),
    managementPositionRepository: new ManagementPositionRepository(),
    roomRepository: new RoomRepository(),
    bookingSettingRepository: new BookingSettingRepository(),
    bookingRepository: new BookingRepository(),
    facilityRequestRepository: new FacilityRequestRepository(),
    notificationRepository: new NotificationRepository(),
    templateRepository: new TemplateRepository(),
    auditLogRepository: new AuditLogRepository(),
  };

  const authService = new AuthService(repositories);
  const emailService = new EmailService();
  const services = { authService, emailService };

  const useCases = {
    createBookingUseCase: new CreateBookingUseCase(repositories),
    editBookingUseCase: new EditBookingUseCase(repositories),
    approveRejectBookingUseCase: new ApproveRejectBookingUseCase({ ...repositories, emailService }),
    cancelBookingUseCase: new CancelBookingUseCase(repositories),
    checkRoomAvailabilityUseCase: new CheckRoomAvailabilityUseCase(repositories),

    updateFacilityRequestStatusUseCase: new UpdateFacilityRequestStatusUseCase(repositories),
    updateNotificationUseCase: new UpdateNotificationUseCase(repositories),

    getAvailableRoomsUseCase: new GetAvailableRoomsUseCase(repositories),
    createRoomUseCase: new CreateRoomUseCase(repositories),
    updateRoomUseCase: new UpdateRoomUseCase(repositories),
    toggleRoomStatusUseCase: new ToggleRoomStatusUseCase(repositories),
    deleteRoomUseCase: new DeleteRoomUseCase(repositories),

    saveTemplateUseCase: new SaveTemplateUseCase(repositories),
    applyTemplateUseCase: new ApplyTemplateUseCase(repositories),
    updateTemplateUseCase: new UpdateTemplateUseCase(repositories),
    duplicateTemplateUseCase: new DuplicateTemplateUseCase(repositories),
    deleteTemplateUseCase: new DeleteTemplateUseCase(repositories),

    createUserUseCase: new CreateUserUseCase({ ...repositories, authService }),
    updateUserUseCase: new UpdateUserUseCase(repositories),
    toggleUserStatusUseCase: new ToggleUserStatusUseCase(repositories),

    setApprovalModeUseCase: new SetApprovalModeUseCase(repositories),
    assignManagementPositionUseCase: new AssignManagementPositionUseCase(repositories),

    getDashboardStatsUseCase: new GetDashboardStatsUseCase(repositories),
  };

  return { repositories, services, useCases };
}
