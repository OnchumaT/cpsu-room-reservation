-- AlterTable
ALTER TABLE `notifications` MODIFY `kind` ENUM('booking', 'facility_request', 'user_registration') NOT NULL DEFAULT 'booking';
