const db = require("../../config/db");
const { sendEmail } = require("../../services/email.service");
const { logAdminAction } = require("../../utils/audit");
const { brandEmail } = require("../../utils/emailTemplate");
const { removeUpload } = require("../../middleware/upload.middleware");

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const n = (v) => Number(v || 0);
const clean = (v, max = 250) => String(v || "").trim().slice(0, max);

const paging = (req) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    return { page, limit, offset: (page - 1) * limit };
};

const CFG = {
    post: {
        table: "feed_post", idCol: "post_id",
        select: `p.post_id AS id, p.author_type, p.author_id, LEFT(p.content, 160) AS snippet,
                 p.media_url, p.is_urgent, p.is_hidden, p.created_at,
                 (SELECT COUNT(*) FROM feed_like l WHERE l.post_id = p.post_id AND l.reaction = 'like') AS likes,
                 (SELECT COUNT(*) FROM feed_comment c WHERE c.post_id = p.post_id) AS comments`
    },
    comment: {
        table: "feed_comment", idCol: "comment_id",
        select: `p.comment_id AS id, p.post_id, p.author_type, p.author_id, LEFT(p.content, 160) AS snippet,
                 p.is_hidden, p.created_at`
    }
};

const AUTHOR_JOINS = `LEFT JOIN user u ON p.author_type = 'user' AND u.user_id = p.author_id
                      LEFT JOIN blood_bank b ON p.author_type = 'bloodbank' AND b.bloodbank_id = p.author_id`;

const FILTER_KEYS = ["all", "visible", "hidden", "reported"];
const contentFilter = (type, key) => ({
    all: "1=1",
    visible: "p.is_hidden = 0",
    hidden: "p.is_hidden = 1",
    reported: `EXISTS (SELECT 1 FROM content_report r WHERE r.target_type = '${type}'
                       AND r.target_id = p.${CFG[type].idCol} AND r.status = 'Open')`
}[key]);

const REPORT_STATUS = { open: "Open", resolved: "Resolved", dismissed: "Dismissed" };

/* ---------- helpers ---------- */
const getTarget = async (type, id) => {
    const cfg = CFG[type];
    const extra = type === "comment" ? ", p.post_id" : ", p.media_url, p.is_urgent";
    const [[row]] = await db.query(
        `SELECT p.${cfg.idCol} AS id, p.author_type, p.author_id, p.content, p.is_hidden, p.hidden_reason,
                p.created_at${extra},
                COALESCE(u.full_name, b.name) AS author_name, u.username AS author_username,
                COALESCE(u.email, b.email) AS author_email,
                COALESCE(u.account_status, b.status) AS author_status
         FROM ${cfg.table} p ${AUTHOR_JOINS}
         WHERE p.${cfg.idCol} = ?`,
        [id]
    );
    return row || null;
};

const publicTarget = ({ author_email, ...rest }) => rest;

const closeReports = (type, id, status, note, adminId) =>
    db.query(
        `UPDATE content_report SET status = ?, resolved_by = ?, resolved_at = NOW(), resolution_note = ?
         WHERE target_type = ? AND target_id = ? AND status = 'Open'`,
        [status, adminId, String(note || "").slice(0, 255), type, id]
    );

const mailAuthor = async (target, { subject, heading, paragraphs, reason }) => {
    if (!target.author_email) return false;
    try {
        await sendEmail(target.author_email, subject, brandEmail({ heading, name: target.author_name, paragraphs, reason }));
        return true;
    } catch (error) {
        console.error("❌ Moderation email failed:", error.message);
        return false;
    }
};

