-- CreateTable
CREATE TABLE `timetable_imports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `academic_year` VARCHAR(64) NOT NULL,
    `semester` VARCHAR(64) NOT NULL,
    `building` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `imported_by` INTEGER NOT NULL,
    `total_rows` INTEGER NOT NULL,
    `added_count` INTEGER NOT NULL,
    `updated_count` INTEGER NOT NULL,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `timetable_imports_imported_by_idx`(`imported_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `academic_year` VARCHAR(64) NOT NULL,
    `semester` VARCHAR(64) NOT NULL,
    `room_id` VARCHAR(64) NOT NULL,
    `day_of_week` TINYINT NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,
    `course_code` VARCHAR(64) NOT NULL,
    `section` VARCHAR(64) NOT NULL,
    `import_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `class_schedules_room_id_idx`(`room_id`),
    INDEX `class_schedules_import_id_idx`(`import_id`),
    UNIQUE INDEX `class_schedules_term_key`(`academic_year`, `semester`, `room_id`, `day_of_week`, `start_time`, `end_time`, `course_code`, `section`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `timetable_imports` ADD CONSTRAINT `timetable_imports_imported_by_fkey` FOREIGN KEY (`imported_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_schedules` ADD CONSTRAINT `class_schedules_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_schedules` ADD CONSTRAINT `class_schedules_import_id_fkey` FOREIGN KEY (`import_id`) REFERENCES `timetable_imports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
