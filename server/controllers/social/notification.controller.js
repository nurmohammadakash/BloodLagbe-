const db = require("../../config/db");
const { toInt } = require("../../utils/social.helpers");

const listNotifications = async (req, res) => {
    try {
        const limit = toInt(req.query.limit, 30, 1, 50);
        const { type, id } = req.actor;

        const [rows] = await db.execute(
            `SELECT n.notification_id, n.type, n.message, n.link, n.is_read, n.created_at,
                    u.profile_picture AS actor_picture, u.full_name AS actor_name
             FROM app_notification n
             LEFT JOIN user u ON n.actor_type = 'user' AND u.user_id = n.actor_id
             WHERE n.recipient_type = ? AND n.recipient_id = ?
             ORDER BY n.notification_id DESC LIMIT ${limit}`,
            [type, id]
        );
        const [[unread]] = await db.execute(
            "SELECT COUNT(*) AS c FROM app_notification WHERE recipient_type = ? AND recipient_id = ? AND is_read = 0",
            [type, id]
        );

        res.json({
            success: true,
            unread: Number(unread.c),
            notifications: rows.map(r => ({ ...r, is_read: !!r.is_read }))
        });
    } catch (error) {
        console.error("listNotifications error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const markRead = async (req, res) => {
    try {
        await db.execute(
            `UPDATE app_notification SET is_read = 1
             WHERE notification_id = ? AND recipient_type = ? AND recipient_id = ?`,
            [req.params.id, req.actor.type, req.actor.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("markRead error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const markAllRead = async (req, res) => {
    try {
        await db.execute(
            "UPDATE app_notification SET is_read = 1 WHERE recipient_type = ? AND recipient_id = ?",
            [req.actor.type, req.actor.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("markAllRead error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { listNotifications, markRead, markAllRead };