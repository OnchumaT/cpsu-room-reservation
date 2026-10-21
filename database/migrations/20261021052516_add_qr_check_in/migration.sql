-- AlterTable
ALTER TABLE `booking_settings` ADD COLUMN `check_in_grace_minutes` INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN `check_in_required` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `checked_in_at` DATETIME(3) NULL,
    MODIFY `status` ENUM('pending', 'pending_faculty', 'approved', 'rejected', 'cancelled', 'expired', 'no_show') NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `rooms` ADD COLUMN `check_in_token` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `rooms_check_in_token_key` ON `rooms`(`check_in_token`);

