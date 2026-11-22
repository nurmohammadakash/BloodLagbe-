const db = require("../../config/db");
const { sendEmail } = require("../../services/email.service");
const { logAdminAction } = require("../../utils/audit");
const { brandEmail } = require("../../utils/emailTemplate");

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const n = (v) => Number(v || 0);

const FILTERS = {
    all: "1=1",
    pending: "e.status = 'Pending'",
    confirmed: "e.status = 'Confirmed'",
    rejected: "e.status = 'Rejected'"
};

const list = async (req, res) => {
    try {
        const key = has(FILTERS, req.query.status) ? req.query.status : "all";
        const search = String(req.query.search || "").trim().slice(0, 100);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        const where = [FILTERS[key]];
        const params = [];
        if (search) {
            const like = `%${search}%`;
            where.push("(d.full_name LIKE ? OR d.username LIKE ? OR r.full_name LIKE ? OR r.username LIKE ?)");
            params.push(like, like, like, like);
        }
        const whereSql = where.join(" AND ");

        const from = `FROM blood_exchange e
                      JOIN user d ON d.user_id = e.donor_id
                      JOIN user r ON r.user_id = e.recipient_id`;

        const [[totalRow]] = await db.query(`SELECT COUNT(*) total ${from} WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT e.exchange_id, e.blood_group, e.status, e.created_at, e.confirmed_at,
                    DATE_FORMAT(e.donated_on, '%d %b %Y') AS donated_on,
                    d.full_name AS donor_name, d.username AS donor_username,
                    r.full_name AS recipient_name, r.username AS recipient_username
             ${from} WHERE ${whereSql}
             ORDER BY e.exchange_id DESC LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );
        const [[c]] = await db.query(`
            SELECT COUNT(*) all_count,
                   SUM(status = 'Pending') pending,
                   SUM(status = 'Confirmed') confirmed,
                   SUM(status = 'Rejected') rejected,
                   SUM(status = 'Confirmed' AND donated_on >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) this_month
            FROM blood_exchange`);

        const total = n(totalRow.total);
        res.json({
            success: true,
            items,
            counts: {
                all: n(c.all_count), pending: n(c.pending), confirmed: n(c.confirmed),
                rejected: n(c.rejected), thisMonth: n(c.this_month)
            },
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Admin exchange list error:", error);
        res.status(500).json({ success: false, message: "Could not load peer donations." });
    }
};

// Voiding a fake or mistaken donation protects the leaderboard
const reject = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const reason = String(req.body.reason || "").trim().slice(0, 250);
        if (!id || reason.length < 3) {
            return res.status(400).json({ success: false, message: "A reason is required." });
        }

        const [[e]] = await db.query(
            `SELECT e.exchange_id, e.status, e.blood_group, DATE_FORMAT(e.donated_on, '%d %b %Y') AS donated_on,
                    d.full_name AS donor_name, d.email AS donor_email,
                    r.full_name AS recipient_name, r.email AS recipient_email
             FROM blood_exchange e
             JOIN user d ON d.user_id = e.donor_id
             JOIN user r ON r.user_id = e.recipient_id
             WHERE e.exchange_id = ?`,
            [id]
        );
        if (!e) return res.status(404).json({ success: false, message: "Record not found." });
        if (e.status === "Rejected") {
            return res.status(409).json({ success: false, message: "This donation is already rejected." });
        }

        await db.query("UPDATE blood_exchange SET status = 'Rejected' WHERE exchange_id = ?", [id]);
        const [removed] = await db.query("DELETE FROM user_review WHERE exchange_id = ?", [id]);

        await logAdminAction({
            adminId: req.admin.admin_id, ip: req.ip, action: "EXCHANGE_REJECT",
            targetType: "blood_exchange", targetId: id,
            details: { from: e.status, reviews_removed: removed.affectedRows, reason }
        });

        let emailSent = false;
        try {
            const paragraph = `The ${e.blood_group} blood donation recorded for ${e.donated_on} was rejected by the Blood-Lagbe team and will not count towards the leaderboard.`;
            await Promise.all([
                sendEmail(e.donor_email, "A donation record was rejected", brandEmail({ heading: "Donation record rejected", name: e.donor_name, paragraphs: [paragraph], reason })),
                sendEmail(e.recipient_email, "A donation record was rejected", brandEmail({ heading: "Donation record rejected", name: e.recipient_name, paragraphs: [paragraph], reason }))
            ]);
            emailSent = true;
        } catch (mailError) {
            console.error("❌ Exchange email failed:", mailError.message);
        }

        res.json({ success: true, message: "Donation record rejected.", emailSent });
    } catch (error) {
        console.error("❌ Admin exchange reject error:", error);
        res.status(500).json({ success: false, message: "Could not reject the record." });
    }
};

module.exports = { list, reject };