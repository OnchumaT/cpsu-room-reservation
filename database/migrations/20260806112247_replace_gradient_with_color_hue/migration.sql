-- AlterTable
ALTER TABLE `rooms` DROP COLUMN `gradient`,
    ADD COLUMN `color_hue` INTEGER NULL;
