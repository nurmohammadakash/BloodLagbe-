-- Blood-Lagbe landing page + blood bank registration migration
-- Run this once on an existing database.

ALTER TABLE user
    ADD COLUMN latitude DECIMAL(10,8) DEFAULT NULL AFTER address,
    ADD COLUMN longitude DECIMAL(11,8) DEFAULT NULL AFTER latitude;

ALTER TABLE blood_bank
    ADD COLUMN division VARCHAR(50) NOT NULL DEFAULT '' AFTER phone,
    ADD COLUMN district VARCHAR(100) NOT NULL DEFAULT '' AFTER division,
    ADD COLUMN upazila VARCHAR(100) NOT NULL DEFAULT '' AFTER district,
    ADD COLUMN postal_code VARCHAR(10) NOT NULL DEFAULT '' AFTER upazila,
    ADD COLUMN username VARCHAR(50) NOT NULL UNIQUE AFTER address,
    ADD COLUMN password VARCHAR(255) NOT NULL AFTER username,
    ADD COLUMN latitude DECIMAL(10,8) DEFAULT NULL AFTER password,
    ADD COLUMN longitude DECIMAL(11,8) DEFAULT NULL AFTER latitude,
    ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER longitude,
    ADD COLUMN email_otp VARCHAR(6) DEFAULT NULL AFTER email_verified,
    ADD COLUMN otp_expiry DATETIME DEFAULT NULL AFTER email_otp;

CREATE TABLE IF NOT EXISTS site_rating (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    rating_value TINYINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_site_rating_value CHECK (rating_value BETWEEN 1 AND 5),
    CONSTRAINT fk_site_rating_user FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE SET NULL ON UPDATE CASCADE
);
