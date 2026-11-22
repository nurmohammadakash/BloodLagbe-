const db = require("../../config/db");
const { sendEmail } = require("../../services/email.service");
const { getIO } = require("../../socket");
const { logAdminAction } = require("../../utils/audit");
const { brandEmail } = require("../../utils/emailTemplate");

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const TARGETS = ["everyone", "users", "bloodbanks"];
const MAX_EMAIL_RECIPIENTS = 300;   // protects your mail account from provider daily limits

const n = (v) => Number(v || 0);
const clean = (v, max) => String(v || "").trim().slice(0, max);
// Notification table might not be utf8mb4, so strip emoji from stored notification text
const bmp = (s) => s.replace(/[\u{10000}-\u{10FFFF}]/gu, "");

const normalize = (b = {}) => {
    const target = TARGETS.includes(b.target) ? b.target : null;
    const link = clean(b.link, 255);
    return {
        target,
        blood_group: target === "users" && GROUPS.includes(b.blood_group) ? b.blood_group : null,
        donors_only: target === "users" && !!b.donors_only,
        division: clean(b.division, 60) || null,
        district: clean(b.district, 60) || null,
        send_email: !!b.send_email,
        link: /^\/[A-Za-z0-9\-_/?=&.#]*$/.test(link) ? link : null
    };
};

const filters = (a) => {
    const uw = ["account_status = 'Active'"], up = [];
    const bw = ["status = 'Approved'"], bp = [];

    if (a.blood_group) { uw.push("blood_group = ?"); up.push(a.blood_group); }
    if (a.donors_only) uw.push("role IN ('Donor','Both')");
    if (a.division) { uw.push("division = ?"); up.push(a.division); bw.push("division = ?"); bp.push(a.division); }
    if (a.district) { uw.push("district = ?"); up.push(a.district); bw.push("district = ?"); bp.push(a.district); }

    return { uw: uw.join(" AND "), up, bw: bw.join(" AND "), bp };
};

const countAudience = async (a) => {
    const f = filters(a);
    let users = 0, bloodbanks = 0;
    if (a.target !== "bloodbanks") {
        const [[r]] = await db.query(`SELECT COUNT(*) c FROM user WHERE ${f.uw}`, f.up);
        users = n(r.c);
    }
    if (a.target !== "users") {
        const [[r]] = await db.query(`SELECT COUNT(*) c FROM blood_bank WHERE ${f.bw}`, f.bp);
        bloodbanks = n(r.c);
    }
    return { users, bloodbanks, total: users + bloodbanks };
};

const loadAudience = async (a) => {
    const f = filters(a);
    const out = [];
    if (a.target !== "bloodbanks") {
        const [rows] = await db.query(`SELECT user_id AS id, full_name AS name, email FROM user WHERE ${f.uw}`, f.up);
        rows.forEach((r) => out.push({ type: "user", ...r }));
    }
    if (a.target !== "users") {
        const [rows] = await db.query(`SELECT bloodbank_id AS id, name, email FROM blood_bank WHERE ${f.bw}`, f.bp);
        rows.forEach((r) => out.push({ type: "bloodbank", ...r }));
    }
    return out;
};

const sendEmailsInBackground = async (announcementId, audience, title, message) => {
    let sent = 0, failed = 0;
    for (let i = 0; i < audience.length; i += 5) {
        const chunk = audience.slice(i, i + 5);
        const results = await Promise.allSettled(
            chunk.map((r) =>
                sendEmail(r.email, title, brandEmail({ heading: title, name: r.name, paragraphs: [message] }))
            )
        );
        results.forEach((x) => (x.status === "fulfilled" ? sent++ : failed++));
        await db.query("UPDATE announcement SET emails_sent = ?, emails_failed = ? WHERE announcement_id = ?", [sent, failed, announcementId]);
    }
};

const options = async (req, res) => {
    try {
        const [locations] = await db.query(
            `SELECT DISTINCT division, district FROM user WHERE division IS NOT NULL AND district IS NOT NULL
             UNION
             SELECT DISTINCT division, district FROM blood_bank WHERE division IS NOT NULL AND district IS NOT NULL
             ORDER BY division, district`
        );
        res.json({ success: true, locations, maxEmailRecipients: MAX_EMAIL_RECIPIENTS });
    } catch (error) {
        console.error("❌ Announcement options error:", error);
        res.status(500).json({ success: false, message: "Could not load options." });
    }
};

const preview = async (req, res) => {
    try {
        const a = normalize(req.body);
        if (!a.target) return res.status(400).json({ success: false, message: "Choose an audience." });
        res.json({ success: true, ...(await countAudience(a)) });
    } catch (error) {
        console.error("❌ Announcement preview error:", error);
        res.status(500).json({ success: false, message: "Could not count recipients." });
    }
};

const create = async (req, res) => {
    try {
        const a = normalize(req.body);
        const title = clean(req.body.title, 120);
        const message = clean(req.body.message, 500);

        if (!a.target) return res.status(400).json({ success: false, message: "Choose an audience." });
        if (title.length < 3 || message.length < 3) {
            return res.status(400).json({ success: false, message: "A title and a message are required." });
        }

        const reach = await countAudience(a);
        if (!reach.total) {
            return res.status(400).json({ success: false, message: "No one matches this audience." });
        }
        if (a.send_email && reach.total > MAX_EMAIL_RECIPIENTS) {
            return res.status(400).json({
                success: false,
                message: `Emails are limited to ${MAX_EMAIL_RECIPIENTS} recipients per announcement. Narrow the audience or send in-app only.`
            });
        }

        const [ins] = await db.query(
            `INSERT INTO announcement
             (title, message, audience, blood_group, division, district, donors_only, send_email, link, recipients, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, message, a.target, a.blood_group, a.division, a.district, a.donors_only ? 1 : 0,
             a.send_email ? 1 : 0, a.link, reach.total, req.admin.admin_id]
        );
        const id = ins.insertId;

        const audience = await loadAudience(a);
        const text = bmp(`${title}: ${message}`).slice(0, 255);
        const rows = audience.map((r) => [
            r.type, r.id, null, null, "announcement", text,
            a.link || (r.type === "bloodbank" ? "/bloodbank/dashboard" : "/dashboard")
        ]);

        for (let i = 0; i < rows.length; i += 500) {
            await db.query(
                `INSERT INTO app_notification (recipient_type, recipient_id, actor_type, actor_id, type, message, link)
                 VALUES ?`,
                [rows.slice(i, i + 500)]
            );
        }

        const io = getIO();
        if (io) {
            audience.forEach((r) =>
                io.to(`${r.type}:${r.id}`).emit("notification", {
                    type: "announcement", message: text, link: a.link, is_read: 0, created_at: new Date()
                })
            );
        }

        await logAdminAction({
            adminId: req.admin.admin_id, ip: req.ip, action: "ANNOUNCEMENT_SEND",
            targetType: "announcement", targetId: id,
            details: { title, audience: a.target, blood_group: a.blood_group, division: a.division,
                       district: a.district, recipients: reach.total, email: a.send_email }
        });

        res.status(201).json({
            success: true,
            message: `Announcement sent to ${reach.total} recipient(s).${a.send_email ? " Emails are being sent in the background." : ""}`,
            recipients: reach.total
        });

        if (a.send_email) {
            sendEmailsInBackground(id, audience, title, message).catch((err) =>
                console.error("❌ Announcement email batch failed:", err.message)
            );
        }
    } catch (error) {
        console.error("❌ Announcement create error:", error);
        if (!res.headersSent) res.status(500).json({ success: false, message: "Could not send the announcement." });
    }
};

const list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 8));

        const [[totalRow]] = await db.query("SELECT COUNT(*) total FROM announcement");
        const [items] = await db.query(
            `SELECT a.announcement_id, a.title, a.message, a.audience, a.blood_group, a.division, a.district,
                    a.donors_only, a.send_email, a.recipients, a.emails_sent, a.emails_failed, a.created_at,
                    adm.username AS created_by_name,
                    (a.send_email = 1 AND a.emails_sent + a.emails_failed < a.recipients
                        AND a.created_at > NOW() - INTERVAL 30 MINUTE) AS sending
             FROM announcement a
             LEFT JOIN admin adm ON adm.admin_id = a.created_by
             ORDER BY a.announcement_id DESC
             LIMIT ? OFFSET ?`,
            [limit, (page - 1) * limit]
        );

        const total = n(totalRow.total);
        res.json({
            success: true,
            items,
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Announcement list error:", error);
        res.status(500).json({ success: false, message: "Could not load announcements." });
    }
};

module.exports = { options, preview, create, list };