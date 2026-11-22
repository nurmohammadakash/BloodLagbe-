const db = require("../config/db");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const toInt = (value, fallback, min, max) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

const getFriendIds = async (userId) => {
    const [rows] = await db.execute(
        `SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS friend_id
         FROM friendship
         WHERE status = 'Accepted' AND (requester_id = ? OR addressee_id = ?)`,
        [userId, userId, userId]
    );
    return rows.map(r => r.friend_id);
};

const getRelation = async (viewerId, otherId) => {
    const [rows] = await db.execute(
        `SELECT friendship_id, requester_id, status FROM friendship
         WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
         LIMIT 1`,
        [viewerId, otherId, otherId, viewerId]
    );
    if (!rows.length) return { status: "none", friendship_id: null };
    const row = rows[0];
    if (row.status === "Accepted") return { status: "friends", friendship_id: row.friendship_id };
    return {
        status: row.requester_id === viewerId ? "request_sent" : "request_received",
        friendship_id: row.friendship_id
    };
};

const getActorInfo = async (actor) => {
    if (actor.type === "bloodbank") {
        const [rows] = await db.execute(
            "SELECT name AS display_name, NULL AS username, NULL AS picture FROM blood_bank WHERE bloodbank_id = ?",
            [actor.id]
        );
        return rows[0] || { display_name: "A blood bank", username: null, picture: null };
    }
    const [rows] = await db.execute(
        "SELECT full_name AS display_name, username, profile_picture AS picture FROM user WHERE user_id = ?",
        [actor.id]
    );
    return rows[0] || { display_name: "Someone", username: null, picture: null };
};

const snippet = (text, max = 60) => {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
};

module.exports = { BLOOD_GROUPS, toInt, getFriendIds, getRelation, getActorInfo, snippet };