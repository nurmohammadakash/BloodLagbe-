-- Blood-Lagbe registration fix
-- Run this ONLY if the existing `user` table was created from an older schema
-- and does not already contain these columns.

ALTER TABLE `user`
    ADD COLUMN `full_name` VARCHAR(100) NOT NULL AFTER `user_id`,
    ADD COLUMN `date_of_birth` DATE NOT NULL AFTER `full_name`,
    ADD COLUMN `gender` ENUM('Male','Female','Other') NOT NULL AFTER `date_of_birth`,
    ADD COLUMN `division` VARCHAR(50) NOT NULL AFTER `phone`,
    ADD COLUMN `district` VARCHAR(100) NOT NULL AFTER `division`,
    ADD COLUMN `upazila` VARCHAR(100) NOT NULL AFTER `district`,
    ADD COLUMN `postal_code` VARCHAR(10) NOT NULL AFTER `upazila`;

ALTER TABLE `user`
    MODIFY COLUMN `role` ENUM('Donor','Recipient','Both') DEFAULT 'Donor';
