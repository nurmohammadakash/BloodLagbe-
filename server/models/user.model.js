const db = require("../config/db");

const getUserProfile = async (userId) => {

    const [rows] = await db.execute(
        `SELECT
            user_id,
            username,
            email,
            phone,
            blood_group,
            role,
            address,
            profile_picture,
            trust_score,
            eligibility_status,
            next_eligible_date,
            email_verified,
            account_status,
            last_login,
            created_at
        FROM user
        WHERE user_id = ?`,
        [userId]
    );

    return rows[0];
};

module.exports = {
    getUserProfile
};