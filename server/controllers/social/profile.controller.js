const db = require("../../config/db");
const { publicPath, removeUpload } = require("../../middleware/upload.middleware");
const { getRelation } = require("../../utils/social.helpers");

const me = async (req, res) => {
    try {
        const actor = req.actor;

        if (actor.type === "bloodbank") {
            const [rows] = await db.execute(
                `SELECT bloodbank_id, name, username, email, phone, address, district, upazila, license_number
                 FROM blood_bank WHERE bloodbank_id = ?`, [actor.id]
            );
            if (!rows.length) return res.status(404).json({ success: false, message: "Account not found." });
            const [[unread]] = await db.execute(
                "SELECT COUNT(*) AS c FROM app_notification WHERE recipient_type = 'bloodbank' AND recipient_id = ? AND is_read = 0",
                [actor.id]
            );
            return res.json({ success: true, account_type: "bloodbank", account: rows[0], unread_notifications: Number(unread.c) });
        }

        const [rows] = await db.execute(
            `SELECT user_id, full_name, username, blood_group, role, bio, profile_picture, cover_picture, district, upazila
             FROM user WHERE user_id = ?`, [actor.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: "Account not found." });

        const [[friends]] = await db.execute(
            "SELECT COUNT(*) AS c FROM friendship WHERE status = 'Accepted' AND (requester_id = ? OR addressee_id = ?)",
            [actor.id, actor.id]
        );
        const [[requests]] = await db.execute(
            "SELECT COUNT(*) AS c FROM friendship WHERE addressee_id = ? AND status = 'Pending'", [actor.id]
        );
        const [[unread]] = await db.execute(
            "SELECT COUNT(*) AS c FROM app_notification WHERE recipient_type = 'user' AND recipient_id = ? AND is_read = 0",
            [actor.id]
        );
        const [[pending]] = await db.execute(
            "SELECT COUNT(*) AS c FROM blood_exchange WHERE status = 'Pending' AND initiated_by <> ? AND (donor_id = ? OR recipient_id = ?)",
            [actor.id, actor.id, actor.id]
        );

        res.json({
            success: true,
            account_type: "user",
            account: rows[0],
            friend_count: Number(friends.c),
            pending_friend_requests: Number(requests.c),
            unread_notifications: Number(unread.c),
            pending_donation_confirmations: Number(pending.c)
        });
    } catch (error) {
        console.error("me error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getProfile = async (req, res) => {
    try {
        const viewer = req.actor;

        const [users] = await db.execute(
            `SELECT user_id, full_name, username, blood_group, role, bio, profile_picture, cover_picture,
                    division, district, upazila, eligibility_status, created_at
             FROM user WHERE username = ? AND account_status = 'Active'`,
            [req.params.username]
        );
        if (!users.length) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        const user = users[0];
        const id = user.user_id;

        const [[friends]] = await db.execute(
            "SELECT COUNT(*) AS c FROM friendship WHERE status = 'Accepted' AND (requester_id = ? OR addressee_id = ?)",
            [id, id]
        );
        const [[rating]] = await db.execute(
            `SELECT AVG(stars) AS average, COUNT(*) AS total FROM (
                 SELECT stars FROM user_review WHERE rated_id = ?
                 UNION ALL
                 SELECT stars FROM connection_review WHERE rated_id = ?
             ) s`,
            [id, id]
        );
        const [[donations]] = await db.execute(
            `SELECT COUNT(*) AS total, SUM(YEAR(donated_on) = YEAR(CURDATE())) AS this_year
             FROM blood_exchange WHERE donor_id = ? AND status = 'Confirmed'`, [id]
        );
        const [notes] = await db.execute(
            "SELECT note_type, blood_group FROM user_note WHERE user_id = ? AND expires_at > NOW()", [id]
        );

        let relation = { status: "none", friendship_id: null };
        let rateable = null;
        const isSelf = viewer.type === "user" && viewer.id === id;

        if (isSelf) {
            relation = { status: "self", friendship_id: null };
        } else if (viewer.type === "bloodbank") {
            relation = { status: "bloodbank", friendship_id: null };
        } else {
            relation = await getRelation(viewer.id, id);
            const [eligible] = await db.execute(
                `SELECT e.exchange_id, e.donor_id, e.blood_group, e.donated_on
                 FROM blood_exchange e
                 WHERE e.status = 'Confirmed'
                   AND ((e.donor_id = ? AND e.recipient_id = ?) OR (e.donor_id = ? AND e.recipient_id = ?))
                   AND NOT EXISTS (SELECT 1 FROM user_review r WHERE r.exchange_id = e.exchange_id AND r.rater_id = ?)
                 ORDER BY e.donated_on DESC LIMIT 1`,
                [viewer.id, id, id, viewer.id, viewer.id]
            );
            rateable = eligible[0] || null;
        }

        res.json({
            success: true,
            profile: {
                ...user,
                friend_count: Number(friends.c),
                rating_average: rating.average ? Number(Number(rating.average).toFixed(2)) : null,
                rating_count: Number(rating.total),
                donations_total: Number(donations.total),
                donations_this_year: Number(donations.this_year || 0),
                note: notes[0] || null
            },
            relation: relation.status,
            friendship_id: relation.friendship_id,
            rateable_exchange: rateable
        });
    } catch (error) {
        console.error("getProfile error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const userFriends = async (req, res) => {
    try {
        const [users] = await db.execute("SELECT user_id FROM user WHERE username = ?", [req.params.username]);
        if (!users.length) return res.status(404).json({ success: false, message: "User not found." });

        const id = users[0].user_id;
        const [friends] = await db.execute(
            `SELECT u.user_id, u.full_name, u.username, u.profile_picture, u.blood_group
             FROM friendship f
             JOIN user u ON u.user_id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
             WHERE f.status = 'Accepted' AND (f.requester_id = ? OR f.addressee_id = ?)
             ORDER BY u.full_name LIMIT 60`,
            [id, id, id]
        );
        res.json({ success: true, friends });
    } catch (error) {
        console.error("userFriends error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const updateBio = async (req, res) => {
    try {
        const bio = String((req.body || {}).bio ?? "").trim().slice(0, 300);
        await db.execute("UPDATE user SET bio = ? WHERE user_id = ?", [bio || null, req.actor.id]);
        res.json({ success: true, bio });
    } catch (error) {
        console.error("updateBio error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const savePicture = (column, folder) => async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please choose an image." });
        }
        const [old] = await db.execute(`SELECT ${column} AS current FROM user WHERE user_id = ?`, [req.actor.id]);
        const url = publicPath(folder, req.file);
        await db.execute(`UPDATE user SET ${column} = ? WHERE user_id = ?`, [url, req.actor.id]);
        removeUpload(old[0]?.current);
        res.json({ success: true, url });
    } catch (error) {
        console.error("savePicture error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const searchUsers = async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        if (q.length < 2) return res.json({ success: true, users: [] });

        const like = `%${q.replace(/[%_]/g, "")}%`;
        const myId = req.actor.type === "user" ? req.actor.id : 0;
        const [users] = await db.execute(
            `SELECT user_id, full_name, username, profile_picture, blood_group
             FROM user
             WHERE account_status = 'Active' AND user_id <> ? AND (full_name LIKE ? OR username LIKE ?)
             ORDER BY full_name LIMIT 10`,
            [myId, like, like]
        );
        res.json({ success: true, users });
    } catch (error) {
        console.error("searchUsers error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const suggestions = async (req, res) => {
    try {
        const myId = req.actor.id;
        const [mine] = await db.execute("SELECT district FROM user WHERE user_id = ?", [myId]);
        const district = mine[0]?.district || "";

        const [users] = await db.execute(
            `SELECT u.user_id, u.full_name, u.username, u.profile_picture, u.blood_group, u.district
             FROM user u
             WHERE u.account_status = 'Active' AND u.user_id <> ?
               AND NOT EXISTS (
                   SELECT 1 FROM friendship f
                   WHERE (f.requester_id = ? AND f.addressee_id = u.user_id)
                      OR (f.addressee_id = ? AND f.requester_id = u.user_id)
               )
             ORDER BY (u.district = ?) DESC, RAND()
             LIMIT 8`,
            [myId, myId, myId, district]
        );
        res.json({ success: true, users });
    } catch (error) {
        console.error("suggestions error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    me, getProfile, userFriends, updateBio, searchUsers, suggestions,
    uploadAvatar: savePicture("profile_picture", "avatars"),
    uploadCover: savePicture("cover_picture", "covers")
};