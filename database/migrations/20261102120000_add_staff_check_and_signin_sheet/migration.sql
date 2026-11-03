-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `catering_assignee` VARCHAR(191) NULL,
    ADD COLUMN `opener_assignee` VARCHAR(191) NULL,
    ADD COLUMN `checked_by_name` VARCHAR(191) NULL,
    ADD COLUMN `checked_at` DATETIME(3) NULL,
    ADD COLUMN `signin_sheet_received_at` DATETIME(3) NULL,
    ADD COLUMN `signin_sheet_received_by_name` VARCHAR(191) NULL,
    ADD COLUMN `signin_sheet_reminded_at` DATETIME(3) NULL;
