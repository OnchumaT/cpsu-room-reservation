import { UserRepository } from './infrastructure/repositories/UserRepository.js';
import { ManagementPositionRepository } from './infrastructure/repositories/ManagementPositionRepository.js';
import { RoomRepository } from './infrastructure/repositories/RoomRepository.js';
import { BuildingRepository } from './infrastructure/repositories/BuildingRepository.js';
import { EquipmentRepository } from './infrastructure/repositories/EquipmentRepository.js';
import { BookingSettingRepository } from './infrastructure/repositories/BookingSettingRepository.js';
import { BookingRepository } from './infrastructure/repositories/BookingRepository.js';
import { FacilityRequestRepository } from './infrastructure/repositories/FacilityRequestRepository.js';
import { NotificationRepository } from './infrastructure/repositories/NotificationRepository.js';
import { TemplateRepository } from './infrastructure/repositories/TemplateRepository.js';
import { AuditLogRepository } from './infrastructure/repositories/AuditLogRepository.js';
import { HolidayRepository } from './infrastructure/repositories/HolidayRepository.js';
import { TimetableRepository } from './infrastructure/repositories/TimetableRepository.js';
import { ClashAttemptRepository } from './infrastructure/repositories/ClashAttemptRepository.js';

import { AuthService } from './services/AuthService.js';
import { EmailService } from './services/EmailService.js';

import { CreateBookingUseCase } from './application/usecases/bookings/CreateBookingUseCase.js';
import { EditBookingUseCase } from './application/usecases/bookings/EditBookingUseCase.js';
import { ArchiveOldBookingsUseCase } from './application/usecases/bookings/ArchiveOldBookingsUseCase.js';
import { ApproveRejectBookingUseCase } from './application/usecases/bookings/ApproveRejectBookingUseCase.js';
import { RecordFacultyResultUseCase } from './application/usecases/bookings/RecordFacultyResultUseCase.js';
import { ImportTimetableUseCase } from './application/usecases/timetable/ImportTimetableUseCase.js';
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
import { DeleteUserUseCase } from './application/usecases/users/DeleteUserUseCase.js';

import { SetApprovalModeUseCase } from './application/usecases/settings/SetApprovalModeUseCase.js';
import { SetMaxAdvanceDaysUseCase } from './application/usecases/settings/SetMaxAdvanceDaysUseCase.js';
import { SetRetentionDaysUseCase } from './application/usecases/settings/SetRetentionDaysUseCase.js';
import { SetSystemToggleUseCase } from './application/usecases/settings/SetSystemToggleUseCase.js';
import { AssignManagementPositionUseCase } from './application/usecases/managementPositions/AssignManagementPositionUseCase.js';

import { GetDashboardStatsUseCase } from './application/usecases/dashboard/GetDashboardStatsUseCase.js';
import { GetAnalyticsUseCase } from './application/usecases/analytics/GetAnalyticsUseCase.js';

import { CreateHolidayUseCase } from './application/usecases/holidays/CreateHolidayUseCase.js';
import { DeleteHolidayUseCase } from './application/usecases/holidays/DeleteHolidayUseCase.js';

import { CreateBuildingUseCase } from './application/usecases/buildings/CreateBuildingUseCase.js';
import { DeleteBuildingUseCase } from './application/usecases/buildings/DeleteBuildingUseCase.js';
import { UpdateEquipmentUseCase } from './application/usecases/equipment/UpdateEquipmentUseCase.js';

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
    holidayRepository: new HolidayRepository(),
    buildingRepository: new BuildingRepository(),
    equipmentRepository: new EquipmentRepository(),
    timetableRepository: new TimetableRepository(),
    clashAttemptRepository: new ClashAttemptRepository(),
  };

  const authService = new AuthService(repositories);
  const emailService = new EmailService();
  const services = { authService, emailService };

  const useCases = {
    createBookingUseCase: new CreateBookingUseCase(repositories),
    editBookingUseCase: new EditBookingUseCase(repositories),
    archiveOldBookingsUseCase: new ArchiveOldBookingsUseCase(repositories),
    archiveOldBookingsUseCase: new ArchiveOldBookingsUseCase(repositories),
    approveRejectBookingUseCase: new ApproveRejectBookingUseCase({ ...repositories, emailService }),
    recordFacultyResultUseCase: new RecordFacultyResultUseCase(repositories),
    importTimetableUseCase: new ImportTimetableUseCase(repositories),
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
    deleteUserUseCase: new DeleteUserUseCase(repositories),

    setApprovalModeUseCase: new SetApprovalModeUseCase(repositories),
    setMaxAdvanceDaysUseCase: new SetMaxAdvanceDaysUseCase(repositories),
    setRetentionDaysUseCase: new SetRetentionDaysUseCase(repositories),
    setSystemToggleUseCase: new SetSystemToggleUseCase(repositories),
    assignManagementPositionUseCase: new AssignManagementPositionUseCase(repositories),

    getDashboardStatsUseCase: new GetDashboardStatsUseCase(repositories),
    getAnalyticsUseCase: new GetAnalyticsUseCase(repositories),

    createHolidayUseCase: new CreateHolidayUseCase(repositories),
    deleteHolidayUseCase: new DeleteHolidayUseCase(repositories),

    createBuildingUseCase: new CreateBuildingUseCase(repositories),
    deleteBuildingUseCase: new DeleteBuildingUseCase(repositories),
    updateEquipmentUseCase: new UpdateEquipmentUseCase(repositories),
  };

  return { repositories, services, useCases };
}
