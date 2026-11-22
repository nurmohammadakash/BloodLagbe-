const db = require("../../config/db");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

        const where = ["1=1"];
        const params = [];

        const action = String(req.query.action || "").trim().slice(0, 80);
        if (action) { where.push("l.action = ?"); params.push(action); }

        const adminId = parseInt(req.query.admin_id, 10);
        if (adminId) { where.push("l.admin_id = ?"); params.push(adminId); }

        const search = String(req.query.search || "").trim().slice(0, 100);
        if (search) {
            const like = `%${search}%`;
            where.push("(l.details LIKE ? OR l.target_id LIKE ? OR l.target_type LIKE ? OR l.ip_address LIKE ?)");
            params.push(like, like, like, like);
        }

        const from = String(req.query.from || "");
        const to = String(req.query.to || "");
        if (DATE_RE.test(from)) { where.push("l.created_at >= ?"); params.push(`${from} 00:00:00`); }
        if (DATE_RE.test(to)) { where.push("l.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(`${to} 00:00:00`); }

        const whereSql = where.join(" AND ");

        const [[totalRow]] = await db.query(`SELECT COUNT(*) total FROM admin_audit_log l WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT l.log_id, l.action, l.target_type, l.target_id, l.details, l.ip_address, l.created_at,
                    a.username AS admin_name, a.role_level
             FROM admin_audit_log l
             LEFT JOIN admin a ON a.admin_id = l.admin_id
             WHERE ${whereSql}
             ORDER BY l.log_id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );
        const [actionRows] = await db.query("SELECT DISTINCT action FROM admin_audit_log ORDER BY action");
        const [admins] = await db.query("SELECT admin_id, username FROM admin ORDER BY username");

        const total = Number(totalRow.total || 0);
        res.json({
            success: true,
            items,
            actions: actionRows.map((r) => r.action),
            admins,
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Admin audit list error:", error);
        res.status(500).json({ success: false, message: "Could not load the audit log." });
    }
};

module.exports = { list };