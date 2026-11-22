const db = require("../../config/db");
const { notifyUsers } = require("../../services/notify.service");
const { BLOOD_GROUPS, getFriendIds, getActorInfo } = require("../../utils/social.helpers");

const setNote = async (req, res) => {
    try {
        const { note_type, blood_group } = req.body || {};

        if (!["Need", "Available"].includes(note_type)) {
            return res.status(400).json({ success: false, message: "note_type must be Need or Available." });
        }
        if (!BLOOD_GROUPS.includes(blood_group)) {
            return res.status(400).json({ success: false, message: "Invalid blood group." });
        }

        await db.execute(
            `INSERT INTO user_note (user_id, note_type, blood_group, created_at, expires_at)
             VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))
             ON DUPLICATE KEY UPDATE
                note_type = VALUES(note_type),
                blood_group = VALUES(blood_group),
                created_at = NOW(),
                expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)`,
            [req.actor.id, note_type, blood_group]
        );

        if (note_type === "Need") {
            const info = await getActorInfo(req.actor);
            const friendIds = await getFriendIds(req.actor.id);
            await notifyUsers({
                recipientIds: friendIds,
                actor: req.actor,
                type: "need_blood",
                message: `${info.display_name} needs ${blood_group} blood.`,
                link: `/profile?u=${info.username}`
            });
        }

        res.json({ success: true, note: { note_type, blood_group } });
    } catch (error) {
        console.error("setNote error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const clearNote = async (req, res) => {
    try {
        await db.execute("DELETE FROM user_note WHERE user_id = ?", [req.actor.id]);
        res.json({ success: true, message: "Note removed." });
    } catch (error) {
        console.error("clearNote error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const listNotes = async (req, res) => {
    try {
        await db.execute("DELETE FROM user_note WHERE expires_at < NOW()");

        const me = req.actor.id;
        const [rows] = await db.execute(
            `SELECT n.note_type, n.blood_group, n.created_at,
                    u.user_id, u.full_name, u.username, u.profile_picture,
                    EXISTS(
                        SELECT 1 FROM friendship f
                        WHERE f.status = 'Accepted'
                          AND ((f.requester_id = ? AND f.addressee_id = u.user_id)
                            OR (f.addressee_id = ? AND f.requester_id = u.user_id))
                    ) AS is_friend
             FROM user_note n
             JOIN user u ON u.user_id = n.user_id
             WHERE u.account_status = 'Active'
             ORDER BY (u.user_id = ?) DESC, is_friend DESC, n.created_at DESC
             LIMIT 30`,
            [me, me, me]
        );

        res.json({
            success: true,
            notes: rows.map(r => ({ ...r, is_friend: !!r.is_friend, is_me: r.user_id === me }))
        });
    } catch (error) {
        console.error("listNotes error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { setNote, clearNote, listNotes };