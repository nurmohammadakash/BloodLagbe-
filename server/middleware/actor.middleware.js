const authMiddleware = require("./auth.middleware");
const db = require("../config/db");

const setActor = (req, res, next) => {
    const t = req.user || {};
    const id = Number(t.account_id || t.user_id);

    if (!id) {
        return res.status(401).json({ success: false, message: "Invalid token." });
    }

    req.actor = {
        type: t.account_type === "bloodbank" ? "bloodbank" : "user",
        id
    };
    next();
};

// Re-checks the database so suspended/blocked accounts are locked out immediately
const ensureActive = async (req, res, next) => {
    try {
        const isBank = req.actor.type === "bloodbank";
        const [rows] = await db.query(
            isBank
                ? "SELECT status AS s FROM blood_bank WHERE bloodbank_id = ?"
                : "SELECT account_status AS s FROM user WHERE user_id = ?",
            [req.actor.id]
        );

        const ok = rows.length && (isBank ? rows[0].s === "Approved" : rows[0].s === "Active");
        if (!ok) {
            return res.status(403).json({ success: false, message: "Your account is not active." });
        }
        next();
    } catch (error) {
        console.error("❌ Account status check error:", error.message);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

const requireUser = (req, res, next) => {
    if (req.actor.type !== "user") {
        return res.status(403).json({ success: false, message: "This action is only for user accounts." });
    }
    next();
};

module.exports = {
    requireAuth: [authMiddleware, setActor, ensureActive],
    requireUser
};