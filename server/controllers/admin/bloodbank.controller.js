const db = require("../../config/db");
const { sendEmail } = require("../../services/email.service");
const { logAdminAction } = require("../../utils/audit");
const { brandEmail } = require("../../utils/emailTemplate");

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const n = (v) => Number(v || 0);

const FILTERS = {
    all: "1=1",
    pending: "status = 'Pending' AND email_verified = 1",
    unverified: "status = 'Pending' AND email_verified = 0",
    approved: "status = 'Approved'",
    rejected: "status = 'Rejected'",
    inactive: "status = 'Inactive'"
};

const ACTIONS = {
    approve: {
        from: ["Pending", "Rejected"], to: "Approved", needsReason: false,
        done: "Blood bank approved.",
        mail: () => ({
            subject: "Your Blood-Lagbe blood bank has been approved",
            heading: "Registration approved ✅",
            paragraphs: ["Great news! Your blood bank registration has been approved. You can now sign in with your username and password and start managing your blood stock."]
        })
    },
    reject: {
        from: ["Pending"], to: "Rejected", needsReason: true,
        done: "Registration rejected.",
        mail: () => ({
            subject: "Update on your Blood-Lagbe registration",
            heading: "Registration not approved",
            paragraphs: ["Unfortunately we could not approve your blood bank registration at this time."]
        })
    },
    suspend: {
        from: ["Approved"], to: "Inactive", needsReason: true,
        done: "Blood bank suspended.",
        mail: () => ({
            subject: "Your Blood-Lagbe blood bank account has been suspended",
            heading: "Account suspended",
            paragraphs: ["Your blood bank account has been suspended by the Blood-Lagbe team. You will not be able to sign in until it is reviewed."]
        })
    },
    reactivate: {
        from: ["Inactive"], to: "Approved", needsReason: false,
        done: "Blood bank reactivated.",
        mail: () => ({
            subject: "Your Blood-Lagbe blood bank account is active again",
            heading: "Account reactivated ✅",
            paragraphs: ["Your blood bank account has been reactivated. You can sign in again."]
        })
    }
};

const list = async (req, res) => {
    try {
        const status = has(FILTERS, req.query.status) ? req.query.status : "all";
        const search = String(req.query.search || "").trim();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        const where = [FILTERS[status]];
        const params = [];

        if (search) {
            const like = `%${search}%`;
            where.push("(name LIKE ? OR email LIKE ? OR license_number LIKE ? OR username LIKE ? OR district LIKE ? OR phone LIKE ?)");
            params.push(like, like, like, like, like, like);
        }
        const whereSql = where.join(" AND ");

        const [[totalRow]] = await db.query(`SELECT COUNT(*) total FROM blood_bank WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT bloodbank_id, name, username, license_number, email, phone, division, district, upazila,
                    email_verified, status, status_reason, created_at
             FROM blood_bank WHERE ${whereSql}
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );
        const [[c]] = await db.query(`
            SELECT COUNT(*) all_count,
                   SUM(status = 'Pending' AND email_verified = 1) pending,
                   SUM(status = 'Pending' AND email_verified = 0) unverified,
                   SUM(status = 'Approved') approved,
                   SUM(status = 'Rejected') rejected,
                   SUM(status = 'Inactive') inactive
            FROM blood_bank`);

        const total = n(totalRow.total);
        res.json({
            success: true,
            items,
            counts: {
                all: n(c.all_count), pending: n(c.pending), unverified: n(c.unverified),
                approved: n(c.approved), rejected: n(c.rejected), inactive: n(c.inactive)
            },
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Admin bloodbank list error:", error);
        res.status(500).json({ success: false, message: "Could not load blood banks." });
    }
};

const detail = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ success: false, message: "Invalid blood bank id." });

        const [[bank]] = await db.query(
            `SELECT b.bloodbank_id, b.name, b.username, b.license_number, b.email, b.phone,
                    b.division, b.district, b.upazila, b.postal_code, b.address,
                    b.latitude, b.longitude, b.email_verified, b.status, b.status_reason,
                    b.reviewed_at, b.created_at, a.username AS reviewed_by_name
             FROM blood_bank b
             LEFT JOIN admin a ON a.admin_id = b.reviewed_by
             WHERE b.bloodbank_id = ?`,
            [id]
        );
        if (!bank) return res.status(404).json({ success: false, message: "Blood bank not found." });

        const [[inventory], [[don]], [[camp]], [[reqs]]] = await Promise.all([
            db.query("SELECT blood_group, unit_count FROM blood_inventory WHERE bloodbank_id = ?", [id]),
            db.query("SELECT COUNT(*) c FROM donation WHERE bloodbank_id = ? AND status = 'Completed'", [id]),
            db.query("SELECT COUNT(*) c FROM camp WHERE bloodbank_id = ?", [id]),
            db.query("SELECT COUNT(*) c FROM blood_request WHERE bloodbank_id = ?", [id])
        ]);

        res.json({
            success: true,
            bank,
            inventory,
            stats: { donations: n(don.c), camps: n(camp.c), requests: n(reqs.c) }
        });
    } catch (error) {
        console.error("❌ Admin bloodbank detail error:", error);
        res.status(500).json({ success: false, message: "Could not load blood bank details." });
    }
};

const changeStatus = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const action = String(req.body.action || "");
        const reason = String(req.body.reason || "").trim().slice(0, 250);

        if (!id || !has(ACTIONS, action)) {
            return res.status(400).json({ success: false, message: "Invalid request." });
        }
        const rule = ACTIONS[action];

        if (rule.needsReason && reason.length < 3) {
            return res.status(400).json({ success: false, message: "A reason is required for this action." });
        }

        const [[bank]] = await db.query(
            "SELECT bloodbank_id, name, email, status, email_verified FROM blood_bank WHERE bloodbank_id = ?",
            [id]
        );
        if (!bank) return res.status(404).json({ success: false, message: "Blood bank not found." });

        if (!rule.from.includes(bank.status)) {
            return res.status(409).json({ success: false, message: `Cannot ${action} a blood bank that is ${bank.status}.` });
        }
        if (action === "approve" && !bank.email_verified) {
            return res.status(400).json({ success: false, message: "This blood bank has not verified its email yet." });
        }

        await db.query(
            "UPDATE blood_bank SET status = ?, status_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE bloodbank_id = ?",
            [rule.to, rule.needsReason ? reason : null, req.admin.admin_id, id]
        );

        await logAdminAction({
            adminId: req.admin.admin_id,
            ip: req.ip,
            action: `BLOODBANK_${action.toUpperCase()}`,
            targetType: "blood_bank",
            targetId: id,
            details: { name: bank.name, from: bank.status, to: rule.to, reason: rule.needsReason ? reason : undefined }
        });

        // Email is best-effort: the action succeeds even if the email fails
        let emailSent = false;
        try {
            const mail = rule.mail();
            await sendEmail(
                bank.email,
                mail.subject,
                brandEmail({ heading: mail.heading, name: bank.name, paragraphs: mail.paragraphs, reason: rule.needsReason ? reason : null })
            );
            emailSent = true;
        } catch (mailError) {
            console.error("❌ Admin status email failed:", mailError.message);
        }

        res.json({ success: true, message: rule.done, status: rule.to, emailSent });
    } catch (error) {
        console.error("❌ Admin bloodbank status error:", error);
        res.status(500).json({ success: false, message: "Could not update blood bank." });
    }
};

module.exports = { list, detail, changeStatus };