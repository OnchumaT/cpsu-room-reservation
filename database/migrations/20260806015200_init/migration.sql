-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('student', 'teacher', 'staff', 'admin', 'pending') NOT NULL;

-- AlterTable
ALTER TABLE `booking_settings` ADD COLUMN `max_advance_days` INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN `retention_days` INTEGER NOT NULL DEFAULT 365;

-- AlterTable
ALTER TABLE `bookings` MODIFY `role` ENUM('student', 'teacher', 'staff', 'admin', 'pending') NOT NULL,
    ADD COLUMN `is_archived` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `archived_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `templates` ADD COLUMN `participating_teachers` JSON NULL;
