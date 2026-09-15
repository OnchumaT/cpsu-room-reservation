-- Students never had direct accounts going forward — a teacher books a
-- room on a student's behalf via bookings.booking_for_students instead.
-- Dev-only database, no real student accounts to preserve, so the old
-- 'student' rows are simply dropped before the enum values below.
DELETE FROM `bookings` WHERE `user_id` IN (SELECT `id` FROM `users` WHERE `role` = 'student');
DELETE FROM `users` WHERE `role` = 'student';

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('teacher', 'staff', 'admin', 'pending') NOT NULL;

-- AlterTable
ALTER TABLE `bookings` MODIFY `role` ENUM('teacher', 'staff', 'admin', 'pending') NOT NULL;

-- AlterTable
ALTER TABLE `notifications` MODIFY `audience` ENUM('teacher', 'staff', 'admin', 'approvers', 'faculty_approvers') NULL;
