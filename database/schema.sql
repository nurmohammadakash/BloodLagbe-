-- ==========================================
-- Blood Lagbe Database Schema
-- Table: admin
-- ==========================================

CREATE TABLE admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_level ENUM('Super Admin', 'Admin') DEFAULT 'Admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
-- ==========================================
-- Table: user
-- ==========================================

CREATE TABLE user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,

    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    phone VARCHAR(20) NOT NULL UNIQUE,

    division VARCHAR(50) NOT NULL,
    district VARCHAR(100) NOT NULL,
    upazila VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,

    blood_group ENUM(
        'A+','A-',
        'B+','B-',
        'AB+','AB-',
        'O+','O-'
    ) NOT NULL,

    role ENUM(
        'Donor',
        'Recipient',
        'Both'
    ) DEFAULT 'Donor',

    eligibility_status ENUM(
        'Eligible',
        'Not Eligible'
    ) DEFAULT 'Eligible',

    next_eligible_date DATE DEFAULT NULL,

    trust_score DECIMAL(5,2) DEFAULT 100.00,

    profile_picture VARCHAR(255) DEFAULT NULL,

    -- Email Verification
    email_verified BOOLEAN DEFAULT FALSE,
    email_otp VARCHAR(6),
    otp_expiry DATETIME,

    -- Forgot Password
    reset_otp VARCHAR(6),
    reset_otp_expiry DATETIME,

    -- Account Status
    account_status ENUM(
        'Pending',
        'Active',
        'Suspended',
        'Blocked'
    ) DEFAULT 'Pending',

    -- Last Login
    last_login DATETIME,

    address TEXT,

    latitude DECIMAL(10,8) DEFAULT NULL,
    longitude DECIMAL(11,8) DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
-- ==========================================
-- Table: blood_bank
-- ==========================================

CREATE TABLE blood_bank (
    bloodbank_id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    license_number VARCHAR(100) NOT NULL UNIQUE,

    email VARCHAR(100) NOT NULL UNIQUE,

    phone VARCHAR(20) NOT NULL UNIQUE,

    division VARCHAR(50) NOT NULL,
    district VARCHAR(100) NOT NULL,
    upazila VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,

    address TEXT NOT NULL,

    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,8) DEFAULT NULL,
    longitude DECIMAL(11,8) DEFAULT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_otp VARCHAR(6),
    otp_expiry DATETIME,

    status ENUM(
        'Pending',
        'Approved',
        'Rejected',
        'Inactive'
    ) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
-- ==========================================
-- Table: blood_inventory
-- ==========================================

CREATE TABLE blood_inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,

    bloodbank_id INT NOT NULL,

    blood_group ENUM(
        'A+','A-',
        'B+','B-',
        'AB+','AB-',
        'O+','O-'
    ) NOT NULL,

    unit_count INT NOT NULL DEFAULT 0,

    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventory_bloodbank
        FOREIGN KEY (bloodbank_id)
        REFERENCES blood_bank(bloodbank_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT unique_bloodbank_group
        UNIQUE (bloodbank_id, blood_group)
);
-- ==========================================
-- Table: blood_request
-- ==========================================

