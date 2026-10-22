-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `group_id` VARCHAR(36) NULL;

-- CreateIndex
CREATE INDEX `bookings_group_id_idx` ON `bookings`(`group_id`);
