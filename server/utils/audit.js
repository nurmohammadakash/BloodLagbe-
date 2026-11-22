const db = require("../config/db");

const logAdminAction = async ({ adminId = null, ip = null, action, targetType = null, targetId = null, details = null }) => {
    try {
        await db.execute(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                adminId,
                action,
                targetType,
                targetId == null ? null : String(targetId),
                details ? JSON.stringify(details) : null,
                ip
            ]
        );
    } catch (error) {
        console.error("❌ Audit log error:", error.message);
    }
};

module.exports = { logAdminAction };