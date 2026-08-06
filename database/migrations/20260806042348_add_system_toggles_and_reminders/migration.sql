-- AlterTable
ALTER TABLE `booking_settings` ADD COLUMN `email_notifications_enabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `prevent_overlap_booking` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `reminder_before_booking_enabled` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `reminder_sent_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `user_id` INTEGER NULL,
    MODIFY `audience` ENUM('student', 'teacher', 'staff', 'admin', 'approvers') NULL;

-- CreateIndex
CREATE INDEX `notifications_user_id_unread_idx` ON `notifications`(`user_id`, `unread`);

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
