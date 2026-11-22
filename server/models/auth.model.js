const db = require("../config/db");

// =====================================================
// FIND USER BY USERNAME
// =====================================================

const findByUsername = async (username) => {

    const [rows] = await db.execute(
        `SELECT username FROM user WHERE username = ?
         UNION ALL SELECT username FROM blood_bank WHERE username = ?
         LIMIT 1`,
        [username, username]
    );

    return rows[0];

};


// =====================================================
// FIND USER BY EMAIL
// =====================================================

const findByEmail = async (email) => {

    const [rows] = await db.execute(
        `SELECT email FROM user WHERE email = ?
         UNION ALL SELECT email FROM blood_bank WHERE email = ?
         LIMIT 1`,
        [email, email]
    );

    return rows[0];

};


// =====================================================
// FIND USER BY PHONE
// =====================================================

const findByPhone = async (phone) => {

    const [rows] = await db.execute(
        "SELECT * FROM user WHERE phone = ?",
        [phone]
    );

    return rows[0];

};


// =====================================================
// CREATE PENDING USER
// =====================================================

const createPendingUser = async (user) => {

    const sql = `
        INSERT INTO user
        (
            full_name,
            date_of_birth,
            gender,

            username,
            email,
            password,
            phone,

            division,
            district,
            upazila,
            postal_code,

            blood_group,
            role,

            eligibility_status,
            next_eligible_date,
            trust_score,

            email_verified,
            email_otp,
            otp_expiry,

            account_status,
            address,
            latitude,
            longitude
        )
        VALUES
        (
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            'Eligible',
            NULL,
            100.00,
            FALSE,
            ?,
            ?,
            'Pending',
            ?,
            ?,
            ?
        )
    `;

    const values = [

        // Personal information
        user.full_name,
        user.date_of_birth,
        user.gender,

        // Login information
        user.username,
        user.email,
        user.password,
        user.phone,

        // Address information
        user.division,
        user.district,
        user.upazila,
        user.postal_code,

        // Blood information
        user.blood_group,
        user.role,

        // OTP
        user.email_otp,
        user.otp_expiry,

        // Full address
        user.address,

        // Google Maps coordinates
        user.latitude || null,
        user.longitude || null
    ];

    const [result] = await db.execute(
        sql,
        values
    );

    return result;

};


// =====================================================
// FIND USER BY EMAIL + OTP
// =====================================================

const findByEmailOtp = async (email, otp) => {

    const [rows] = await db.execute(
        `
        SELECT *
        FROM user
        WHERE email = ?
        AND email_otp = ?
        AND otp_expiry > NOW()
        `,
        [
            email,
            otp
        ]
    );

    return rows[0];

};


// =====================================================
// VERIFY EMAIL
// =====================================================

const verifyEmail = async (userId) => {

    await db.execute(
        `
        UPDATE user
        SET
            email_verified = TRUE,
            account_status = 'Active',
            email_otp = NULL,
            otp_expiry = NULL
        WHERE user_id = ?
        `,
        [userId]
    );

};


// =====================================================
// FIND USER BY USERNAME OR EMAIL
// =====================================================

const findByLogin = async (login) => {
    const [rows] = await db.execute(
        `
        SELECT
            user_id AS account_id,
            user_id,
            full_name,
            username,
            email,
            password,
            role,
            blood_group,
            email_verified,
            account_status AS status,
            'user' AS account_type
        FROM user
        WHERE username = ? OR email = ?
        UNION ALL
        SELECT
            bloodbank_id AS account_id,
            bloodbank_id AS user_id,
            name AS full_name,
            username,
            email,
            password,
            NULL AS role,
            NULL AS blood_group,
            email_verified,
            status,
            'bloodbank' AS account_type
        FROM blood_bank
        WHERE username = ? OR email = ?
        LIMIT 1
        `,
        [login, login, login, login]
    );
    return rows[0] || null;
};

// =====================================================
// UPDATE LAST LOGIN
// =====================================================

const updateLastLogin = async (account) => {
    if (account.account_type === "bloodbank") {
        await db.execute(`UPDATE blood_bank SET updated_at = NOW() WHERE bloodbank_id = ?`, [account.account_id]);
        return;
    }
    await db.execute(`UPDATE user SET last_login = NOW() WHERE user_id = ?`, [account.account_id]);
};

const findByEmailForPasswordReset = async (email) => {
    const [rows] = await db.execute(
        `
        SELECT *
        FROM user
        WHERE email = ?
        LIMIT 1
        `,
        [email]
    );

    return rows[0] || null;
};


const saveResetOTP = async (userId, otp, expiry) => {
    await db.execute(
        `
        UPDATE user
        SET reset_otp = ?,
            reset_otp_expiry = ?
        WHERE user_id = ?
        `,
        [otp, expiry, userId]
    );
};


const findByResetOTP = async (email, otp) => {
    const [rows] = await db.execute(
        `
        SELECT *
        FROM user
        WHERE email = ?
          AND reset_otp = ?
          AND reset_otp_expiry > NOW()
        LIMIT 1
        `,
        [email, otp]
    );

    return rows[0] || null;
};


const updatePassword = async (userId, hashedPassword) => {
    await db.execute(
        `
        UPDATE user
        SET password = ?,
            reset_otp = NULL,
            reset_otp_expiry = NULL
        WHERE user_id = ?
        `,
        [hashedPassword, userId]
    );
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
    findByUsername,
    findByEmail,
    findByPhone,
    createPendingUser,
    findByEmailOtp,
    verifyEmail,
    findByLogin,
    updateLastLogin,

    findByEmailForPasswordReset,
    saveResetOTP,
    findByResetOTP,
    updatePassword
};