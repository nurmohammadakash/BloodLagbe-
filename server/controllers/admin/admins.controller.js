const bcrypt = require("bcrypt");
const db = require("../../config/db");
const { logAdminAction } = require("../../utils/audit");

const ROLES = ["Super Admin", "Admin", "Moderator", "Support"];
const STATUSES = ["Active", "Suspended"];

const getTarget = async (id) => {
    const [rows] = await db.execute(
        "SELECT admin_id, username, role_level, status FROM admin WHERE admin_id = ?",
        [id]
    );
    return rows[0];
};

const list = async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT admin_id, username, email, role_level, status, last_login, created_at
             FROM admin
             ORDER BY FIELD(role_level, 'Super Admin', 'Admin', 'Moderator', 'Support'), username`
        );
        res.json({ success: true, items, me: req.admin.admin_id });
    } catch (error) {
        console.error("❌ Admin list error:", error);
        res.status(500).json({ success: false, message: "Could not load admin accounts." });
    }
};

const create = async (req, res) => {
    try {
        const username = String(req.body.username || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const role = String(req.body.role_level || "");

        if (!/^[A-Za-z0-9_.]{3,30}$/.test(username)) {
            return res.status(400).json({ success: false, message: "Username must be 3-30 characters: letters, numbers, dot or underscore." });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: "Enter a valid email address." });
        }
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include a letter and a number." });
        }
        if (!ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: "Choose a valid role." });
        }

        const [dup] = await db.execute(
            "SELECT admin_id FROM admin WHERE username = ? OR email = ? LIMIT 1",
            [username, email]
        );
        if (dup.length) {
            return res.status(409).json({ success: false, message: "That username or email is already used by another admin." });
        }

        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            "INSERT INTO admin (username, email, password, role_level) VALUES (?, ?, ?, ?)",
            [username, email, hash, role]
        );

        await logAdminAction({
            adminId: req.admin.admin_id,
            ip: req.ip,
            action: "ADMIN_CREATE",
            targetType: "admin",
            targetId: result.insertId,
            details: { username, role }
        });

        res.json({ success: true, message: `Admin "${username}" created.` });
    } catch (error) {
        console.error("❌ Admin create error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const changeRole = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const role = String(req.body.role_level || "");

        if (id === req.admin.admin_id) {
            return res.status(400).json({ success: false, message: "You cannot change your own role." });
        }
        if (!ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: "Choose a valid role." });
        }

        const target = await getTarget(id);
        if (!target) return res.status(404).json({ success: false, message: "Admin not found." });
        if (target.role_level === role) {
            return res.status(400).json({ success: false, message: `Already a ${role}.` });
        }

        await db.execute("UPDATE admin SET role_level = ? WHERE admin_id = ?", [role, id]);

        await logAdminAction({
            adminId: req.admin.admin_id,
            ip: req.ip,
            action: "ADMIN_ROLE_CHANGE",
            targetType: "admin",
            targetId: id,
            details: { username: target.username, from: target.role_level, to: role }
        });

        res.json({ success: true, message: `${target.username} is now ${role}.` });
    } catch (error) {
        console.error("❌ Admin role error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const changeStatus = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const status = String(req.body.status || "");

        if (id === req.admin.admin_id) {
            return res.status(400).json({ success: false, message: "You cannot suspend your own account." });
        }
        if (!STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status." });
        }

        const target = await getTarget(id);
        if (!target) return res.status(404).json({ success: false, message: "Admin not found." });
        if (target.status === status) {
            return res.status(400).json({ success: false, message: `Already ${status.toLowerCase()}.` });
        }

        await db.execute("UPDATE admin SET status = ? WHERE admin_id = ?", [status, id]);

        await logAdminAction({
            adminId: req.admin.admin_id,
            ip: req.ip,
            action: status === "Suspended" ? "ADMIN_SUSPEND" : "ADMIN_ACTIVATE",
            targetType: "admin",
            targetId: id,
            details: { username: target.username }
        });

        res.json({ success: true, message: `${target.username} is now ${status.toLowerCase()}.` });
    } catch (error) {
        console.error("❌ Admin status error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { list, create, changeRole, changeStatus };