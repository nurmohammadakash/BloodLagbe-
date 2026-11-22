const db = require("../../config/db");

const REASONS = ["Spam", "Harassment", "Misinformation", "Inappropriate", "Other"];

const TARGETS = {
    post: { table: "feed_post", idCol: "post_id" },
    comment: { table: "feed_comment", idCol: "comment_id" }
};

const createReport = (type) => async (req, res) => {
    try {
        const actor = req.actor;
        const id = parseInt(req.params.id, 10);
        const reason = REASONS.includes(req.body.reason) ? req.body.reason : "Other";
        const details = String(req.body.details || "").trim().slice(0, 250) || null;

        if (!id) return res.status(400).json({ success: false, message: "Invalid request." });

        const { table, idCol } = TARGETS[type];
        const [rows] = await db.query(`SELECT author_type, author_id FROM ${table} WHERE ${idCol} = ?`, [id]);
        if (!rows.length) return res.status(404).json({ success: false, message: "Content not found." });

        if (rows[0].author_type === actor.type && Number(rows[0].author_id) === actor.id) {
            return res.status(400).json({ success: false, message: "You cannot report your own content." });
        }

        try {
            await db.query(
                `INSERT INTO content_report (target_type, target_id, reporter_type, reporter_id, reason, details)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [type, id, actor.type, actor.id, reason, details]
            );
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ success: false, message: "You have already reported this." });
            }
            throw error;
        }

        res.status(201).json({ success: true, message: "Thanks for reporting. Our team will review it." });
    } catch (error) {
        console.error("createReport error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { reportPost: createReport("post"), reportComment: createReport("comment") };