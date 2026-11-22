const db = require("../../config/db");
const { sendEmail } = require("../../services/email.service");
const { logAdminAction } = require("../../utils/audit");
const { brandEmail } = require("../../utils/emailTemplate");

const n = (v) => Number(v || 0);
const clean = (v, max = 250) => String(v || "").trim().slice(0, max);

const list = async (req, res) => {
    try {
        const stars = parseInt(req.query.stars, 10);
        const text = ["with_text", "no_text"].includes(req.query.text) ? req.query.text : "all";
        const search = clean(req.query.search, 100);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        const where = ["1=1"];
        const params = [];

        if ([1, 2, 3, 4, 5].includes(stars)) {
            where.push("r.stars = ?");
            params.push(stars);
        }
        if (text === "with_text") where.push("(r.review IS NOT NULL AND r.review <> '')");
        if (text === "no_text") where.push("(r.review IS NULL OR r.review = '')");
        if (search) {
            const like = `%${search}%`;
            where.push("(r.review LIKE ? OR ru.full_name LIKE ? OR ru.username LIKE ? OR rd.full_name LIKE ? OR rd.username LIKE ?)");
            params.push(like, like, like, like, like);
        }
        const whereSql = where.join(" AND ");

        const from = `FROM user_review r
                      JOIN user ru ON ru.user_id = r.rater_id
                      JOIN user rd ON rd.user_id = r.rated_id`;

        const [[totalRow]] = await db.query(`SELECT COUNT(*) total ${from} WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT r.review_id, r.stars, r.review, r.created_at,
                    ru.full_name AS rater_name, ru.username AS rater_username,
                    rd.full_name AS rated_name, rd.username AS rated_username
             ${from} WHERE ${whereSql}
             ORDER BY r.review_id DESC LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );

        const [[s]] = await db.query(
            "SELECT COUNT(*) total, AVG(stars) average, SUM(stars <= 2) low FROM user_review"
        );

        let site = { total: 0, average: 0 };
        try {
            const [[row]] = await db.query("SELECT COUNT(*) total, AVG(rating_value) average FROM site_rating");
            site = { total: n(row.total), average: Number(row.average || 0) };
        } catch { /* site_rating table may not exist */ }

        const total = n(totalRow.total);
        res.json({
            success: true,
            items,
            summary: { total: n(s.total), average: Number(s.average || 0), low: n(s.low), site },
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Admin review list error:", error);
        res.status(500).json({ success: false, message: "Could not load reviews." });
    }
};

const loadReview = async (id) => {
    const [[r]] = await db.query(
        `SELECT r.review_id, r.stars, r.review, u.full_name, u.email
         FROM user_review r JOIN user u ON u.user_id = r.rater_id
         WHERE r.review_id = ?`,
        [id]
    );
    return r || null;
};

const notifyRater = async (r, heading, paragraph, reason) => {
    try {
        await sendEmail(
            r.email,
            `Update on your Blood-Lagbe review`,
            brandEmail({ heading, name: r.full_name, paragraphs: [paragraph], reason })
        );
        return true;
    } catch (error) {
        console.error("❌ Review email failed:", error.message);
        return false;
    }
};

const clearText = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const reason = clean(req.body.reason);
        if (!id || reason.length < 3) return res.status(400).json({ success: false, message: "A reason is required." });

        const r = await loadReview(id);
        if (!r) return res.status(404).json({ success: false, message: "Review not found." });
        if (!r.review) return res.status(409).json({ success: false, message: "This review has no text." });

        await db.query("UPDATE user_review SET review = '' WHERE review_id = ?", [id]);

        await logAdminAction({
            adminId: req.admin.admin_id, ip: req.ip, action: "REVIEW_CLEAR_TEXT",
            targetType: "user_review", targetId: id, details: { excerpt: String(r.review).slice(0, 120), reason }
        });
        const emailSent = await notifyRater(
            r, "Review text removed",
            "The written part of a review you left was removed because it did not follow the community guidelines. Your star rating was kept.",
            reason
        );
        res.json({ success: true, message: "Review text removed.", emailSent });
    } catch (error) {
        console.error("❌ Admin review clear error:", error);
        res.status(500).json({ success: false, message: "Could not update the review." });
    }
};

const remove = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const reason = clean(req.body.reason);
        if (!id || reason.length < 3) return res.status(400).json({ success: false, message: "A reason is required." });

        const r = await loadReview(id);
        if (!r) return res.status(404).json({ success: false, message: "Review not found." });

        await db.query("DELETE FROM user_review WHERE review_id = ?", [id]);

        await logAdminAction({
            adminId: req.admin.admin_id, ip: req.ip, action: "REVIEW_DELETE",
            targetType: "user_review", targetId: id,
            details: { stars: r.stars, excerpt: String(r.review || "").slice(0, 120), reason }
        });
        const emailSent = await notifyRater(
            r, "Review removed",
            "A review you left was removed because it did not follow the community guidelines.",
            reason
        );
        res.json({ success: true, message: "Review deleted.", emailSent });
    } catch (error) {
        console.error("❌ Admin review delete error:", error);
        res.status(500).json({ success: false, message: "Could not delete the review." });
    }
};

module.exports = { list, clearText, remove };