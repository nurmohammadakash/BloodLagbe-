const db = require("../config/db");
const { getIO } = require("../socket");

const push = (type, id, payload) => {
    const io = getIO();
    if (io) io.to(`${type}:${id}`).emit("notification", payload);
};

const notify = async ({ recipientType = "user", recipientId, actor, type, message, link = null }) => {
    try {
        if (!recipientId) return;
        if (actor && actor.type === recipientType && Number(actor.id) === Number(recipientId)) return;

        const [result] = await db.execute(
            `INSERT INTO app_notification
             (recipient_type, recipient_id, actor_type, actor_id, type, message, link)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [recipientType, recipientId, actor?.type || null, actor?.id || null, type, message.slice(0, 255), link]
        );

        push(recipientType, recipientId, {
            notification_id: result.insertId, type, message, link, is_read: 0, created_at: new Date()
        });
    } catch (error) {
        console.error("Notification error:", error.message);
    }
};

const notifyUsers = async ({ recipientIds, actor, type, message, link = null }) => {
    try {
        const ids = [...new Set(recipientIds)].filter(
            id => !(actor && actor.type === "user" && Number(actor.id) === Number(id))
        );
        if (!ids.length) return;

        const text = message.slice(0, 255);
        const rows = ids.map(id => ["user", id, actor?.type || null, actor?.id || null, type, text, link]);

        await db.query(
            `INSERT INTO app_notification
             (recipient_type, recipient_id, actor_type, actor_id, type, message, link)
             VALUES ?`,
            [rows]
        );

        ids.forEach(id => push("user", id, {
            type, message: text, link, is_read: 0, created_at: new Date()
        }));
    } catch (error) {
        console.error("Bulk notification error:", error.message);
    }
};

module.exports = { notify, notifyUsers };