-- DropForeignKey
ALTER TABLE `booking_clash_attempts` DROP FOREIGN KEY `booking_clash_attempts_room_id_fkey`;

-- AlterTable
ALTER TABLE `booking_clash_attempts` MODIFY `room_id` VARCHAR(64) NULL;

-- AddForeignKey
ALTER TABLE `booking_clash_attempts` ADD CONSTRAINT `booking_clash_attempts_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
