-- AlterTable
ALTER TABLE `facility_requests` MODIFY `status` ENUM('pending', 'accepted', 'done', 'not_done') NOT NULL DEFAULT 'pending';
