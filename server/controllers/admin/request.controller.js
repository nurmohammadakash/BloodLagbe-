const db = require("../../config/db");
const { sendEmail } = require("../../services/email.service");
const { logAdminAction } = require("../../utils/audit");
const { brandEmail } = require("../../utils/emailTemplate");

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const n = (v) => Number(v || 0);

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const URGENCY = ["Low", "Medium", "High", "Critical"];

const FILTERS = {
    open: "r.status IN ('Pending','Accepted')",
    pending: "r.status = 'Pending'",
    accepted: "r.status = 'Accepted'",
    completed: "r.status = 'Completed'",
    cancelled: "r.status = 'Cancelled'",
    expired: "r.status = 'Expired'",
    all: "1=1"
};

const list = async (req, res) => {
    try {
        const statusKey = has(FILTERS, req.query.status) ? req.query.status : "open";
        const search = String(req.query.search || "").trim();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        const where = [FILTERS[statusKey]];
        const params = [];

        if (URGENCY.includes(req.query.urgency)) {
            where.push("r.urgency_level = ?");
            params.push(req.query.urgency);
        }
        if (GROUPS.includes(req.query.blood_group)) {
            where.push("r.blood_group = ?");
            params.push(req.query.blood_group);
        }
        if (search) {
            const like = `%${search}%`;
            where.push("(r.patient_name LIKE ? OR r.hospital_name LIKE ? OR r.contact_person LIKE ? OR r.contact_number LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)");
            params.push(like, like, like, like, like, like);
        }
        const whereSql = where.join(" AND ");

        // Open requests: most urgent / soonest first. Others: newest first.
        const orderBy = ["open", "pending", "accepted"].includes(statusKey)
            ? "FIELD(r.urgency_level, 'Critical', 'High', 'Medium', 'Low'), r.required_date ASC"
            : "r.created_at DESC";

        const fromSql = `FROM blood_request r
                         JOIN user u ON u.user_id = r.requester_id
                         LEFT JOIN blood_bank b ON b.bloodbank_id = r.bloodbank_id`;

        const [[totalRow]] = await db.query(`SELECT COUNT(*) total ${fromSql} WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT r.request_id, r.blood_group, r.units_required, r.urgency_level, r.patient_name, r.patient_age,
                    r.hospital_name, DATE_FORMAT(r.required_date, '%d %b %Y') AS needed_by,
                    (r.status IN ('Pending','Accepted') AND r.required_date < CURDATE()) AS overdue,
                    r.status, r.created_at,
                    u.user_id AS requester_id, u.full_name AS requester_name, u.username AS requester_username,
                    b.name AS bloodbank_name
             ${fromSql}
             WHERE ${whereSql}
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );

        const [[c]] = await db.query(`
            SELECT COUNT(*) all_count,
                   SUM(status IN ('Pending','Accepted')) open_count,
                   SUM(status = 'Pending') pending,
                   SUM(status = 'Accepted') accepted,
                   SUM(status = 'Completed') completed,
                   SUM(status = 'Cancelled') cancelled,
                   SUM(status = 'Expired') expired,
                   SUM(status IN ('Pending','Accepted') AND urgency_level = 'Critical') critical,
                   SUM(status IN ('Pending','Accepted') AND required_date < CURDATE()) overdue
            FROM blood_request`);

        const total = n(totalRow.total);
        res.json({
            success: true,
            items,
            counts: {
                all: n(c.all_count), open: n(c.open_count), pending: n(c.pending), accepted: n(c.accepted),
                completed: n(c.completed), cancelled: n(c.cancelled), expired: n(c.expired),
                critical: n(c.critical), overdue: n(c.overdue)
            },
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Admin request list error:", error);
        res.status(500).json({ success: false, message: "Could not load blood requests." });
    }
};

const detail = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ success: false, message: "Invalid request id." });

        const [[request]] = await db.query(
            `SELECT r.*, DATE_FORMAT(r.required_date, '%d %b %Y') AS needed_by,
                    (r.status IN ('Pending','Accepted') AND r.required_date < CURDATE()) AS overdue,
                    b.name AS bloodbank_name, b.district AS bloodbank_district
             FROM blood_request r
             LEFT JOIN blood_bank b ON b.bloodbank_id = r.bloodbank_id
             WHERE r.request_id = ?`,
            [id]
        );
        if (!request) return res.status(404).json({ success: false, message: "Request not found." });

        const [[requester]] = await db.query(
            "SELECT user_id, full_name, username, email, phone, blood_group, account_status FROM user WHERE user_id = ?",
            [request.requester_id]
        );
        const [[history]] = await db.query(
            `SELECT COUNT(*) total, SUM(status = 'Cancelled') cancelled, SUM(status = 'Expired') expired
             FROM blood_request WHERE requester_id = ?`,
            [request.requester_id]
        );
        const [donationRows] = await db.query(
            `SELECT d.donation_id, d.status, u.full_name AS donor_name
             FROM donation d JOIN user u ON u.user_id = d.donor_id
             WHERE d.request_id = ? LIMIT 1`,
            [id]
        );

        res.json({
            success: true,
            request,
            requester,
            history: { total: n(history.total), cancelled: n(history.cancelled), expired: n(history.expired) },
            donation: donationRows[0] || null
        });
    } catch (error) {
        console.error("❌ Admin request detail error:", error);
        res.status(500).json({ success: false, message: "Could not load request details." });
    }
};

const cancel = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const reason = String(req.body.reason || "").trim().slice(0, 250);

        if (!id) return res.status(400).json({ success: false, message: "Invalid request id." });
        if (reason.length < 3) {
            return res.status(400).json({ success: false, message: "A reason is required." });
        }

        const [[r]] = await db.query(
            `SELECT r.request_id, r.status, r.blood_group, r.hospital_name, u.full_name, u.email
             FROM blood_request r JOIN user u ON u.user_id = r.requester_id
             WHERE r.request_id = ?`,
            [id]
        );
        if (!r) return res.status(404).json({ success: false, message: "Request not found." });

        if (!["Pending", "Accepted"].includes(r.status)) {
            return res.status(409).json({ success: false, message: `Cannot cancel a request that is ${r.status}.` });
        }

        const [active] = await db.query(
            "SELECT donation_id, status FROM donation WHERE request_id = ? AND status <> 'Cancelled' LIMIT 1",
            [id]
        );
        if (active.length) {
            return res.status(409).json({
                success: false,
                message: `A donation (#${active[0].donation_id}, ${active[0].status}) is linked to this request, so it cannot be cancelled.`
            });
        }

        await db.query("UPDATE blood_request SET status = 'Cancelled', status_reason = ? WHERE request_id = ?", [reason, id]);

        await logAdminAction({
            adminId: req.admin.admin_id,
            ip: req.ip,
            action: "REQUEST_CANCEL",
            targetType: "blood_request",
            targetId: id,
            details: { from: r.status, reason }
        });

        let emailSent = false;
        try {
            await sendEmail(
                r.email,
                "Your Blood-Lagbe blood request was cancelled",
                brandEmail({
                    heading: "Blood request cancelled",
                    name: r.full_name,
                    paragraphs: [`Your request for ${r.blood_group} blood at ${r.hospital_name} was cancelled by the Blood-Lagbe team.`],
                    reason
                })
            );
            emailSent = true;
        } catch (mailError) {
            console.error("❌ Request cancel email failed:", mailError.message);
        }

        res.json({ success: true, message: "Request cancelled.", emailSent });
    } catch (error) {
        console.error("❌ Admin request cancel error:", error);
        res.status(500).json({ success: false, message: "Could not cancel the request." });
    }
};

const expireOverdue = async (req, res) => {
    try {
        const [result] = await db.query(
            `UPDATE blood_request r
             SET r.status = 'Expired', r.status_reason = 'Automatically expired (past the required date)'
             WHERE r.status IN ('Pending','Accepted')
               AND r.required_date < CURDATE()
               AND NOT EXISTS (
                   SELECT 1 FROM donation d
                   WHERE d.request_id = r.request_id AND d.status IN ('Pending','Verified')
               )`
        );

        await logAdminAction({
            adminId: req.admin.admin_id,
            ip: req.ip,
            action: "REQUESTS_EXPIRE_OVERDUE",
            targetType: "blood_request",
            details: { count: result.affectedRows }
        });

        res.json({
            success: true,
            count: result.affectedRows,
            message: `${result.affectedRows} overdue request(s) marked as expired.`
        });
    } catch (error) {
        console.error("❌ Admin expire overdue error:", error);
        res.status(500).json({ success: false, message: "Could not expire overdue requests." });
    }
};

module.exports = { list, detail, cancel, expireOverdue };