const applyAction = async (req, type, id, action, reason) => {
    const target = await getTarget(type, id);
    if (!target) {
        return { code: 404, body: { success: false, message: "Content not found. It may already be deleted." } };
    }
    if ((action === "hide" || action === "delete") && reason.length < 3) {
        return { code: 400, body: { success: false, message: "A reason is required." } };
    }
    if (action === "hide" && target.is_hidden) {
        return { code: 409, body: { success: false, message: "This content is already hidden." } };
    }
    if (action === "restore" && !target.is_hidden) {
        return { code: 409, body: { success: false, message: "This content is not hidden." } };
    }

    const cfg = CFG[type];
    const adminId = req.admin.admin_id;

    if (action === "hide") {
        await db.query(`UPDATE ${cfg.table} SET is_hidden = 1, hidden_reason = ? WHERE ${cfg.idCol} = ?`, [reason, id]);
        await closeReports(type, id, "Resolved", `Hidden: ${reason}`, adminId);
    } else if (action === "restore") {
        await db.query(`UPDATE ${cfg.table} SET is_hidden = 0, hidden_reason = NULL WHERE ${cfg.idCol} = ?`, [id]);
    } else {
        await closeReports(type, id, "Resolved", `Deleted: ${reason}`, adminId);
        if (type === "post") {
            await db.query("DELETE FROM feed_like WHERE post_id = ?", [id]);
            await db.query("DELETE FROM feed_comment WHERE post_id = ?", [id]);
            await db.query("DELETE FROM feed_post WHERE post_id = ?", [id]);
            try { if (target.media_url) removeUpload(target.media_url); } catch { /* file may be gone */ }
        } else {
            await db.query("DELETE FROM feed_comment WHERE comment_id = ?", [id]);
        }
    }

    await logAdminAction({
        adminId,
        ip: req.ip,
        action: `CONTENT_${action.toUpperCase()}`,
        targetType: cfg.table,
        targetId: id,
        details: {
            type,
            author: `${target.author_type}:${target.author_id}`,
            excerpt: String(target.content || "").slice(0, 80),
            reason: reason || undefined
        }
    });

    let emailSent = false;
    if (action === "hide") {
        emailSent = await mailAuthor(target, {
            subject: "Your content was hidden on Blood-Lagbe",
            heading: "Content hidden",
            paragraphs: [`A ${type} you shared was hidden by our moderation team because it did not follow the community guidelines.`],
            reason
        });
    } else if (action === "delete") {
        emailSent = await mailAuthor(target, {
            subject: "Your content was removed from Blood-Lagbe",
            heading: "Content removed",
            paragraphs: [`A ${type} you shared was removed by our moderation team because it did not follow the community guidelines.`],
            reason
        });
    }

    const messages = { hide: "Content hidden.", restore: "Content restored.", delete: "Content deleted." };
    return { code: 200, body: { success: true, message: messages[action], emailSent } };
};

