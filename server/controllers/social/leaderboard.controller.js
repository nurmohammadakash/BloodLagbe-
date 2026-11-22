const db = require("../../config/db");
const { toInt } = require("../../utils/social.helpers");

const leaderboard = async (req, res) => {
    try {
        const thisYear = new Date().getFullYear();
        const year = toInt(req.query.year, thisYear, 2000, thisYear + 1);
        // Counts both donation flows: confirmed exchanges and completed blood connections
        const [donors] = await db.execute(
            `SELECT u.user_id, u.full_name, u.username, u.profile_picture, u.blood_group,
                    COUNT(*) AS donations
             FROM (
                 SELECT e.donor_id, e.donated_on AS donated_on
                 FROM blood_exchange e WHERE e.status = 'Confirmed'
                 UNION ALL
                 SELECT IF(c.applicant_role = 'Donor', c.applicant_id, c.note_owner_id), DATE(c.completed_at)
                 FROM blood_connection c WHERE c.status = 'Successful' AND c.completed_at IS NOT NULL
             ) d
             JOIN user u ON u.user_id = d.donor_id
             WHERE YEAR(d.donated_on) = ? AND u.account_status = 'Active'
             GROUP BY u.user_id, u.full_name, u.username, u.profile_picture, u.blood_group
             ORDER BY donations DESC, MAX(d.donated_on) DESC, u.full_name
             LIMIT 20`,
            [year]
        );

        // Best rated donors: reviews from both flows, counted only for the person who donated
        const [rated] = await db.execute(
            `SELECT u.user_id, u.full_name, u.username, u.profile_picture, u.blood_group,
                    ROUND(AVG(x.stars), 2) AS average, COUNT(*) AS reviews,
                    ROUND((SUM(x.stars) + 10.5) / (COUNT(*) + 3), 3) AS score
             FROM (
                 SELECT r.rated_id, r.stars, r.created_at
                 FROM user_review r
                 JOIN blood_exchange e ON e.exchange_id = r.exchange_id AND r.rated_id = e.donor_id
                 UNION ALL
                 SELECT r.rated_id, r.stars, r.created_at
                 FROM connection_review r
                 JOIN blood_connection c ON c.connection_id = r.connection_id
                      AND ((c.applicant_role = 'Donor' AND r.rated_id = c.applicant_id)
                        OR (c.applicant_role = 'Receiver' AND r.rated_id = c.note_owner_id))
             ) x
             JOIN user u ON u.user_id = x.rated_id
             WHERE YEAR(x.created_at) = ? AND u.account_status = 'Active'
             GROUP BY u.user_id, u.full_name, u.username, u.profile_picture, u.blood_group
             ORDER BY score DESC, reviews DESC, u.full_name
             LIMIT 20`,
            [year]
        );

        res.json({
            success: true,
            year,
            top_donors: donors.map((d, i) => ({ rank: i + 1, ...d, donations: Number(d.donations) })),
            top_rated: rated.map((d, i) => ({
                rank: i + 1, ...d,
                average: Number(d.average), reviews: Number(d.reviews), score: Number(d.score)
            }))
        });
    } catch (error) {
        console.error("leaderboard error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { leaderboard };