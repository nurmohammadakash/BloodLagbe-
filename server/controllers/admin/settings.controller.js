const bcrypt = require("bcrypt");
const db = require("../../config/db");
const { logAdminAction } = require("../../utils/audit");

const changePassword = async (req, res) => {
    try {
        const current = String(req.body.currentPassword || "");
        const next = String(req.body.newPassword || "");

        if (!current || !next) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }
        if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
            return res.status(400).json({ success: false, message: "New password must be at least 8 characters and include a letter and a number." });
        }
        if (next === current) {
            return res.status(400).json({ success: false, message: "New password must be different from the current one." });
        }

        const [rows] = await db.execute("SELECT password FROM admin WHERE admin_id = ?", [req.admin.admin_id]);
        if (!rows.length || !(await bcrypt.compare(current, rows[0].password))) {
            return res.status(400).json({ success: false, message: "Current password is incorrect." });
        }

        const hash = await bcrypt.hash(next, 10);
        await db.execute("UPDATE admin SET password = ? WHERE admin_id = ?", [hash, req.admin.admin_id]);

        await logAdminAction({
            adminId: req.admin.admin_id,
            ip: req.ip,
            action: "PASSWORD_CHANGE",
            targetType: "admin",
            targetId: req.admin.admin_id
        });

        return res.json({ success: true, message: "Password changed successfully." });
    } catch (error) {
        console.error("❌ Admin change password error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { changePassword };