/* ---------- reports queue ---------- */
const listReports = async (req, res) => {
    try {
        const key = has(REPORT_STATUS, req.query.status) ? req.query.status : "open";
        const { page, limit, offset } = paging(req);
        const status = REPORT_STATUS[key];

        const [[totalRow]] = await db.query(
            "SELECT COUNT(*) total FROM (SELECT 1 FROM content_report WHERE status = ? GROUP BY target_type, target_id) t",
            [status]
        );
        const [items] = await db.query(
            `SELECT g.*,
                    CASE g.target_type
                        WHEN 'post' THEN (SELECT LEFT(content, 140) FROM feed_post WHERE post_id = g.target_id)
                        ELSE (SELECT LEFT(content, 140) FROM feed_comment WHERE comment_id = g.target_id)
                    END AS snippet,
                    CASE g.target_type
                        WHEN 'post' THEN (SELECT is_hidden FROM feed_post WHERE post_id = g.target_id)
                        ELSE (SELECT is_hidden FROM feed_comment WHERE comment_id = g.target_id)
                    END AS is_hidden
             FROM (
                 SELECT target_type, target_id, COUNT(*) AS report_count, MAX(created_at) AS last_reported,
                        GROUP_CONCAT(DISTINCT reason ORDER BY reason SEPARATOR ', ') AS reasons
                 FROM content_report WHERE status = ?
                 GROUP BY target_type, target_id
             ) g
             ORDER BY g.last_reported DESC
             LIMIT ? OFFSET ?`,
            [status, limit, offset]
        );
        const [countRows] = await db.query(
            `SELECT status, COUNT(*) c FROM (
                 SELECT status, target_type, target_id FROM content_report GROUP BY status, target_type, target_id
             ) t GROUP BY status`
        );

        const counts = { open: 0, resolved: 0, dismissed: 0 };
        countRows.forEach((r) => { counts[String(r.status).toLowerCase()] = n(r.c); });

        const total = n(totalRow.total);
        res.json({
            success: true,
            items,
            counts,
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Admin report list error:", error);
        res.status(500).json({ success: false, message: "Could not load reports." });
    }
};

const resolveReport = async (req, res) => {
    try {
        const type = String(req.body.target_type || "");
        const id = parseInt(req.body.target_id, 10);
        const action = String(req.body.action || "");
        const reason = clean(req.body.reason);

        if (!has(CFG, type) || !id || !["hide", "delete", "dismiss"].includes(action)) {
            return res.status(400).json({ success: false, message: "Invalid request." });
        }

        if (action === "dismiss") {
            const [result] = await closeReports(type, id, "Dismissed", reason || "No violation found", req.admin.admin_id);
            await logAdminAction({
                adminId: req.admin.admin_id, ip: req.ip, action: "REPORT_DISMISS",
                targetType: CFG[type].table, targetId: id, details: { reports: result.affectedRows, note: reason || undefined }
            });
            return res.json({ success: true, message: `Dismissed ${result.affectedRows} report(s).` });
        }

        const result = await applyAction(req, type, id, action, reason);
        if (result.code === 404) {
            await closeReports(type, id, "Resolved", "Content no longer exists", req.admin.admin_id);
            return res.json({ success: true, message: "The content no longer exists. Reports closed.", emailSent: false });
        }
        res.status(result.code).json(result.body);
    } catch (error) {
        console.error("❌ Admin resolve report error:", error);
        res.status(500).json({ success: false, message: "Could not resolve the report." });
    }
};

/* ---------- posts & comments ---------- */
const listContent = (type) => async (req, res) => {
    try {
        const cfg = CFG[type];
        const key = FILTER_KEYS.includes(req.query.status) ? req.query.status : "all";
        const search = clean(req.query.search, 100);
        const { page, limit, offset } = paging(req);

        const where = [contentFilter(type, key)];
        const params = [];
        if (search) {
            const like = `%${search}%`;
            where.push("(p.content LIKE ? OR u.full_name LIKE ? OR u.username LIKE ? OR b.name LIKE ?)");
            params.push(like, like, like, like);
        }
        const whereSql = where.join(" AND ");
        const from = `FROM ${cfg.table} p ${AUTHOR_JOINS}`;

        const [[totalRow]] = await db.query(`SELECT COUNT(*) total ${from} WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT ${cfg.select},
                    COALESCE(u.full_name, b.name) AS author_name, u.username AS author_username,
                    (SELECT COUNT(*) FROM content_report r WHERE r.target_type = '${type}'
                        AND r.target_id = p.${cfg.idCol} AND r.status = 'Open') AS open_reports
             ${from}
             WHERE ${whereSql}
             ORDER BY p.${cfg.idCol} DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        const [[c]] = await db.query(
            `SELECT COUNT(*) all_count, SUM(is_hidden = 0) visible, SUM(is_hidden = 1) hidden FROM ${cfg.table}`
        );
        const [[rep]] = await db.query(
            "SELECT COUNT(DISTINCT target_id) c FROM content_report WHERE target_type = ? AND status = 'Open'",
            [type]
        );

        const total = n(totalRow.total);
        res.json({
            success: true,
            items,
            counts: { all: n(c.all_count), visible: n(c.visible), hidden: n(c.hidden), reported: n(rep.c) },
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error(`❌ Admin ${type} list error:`, error);
        res.status(500).json({ success: false, message: "Could not load content." });
    }
};

const detail = async (req, res) => {
    try {
        const type = req.params.type;
        const id = parseInt(req.params.id, 10);
        if (!has(CFG, type) || !id) return res.status(400).json({ success: false, message: "Invalid request." });

        const target = await getTarget(type, id);
        if (!target) return res.status(404).json({ success: false, message: "Content not found. It may have been deleted." });

        const [reports] = await db.query(
            `SELECT r.report_id, r.reason, r.details, r.status, r.created_at, r.resolution_note,
                    COALESCE(ru.full_name, rb.name) AS reporter_name
             FROM content_report r
             LEFT JOIN user ru ON r.reporter_type = 'user' AND ru.user_id = r.reporter_id
             LEFT JOIN blood_bank rb ON r.reporter_type = 'bloodbank' AND rb.bloodbank_id = r.reporter_id
             WHERE r.target_type = ? AND r.target_id = ?
             ORDER BY r.created_at DESC`,
            [type, id]
        );

        let parent = null;
        if (type === "comment") {
            const [rows] = await db.query("SELECT LEFT(content, 200) AS c FROM feed_post WHERE post_id = ?", [target.post_id]);
            parent = rows.length ? rows[0].c || "(image only)" : "(post deleted)";
        }

        res.json({ success: true, target: publicTarget(target), reports, parent });
    } catch (error) {
        console.error("❌ Admin content detail error:", error);
        res.status(500).json({ success: false, message: "Could not load content." });
    }
};

const itemAction = async (req, res) => {
    try {
        const type = req.params.type;
        const action = req.params.action;
        const id = parseInt(req.params.id, 10);

        if (!has(CFG, type) || !id || !["hide", "restore", "delete"].includes(action)) {
            return res.status(400).json({ success: false, message: "Invalid request." });
        }
        const result = await applyAction(req, type, id, action, clean(req.body.reason));
        res.status(result.code).json(result.body);
    } catch (error) {
        console.error("❌ Admin content action error:", error);
        res.status(500).json({ success: false, message: "Could not complete the action." });
    }
};

/* ---------- warn an author ---------- */
const warn = async (req, res) => {
    try {
        const authorType = ["user", "bloodbank"].includes(req.body.author_type) ? req.body.author_type : null;
        const id = parseInt(req.body.author_id, 10);
        const message = clean(req.body.message, 500);

        if (!authorType || !id || message.length < 3) {
            return res.status(400).json({ success: false, message: "A warning message is required." });
        }

        const [[author]] = await (authorType === "user"
            ? db.query("SELECT full_name AS name, email FROM user WHERE user_id = ?", [id])
            : db.query("SELECT name, email FROM blood_bank WHERE bloodbank_id = ?", [id]));
        if (!author) return res.status(404).json({ success: false, message: "Account not found." });

        try {
            await sendEmail(
                author.email,
                "Community guidelines warning from Blood-Lagbe",
                brandEmail({
                    heading: "Community guidelines warning",
                    name: author.name,
                    paragraphs: [
                        "Our moderation team reviewed activity on your account and noticed content that does not follow the Blood-Lagbe community guidelines. Repeated violations may lead to suspension."
                    ],
                    reason: message
                })
            );
        } catch (mailError) {
            console.error("❌ Warning email failed:", mailError.message);
            return res.status(502).json({ success: false, message: "The warning email could not be sent. Check your mail settings." });
        }

        await logAdminAction({
            adminId: req.admin.admin_id, ip: req.ip,
            action: authorType === "user" ? "USER_WARN" : "BLOODBANK_WARN",
            targetType: authorType === "user" ? "user" : "blood_bank", targetId: id, details: { message }
        });

        res.json({ success: true, message: "Warning sent." });
    } catch (error) {
        console.error("❌ Admin warn error:", error);
        res.status(500).json({ success: false, message: "Could not send the warning." });
    }
};

module.exports = {
    listReports, resolveReport, detail, itemAction, warn,
    listPosts: listContent("post"), listComments: listContent("comment")
};