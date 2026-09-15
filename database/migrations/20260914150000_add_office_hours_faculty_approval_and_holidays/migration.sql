-- CreateTable
CREATE TABLE `holidays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `holidays_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `management_positions` ADD COLUMN `level` ENUM('department', 'faculty') NOT NULL DEFAULT 'department';

-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `requires_faculty_approval` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `faculty_approved_by` INTEGER NULL,
    ADD COLUMN `faculty_approved_at` DATETIME(3) NULL,
    ADD COLUMN `room_responsible_type` ENUM('self', 'other') NOT NULL DEFAULT 'self',
    ADD COLUMN `room_responsible_name` VARCHAR(191) NULL,
    ADD COLUMN `room_responsible_phone` VARCHAR(30) NULL,
    MODIFY `status` ENUM('pending', 'pending_faculty', 'approved', 'rejected', 'cancelled', 'expired') NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `notifications` MODIFY `audience` ENUM('student', 'teacher', 'staff', 'admin', 'approvers', 'faculty_approvers') NULL;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_faculty_approved_by_fkey` FOREIGN KEY (`faculty_approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