CREATE TABLE blood_request (
    request_id INT AUTO_INCREMENT PRIMARY KEY,

    requester_id INT NOT NULL,

    bloodbank_id INT NULL,

    blood_group ENUM(
        'A+','A-',
        'B+','B-',
        'AB+','AB-',
        'O+','O-'
    ) NOT NULL,

    units_required INT NOT NULL DEFAULT 1,

    urgency_level ENUM(
        'Low',
        'Medium',
        'High',
        'Critical'
    ) NOT NULL DEFAULT 'Medium',

    patient_name VARCHAR(100) NOT NULL,

    patient_age INT,

    hospital_name VARCHAR(150) NOT NULL,

    hospital_address TEXT NOT NULL,

    contact_person VARCHAR(100) NOT NULL,

    contact_number VARCHAR(20) NOT NULL,

    required_date DATE NOT NULL,

    note TEXT,

    status ENUM(
        'Pending',
        'Accepted',
        'Completed',
        'Cancelled',
        'Expired'
    ) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_request_user
        FOREIGN KEY (requester_id)
        REFERENCES user(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_request_bloodbank
        FOREIGN KEY (bloodbank_id)
        REFERENCES blood_bank(bloodbank_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);
-- ==========================================
-- Table: donation
-- ==========================================

CREATE TABLE donation (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,

    donor_id INT NOT NULL,

    receiver_id INT NOT NULL,

    bloodbank_id INT NOT NULL,

    request_id INT DEFAULT NULL,

    nid_number VARCHAR(20) NOT NULL,

    nid_verified BOOLEAN DEFAULT FALSE,

    verified_latitude DECIMAL(10,8) DEFAULT NULL,

    verified_longitude DECIMAL(11,8) DEFAULT NULL,

    donation_date DATE NOT NULL,

    donation_time TIME NOT NULL,

    status ENUM(
        'Pending',
        'Verified',
        'Completed',
        'Cancelled'
    ) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_donation_donor
        FOREIGN KEY (donor_id)
        REFERENCES user(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_donation_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES user(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_donation_bloodbank
        FOREIGN KEY (bloodbank_id)
        REFERENCES blood_bank(bloodbank_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

 CONSTRAINT fk_donation_request
    FOREIGN KEY (request_id)
    REFERENCES blood_request(request_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

CONSTRAINT unique_request
    UNIQUE (request_id)
);
-- ==========================================
-- Table: rating
-- ==========================================

CREATE TABLE rating (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,

    donation_id INT NOT NULL,

    rater_id INT NOT NULL,

    rated_id INT NOT NULL,

    rating_value TINYINT NOT NULL,

    review TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_rating_value
        CHECK (rating_value BETWEEN 1 AND 5),

    CONSTRAINT fk_rating_donation
        FOREIGN KEY (donation_id)
        REFERENCES donation(donation_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_rating_rater
        FOREIGN KEY (rater_id)
        REFERENCES user(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
CONSTRAINT fk_rating_rated
    FOREIGN KEY (rated_id)
    REFERENCES user(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

CONSTRAINT unique_rating
    UNIQUE (donation_id, rater_id)
);

-- ==========================================
-- Table: site_rating
-- ==========================================

CREATE TABLE site_rating (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    rating_value TINYINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_site_rating_value
        CHECK (rating_value BETWEEN 1 AND 5),

    CONSTRAINT fk_site_rating_user
        FOREIGN KEY (user_id)
        REFERENCES user(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- ==========================================
-- Table: post
-- ==========================================

CREATE TABLE post (
    post_id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    content TEXT,

    content_type ENUM(
        'Text',
        'Image',
        'Video',
        'Mixed'
    ) DEFAULT 'Text',

    media_url VARCHAR(255) DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_post_user
        FOREIGN KEY (user_id)
        REFERENCES user(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
-- ==========================================
-- Table: comment
-- ==========================================

CREATE TABLE comment (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,

    post_id INT NOT NULL,

    user_id INT NOT NULL,

    content TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_comment_post
        FOREIGN KEY (post_id)
        REFERENCES post(post_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_comment_user
        FOREIGN KEY (user_id)
        REFERENCES user(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
-- ==========================================
-- Table: reaction
-- ==========================================

CREATE TABLE reaction (
    reaction_id INT AUTO_INCREMENT PRIMARY KEY,

    post_id INT NOT NULL,

    user_id INT NOT NULL,

    reaction_type ENUM(
        'Like',
        'Love',
        'Care',
        'Wow'
    ) NOT NULL DEFAULT 'Like',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_reaction_post
        FOREIGN KEY (post_id)
        REFERENCES post(post_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_reaction_user
        FOREIGN KEY (user_id)
        REFERENCES user(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT unique_post_reaction
        UNIQUE (post_id, user_id)
);
-- ==========================================
-- Table: notification
-- ==========================================

CREATE TABLE notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    type ENUM(
        'Blood Request',
        'Donation',
        'Camp',
        'Post',
        'System'
    ) NOT NULL,

    message TEXT NOT NULL,

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES user(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
-- ==========================================
-- Table: camp
-- ==========================================

CREATE TABLE camp (
    camp_id INT AUTO_INCREMENT PRIMARY KEY,

    bloodbank_id INT NOT NULL,

    title VARCHAR(150) NOT NULL,

    description TEXT,

    date DATE NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    location VARCHAR(255) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_camp_bloodbank
        FOREIGN KEY (bloodbank_id)
        REFERENCES blood_bank(bloodbank_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
-- ==========================================
-- Table: camp_rsvp
-- ==========================================

CREATE TABLE camp_rsvp (
    rsvp_id INT AUTO_INCREMENT PRIMARY KEY,

    camp_id INT NOT NULL,

    user_id INT NOT NULL,

    status ENUM(
        'Going',
        'Interested',
        'Cancelled'
    ) DEFAULT 'Interested',

    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rsvp_camp
        FOREIGN KEY (camp_id)
        REFERENCES camp(camp_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_rsvp_user
        FOREIGN KEY (user_id)
        REFERENCES user(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT unique_camp_user
        UNIQUE (camp_id, user_id)
);