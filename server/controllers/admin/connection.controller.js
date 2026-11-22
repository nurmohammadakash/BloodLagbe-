const db = require("../../config/db");
const { logAdminAction } = require("../../utils/audit");
const { notify } = require("../../services/notify.service");
const { expireStale } = require("../social/connection.controller");

const n = (v) => Number(v) || 0;

const TABS = {
    all: null,
    waiting: ["Submitted"],
    pending: ["Pending"],
    successful: ["Successful"],
    rejected: ["Rejected"],
    other: ["Declined", "Closed", "Cancelled"]
};

const FROM_SQL = `FROM blood_connection c
                  JOIN user o ON o.user_id = c.note_owner_id
                  JOIN user a ON a.user_id = c.applicant_id`;

const list = async (req, res) => {
    try {
        await expireStale();

        const tab = Object.prototype.hasOwnProperty.call(TABS, req.query.status) ? req.query.status : "all";
        const search = String(req.query.search || "").trim();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        const where = ["1=1"];
        const params = [];
        if (TABS[tab]) {
            where.push(`c.status IN (${TABS[tab].map(() => "?").join(",")})`);
            params.push(...TABS[tab]);
        }
        if (search) {
            const like = `%${search}%`;
            where.push("(o.full_name LIKE ? OR o.username LIKE ? OR a.full_name LIKE ? OR a.username LIKE ? OR c.mobile LIKE ?)");
            params.push(like, like, like, like, like);
        }
        const whereSql = where.join(" AND ");

        const [[totalRow]] = await db.query(`SELECT COUNT(*) total ${FROM_SQL} WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT c.connection_id, c.status, c.status_reason, c.note_type, c.note_blood_group, c.applicant_role,
                    DATE_FORMAT(c.created_at, '%d %b %Y') AS requested_on,
                    DATE_FORMAT(c.confirmed_at, '%d %b %Y') AS confirmed_on,
                    DATE_FORMAT(c.completed_at, '%d %b %Y') AS completed_on,
                    a.full_name AS applicant_name, a.username AS applicant_username,
                    o.full_name AS owner_name, o.username AS owner_username,
                    (SELECT COUNT(*) FROM connection_review r WHERE r.connection_id = c.connection_id) AS review_count
             ${FROM_SQL}
             WHERE ${whereSql}
             ORDER BY c.created_at DESC, c.connection_id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );

        const [[c]] = await db.query(`
            SELECT COUNT(*) all_count,
                   SUM(status = 'Submitted') waiting,
                   SUM(status = 'Pending') pending,
                   SUM(status = 'Successful') successful,
                   SUM(status = 'Rejected') rejected,
                   SUM(status IN ('Declined','Closed','Cancelled')) other,
                   SUM(status = 'Successful' AND completed_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) this_month
            FROM blood_connection`);

        const total = n(totalRow.total);
        res.json({
            success: true,
            items,
            counts: {
                all: n(c.all_count), waiting: n(c.waiting), pending: n(c.pending), successful: n(c.successful),
                rejected: n(c.rejected), other: n(c.other), thisMonth: n(c.this_month)
            },
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Admin connection list error:", error);
        res.status(500).json({ success: false, message: "Could not load blood connections." });
    }
};

const detail = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(404).json({ success: false, message: "Connection not found." });

        const [rows] = await db.execute(
            `SELECT c.*,
                    DATE_FORMAT(c.last_donation_date, '%d %b %Y') AS last_donation_fmt,
                    DATE_FORMAT(c.created_at, '%d %b %Y, %h:%i %p') AS requested_at,
                    DATE_FORMAT(c.confirmed_at, '%d %b %Y, %h:%i %p') AS confirmed_at_fmt,
                    DATE_FORMAT(c.completed_at, '%d %b %Y, %h:%i %p') AS completed_at_fmt,
                    DATE_FORMAT(c.cancelled_at, '%d %b %Y, %h:%i %p') AS cancelled_at_fmt,
                    o.full_name AS owner_name, o.username AS owner_username, o.email AS owner_email, o.phone AS owner_phone,
                    o.blood_group AS owner_group, o.district AS owner_district, o.account_status AS owner_status,
                    a.username AS applicant_username, a.account_status AS applicant_status
             ${FROM_SQL}
             WHERE c.connection_id = ?`,
            [id]
        );
        const c = rows[0];
        if (!c) return res.status(404).json({ success: false, message: "Connection not found." });

        const [reviews] = await db.execute(
            `SELECT r.stars, r.comment, DATE_FORMAT(r.created_at, '%d %b %Y') AS reviewed_on,
                    rater.full_name AS rater_name, rated.full_name AS rated_name
             FROM connection_review r
             JOIN user rater ON rater.user_id = r.rater_id
             JOIN user rated ON rated.user_id = r.rated_id
             WHERE r.connection_id = ? ORDER BY r.review_id`,
            [id]
        );

        res.json({
            success: true,
            connection: {
                connection_id: c.connection_id,
                status: c.status,
                status_reason: c.status_reason,
                cancelled_by: c.cancelled_by,
                note_type: c.note_type,
                note_blood_group: c.note_blood_group,
                applicant_role: c.applicant_role,
                timeline: {
                    requested: c.requested_at, confirmed: c.confirmed_at_fmt,
                    completed: c.completed_at_fmt, cancelled: c.cancelled_at_fmt
                },
                applicant: {
                    user_id: c.applicant_id, username: c.applicant_username, account_status: c.applicant_status,
                    full_name: c.full_name, father_name: c.father_name, mother_name: c.mother_name,
                    address: c.address, blood_group: c.blood_group, mobile: c.mobile, email: c.email, nid: c.nid,
                    last_donation: c.last_donation_fmt, previous_donations: c.previous_donations,
                    has_blood_disease: c.has_blood_disease, illness_reason: c.illness_reason, received_before: c.received_before
                },
                owner: {
                    user_id: c.note_owner_id, username: c.owner_username, full_name: c.owner_name, email: c.owner_email,
                    phone: c.owner_phone, blood_group: c.owner_group, district: c.owner_district, account_status: c.owner_status
                },
                reviews
            }
        });
    } catch (error) {
        console.error("❌ Admin connection detail error:", error);
        res.status(500).json({ success: false, message: "Could not load the connection." });
    }
};

const cancel = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const reason = String((req.body || {}).reason || "").trim();
        if (!Number.isInteger(id)) return res.status(404).json({ success: false, message: "Connection not found." });
        if (reason.length < 3 || reason.length > 255) {
            return res.status(400).json({ success: false, message: "Please enter a reason (3-255 characters)." });
        }

        const [rows] = await db.execute(
            "SELECT connection_id, status, note_owner_id, applicant_id FROM blood_connection WHERE connection_id = ?",
            [id]
        );
        const c = rows[0];
        if (!c) return res.status(404).json({ success: false, message: "Connection not found." });
        if (!["Submitted", "Pending"].includes(c.status)) {
            return res.status(409).json({ success: false, message: `A ${c.status.toLowerCase()} connection cannot be cancelled.` });
        }

        const [result] = await db.execute(
            `UPDATE blood_connection
             SET status = 'Cancelled', cancelled_by = 'Admin', cancelled_at = NOW(), status_reason = ?
             WHERE connection_id = ? AND status IN ('Submitted','Pending')`,
            [reason, id]
        );
        if (!result.affectedRows) {
            return res.status(409).json({ success: false, message: "This connection has just changed. Please refresh." });
        }

        const actor = { type: "admin", id: req.admin.admin_id };
        for (const recipientId of [c.note_owner_id, c.applicant_id]) {
            await notify({
                recipientId, actor, type: "connection_cancelled",
                message: "An administrator cancelled your blood connection.",
                link: `/connection?id=${id}`
            });
        }

        await logAdminAction({
            adminId: req.admin.admin_id,
            ip: req.ip,
            action: "CONNECTION_CANCEL",
            targetType: "connection",
            targetId: id,
            details: { reason, previous_status: c.status }
        });

        res.json({ success: true, message: "Connection cancelled. Both users were notified." });
    } catch (error) {
        console.error("❌ Admin connection cancel error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { list, detail, cancel };