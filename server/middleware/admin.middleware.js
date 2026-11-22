const jwt = require("jsonwebtoken");
const db = require("../config/db");

const getSecret = () => {
    const secret =
        process.env.ADMIN_JWT_SECRET ||
        (process.env.JWT_SECRET && `${process.env.JWT_SECRET}_admin`);
    if (!secret) throw new Error("JWT_SECRET (or ADMIN_JWT_SECRET) is missing in .env");
    return secret;
};

const signAdminToken = (admin) =>
    jwt.sign(
        { admin_id: admin.admin_id, account_type: "admin", role_level: admin.role_level },
        getSecret(),
        { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "12h" }
    );

const requireAdmin = async (req, res, next) => {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({ success: false, message: "Admin authentication required." });
        }

        const decoded = jwt.verify(token, getSecret());
        if (decoded.account_type !== "admin") {
            return res.status(403).json({ success: false, message: "Admin access only." });
        }

        // Re-check the database on every request so a suspended admin is locked out immediately
        const [rows] = await db.execute(
            "SELECT admin_id, username, email, role_level, status, last_login FROM admin WHERE admin_id = ?",
            [decoded.admin_id]
        );

        if (!rows.length || rows[0].status !== "Active") {
            return res.status(401).json({ success: false, message: "Admin account is not active." });
        }

        req.admin = rows[0];
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired admin session." });
    }
};

// Super Admin always passes; others must be in the allowed list
const requireRole = (...roles) => (req, res, next) => {
    if (req.admin.role_level === "Super Admin" || roles.includes(req.admin.role_level)) {
        return next();
    }
    return res.status(403).json({ success: false, message: "You do not have permission for this action." });
};

module.exports = { signAdminToken, requireAdmin, requireRole };