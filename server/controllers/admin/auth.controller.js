const bcrypt = require("bcrypt");
const db = require("../../config/db");
const { signAdminToken } = require("../../middleware/admin.middleware");
const { logAdminAction } = require("../../utils/audit");

const publicAdmin = (a) => ({
    admin_id: a.admin_id,
    username: a.username,
    email: a.email,
    role_level: a.role_level
});

const login = async (req, res) => {
    try {
        const loginValue = String(req.body.login || "").trim();
        const password = String(req.body.password || "");

        if (!loginValue || !password) {
            return res.status(400).json({ success: false, message: "Login and password are required." });
        }

        const [rows] = await db.execute(
            "SELECT * FROM admin WHERE username = ? OR email = ? LIMIT 1",
            [loginValue, loginValue]
        );
        const admin = rows[0];
        const ok = admin && (await bcrypt.compare(password, admin.password));

        if (!ok) {
            await logAdminAction({
                adminId: admin ? admin.admin_id : null,
                ip: req.ip,
                action: "LOGIN_FAILED",
                details: { login: loginValue }
            });
            return res.status(401).json({ success: false, message: "Invalid username/email or password." });
        }

        if (admin.status !== "Active") {
            return res.status(403).json({ success: false, message: "This admin account is suspended." });
        }

        await db.execute("UPDATE admin SET last_login = NOW() WHERE admin_id = ?", [admin.admin_id]);
        await logAdminAction({ adminId: admin.admin_id, ip: req.ip, action: "LOGIN" });

        return res.json({
            success: true,
            message: "Login successful.",
            token: signAdminToken(admin),
            admin: publicAdmin(admin)
        });
    } catch (error) {
        console.error("❌ Admin login error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

const me = (req, res) => res.json({ success: true, admin: publicAdmin(req.admin) });

const logout = async (req, res) => {
    await logAdminAction({ adminId: req.admin.admin_id, ip: req.ip, action: "LOGOUT" });
    res.json({ success: true });
};

module.exports = { login, me, logout };