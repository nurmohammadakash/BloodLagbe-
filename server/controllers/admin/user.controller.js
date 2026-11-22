const db = require("../../config/db");
const { sendEmail } = require("../../services/email.service");
const { logAdminAction } = require("../../utils/audit");
const { brandEmail } = require("../../utils/emailTemplate");

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const n = (v) => Number(v || 0);

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ROLES = ["Donor", "Recipient", "Both"];
const STATUS_TABS = { all: null, active: "Active", pending: "Pending", suspended: "Suspended", blocked: "Blocked" };

const RULES = {
    Active: {
        audit: "USER_ACTIVATE", needsReason: false, done: "User activated.",
        mail: () => ({
            subject: "Your Blood-Lagbe account is active",
            heading: "Account active ✅",
            paragraphs: ["Your Blood-Lagbe account is active. You can sign in and use the platform again."]
        })
    },
    Suspended: {
        audit: "USER_SUSPEND", needsReason: true, done: "User suspended.",
        mail: () => ({
            subject: "Your Blood-Lagbe account has been suspended",
            heading: "Account suspended",
            paragraphs: ["Your account has been suspended by the Blood-Lagbe team. You will not be able to sign in until it is reviewed."]
        })
    },
    Blocked: {
        audit: "USER_BLOCK", needsReason: true, done: "User blocked.",
        mail: () => ({
            subject: "Your Blood-Lagbe account has been blocked",
            heading: "Account blocked",
            paragraphs: ["Your account has been blocked because it violated the Blood-Lagbe community guidelines."]
        })
    }
};

const safeCount = async (sql, params) => {
    try {
        const [[row]] = await db.query(sql, params);
        return n(row.c);
    } catch {
        return 0;   // table might not exist in every setup
    }
};

const list = async (req, res) => {
    try {
        const statusKey = has(STATUS_TABS, req.query.status) ? req.query.status : "all";
        const search = String(req.query.search || "").trim();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        const where = ["1=1"];
        const params = [];

        if (STATUS_TABS[statusKey]) {
            where.push("account_status = ?");
            params.push(STATUS_TABS[statusKey]);
        }
        if (ROLES.includes(req.query.role)) {
            where.push("role = ?");
            params.push(req.query.role);
        }
        if (GROUPS.includes(req.query.blood_group)) {
            where.push("blood_group = ?");
            params.push(req.query.blood_group);
        }
        if (search) {
            const like = `%${search}%`;
            where.push("(full_name LIKE ? OR username LIKE ? OR email LIKE ? OR phone LIKE ? OR district LIKE ?)");
            params.push(like, like, like, like, like);
        }
        const whereSql = where.join(" AND ");

        const [[totalRow]] = await db.query(`SELECT COUNT(*) total FROM user WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT user_id, full_name, username, email, phone, blood_group, role, division, district,
                    account_status, email_verified, last_login, created_at
             FROM user WHERE ${whereSql}
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );
        const [[c]] = await db.query(`
            SELECT COUNT(*) all_count,
                   SUM(account_status = 'Active') active,
                   SUM(account_status = 'Pending') pending,
                   SUM(account_status = 'Suspended') suspended,
                   SUM(account_status = 'Blocked') blocked
            FROM user`);

        const total = n(totalRow.total);
        res.json({
            success: true,
            items,
            counts: {
                all: n(c.all_count), active: n(c.active), pending: n(c.pending),
                suspended: n(c.suspended), blocked: n(c.blocked)
            },
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Admin user list error:", error);
        res.status(500).json({ success: false, message: "Could not load users." });
    }
};

const detail = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ success: false, message: "Invalid user id." });

        const [[user]] = await db.query(
            `SELECT user_id, full_name, username, email, phone, gender,
                    DATE_FORMAT(date_of_birth, '%d %b %Y') AS dob,
                    blood_group, role, eligibility_status,
                    DATE_FORMAT(next_eligible_date, '%d %b %Y') AS next_eligible,
                    trust_score, division, district, upazila, postal_code, address,
                    email_verified, account_status, status_reason, last_login, created_at
             FROM user WHERE user_id = ?`,
            [id]
        );
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

                const [donations, requests, posts] = await Promise.all([
            safeCount(
                `SELECT (SELECT COUNT(*) FROM donation WHERE donor_id = ? AND status = 'Completed')
                      + (SELECT COUNT(*) FROM blood_exchange WHERE donor_id = ? AND status = 'Confirmed') AS c`,
                [id, id]
            ),
            safeCount("SELECT COUNT(*) c FROM blood_request WHERE requester_id = ?", [id]),
            safeCount("SELECT COUNT(*) c FROM feed_post WHERE author_type = 'user' AND author_id = ?", [id])
        ]);

        res.json({ success: true, user, stats: { donations, requests, posts } });
    } catch (error) {
        console.error("❌ Admin user detail error:", error);
        res.status(500).json({ success: false, message: "Could not load user details." });
    }
};

const changeStatus = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const status = String(req.body.status || "");
        const reason = String(req.body.reason || "").trim().slice(0, 250);

        if (!id || !has(RULES, status)) {
            return res.status(400).json({ success: false, message: "Invalid request." });
        }
        const rule = RULES[status];

        if (rule.needsReason && reason.length < 3) {
            return res.status(400).json({ success: false, message: "A reason is required for this action." });
        }

        const [[user]] = await db.query(
            "SELECT user_id, full_name, email, account_status FROM user WHERE user_id = ?",
            [id]
        );
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        if (user.account_status === status) {
            return res.status(409).json({ success: false, message: `User is already ${status}.` });
        }
        if (user.account_status === "Pending" && status === "Active") {
            return res.status(400).json({ success: false, message: "This user has not verified their email yet." });
        }

        await db.query(
            "UPDATE user SET account_status = ?, status_reason = ? WHERE user_id = ?",
            [status, rule.needsReason ? reason : null, id]
        );

        await logAdminAction({
            adminId: req.admin.admin_id,
            ip: req.ip,
            action: rule.audit,
            targetType: "user",
            targetId: id,
            details: { name: user.full_name, from: user.account_status, to: status, reason: rule.needsReason ? reason : undefined }
        });

        let emailSent = false;
        try {
            const mail = rule.mail();
            await sendEmail(
                user.email,
                mail.subject,
                brandEmail({ heading: mail.heading, name: user.full_name, paragraphs: mail.paragraphs, reason: rule.needsReason ? reason : null })
            );
            emailSent = true;
        } catch (mailError) {
            console.error("❌ Admin status email failed:", mailError.message);
        }

        res.json({ success: true, message: rule.done, status, emailSent });
    } catch (error) {
        console.error("❌ Admin user status error:", error);
        res.status(500).json({ success: false, message: "Could not update user." });
    }
};

module.exports = { list, detail, changeStatus };