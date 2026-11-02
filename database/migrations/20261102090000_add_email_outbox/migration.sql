-- AlterTable
ALTER TABLE `users` ADD COLUMN `email_notifications` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `email_outbox` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipients` JSON NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `body_text` TEXT NOT NULL,
    `body_html` MEDIUMTEXT NULL,
    `status` ENUM('pending', 'sent', 'failed', 'expired') NOT NULL DEFAULT 'pending',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `notification_id` INTEGER NULL,
    `booking_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sent_at` DATETIME(3) NULL,

    INDEX `email_outbox_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
