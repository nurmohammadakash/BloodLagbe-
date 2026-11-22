const db = require("../../config/db");
const inventory = require("../../services/inventory.service");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DEFAULT_LOW = 5;
const DEFAULT_CRITICAL = 2;
const DEFAULT_EXPIRY_DAYS = 7;

const stockLevel = (units, low, critical) => {
    if (units <= 0) return "Out";
    if (units <= critical) return "Critical";
    if (units <= low) return "Low";
    return "Good";
};

const me = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT bloodbank_id, name, license_number, email, phone, division, district, upazila, postal_code,
                    address, latitude, longitude, status, DATE_FORMAT(created_at, '%d %b %Y') AS member_since
             FROM blood_bank WHERE bloodbank_id = ?`,
            [req.actor.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: "Account not found." });
        res.json({ success: true, bank: rows[0] });
    } catch (error) {
        console.error("bank me error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const overview = async (req, res) => {
    try {
        const id = req.actor.id;
        await inventory.expireStale(id);

        const [cfg] = await db.execute(
            "SELECT low_stock_threshold, critical_stock_threshold, expiry_warning_days FROM bank_settings WHERE bloodbank_id = ?",
            [id]
        );
        const LOW_STOCK = cfg.length ? cfg[0].low_stock_threshold : DEFAULT_LOW;
        const CRITICAL_STOCK = cfg.length ? cfg[0].critical_stock_threshold : DEFAULT_CRITICAL;
        const EXPIRY_WARNING_DAYS = cfg.length ? cfg[0].expiry_warning_days : DEFAULT_EXPIRY_DAYS;

        const [stockRows] = await db.execute(
            "SELECT blood_group, unit_count FROM blood_inventory WHERE bloodbank_id = ?",
            [id]
        );
        const units = Object.fromEntries(stockRows.map((r) => [r.blood_group, Number(r.unit_count)]));
        const stock = BLOOD_GROUPS.map((g) => ({
            blood_group: g,
            units: units[g] || 0,
            level: stockLevel(units[g] || 0, LOW_STOCK, CRITICAL_STOCK)
        }));

        const [[req1]] = await db.execute(
            `SELECT SUM(status = 'Pending') AS pending,
                    SUM(status = 'Pending' AND urgency_level = 'Critical') AS critical,
                    SUM(status = 'Accepted') AS accepted
             FROM blood_request WHERE bloodbank_id = ?`,
            [id]
        );
        const [[don]] = await db.execute(
            `SELECT COUNT(*) AS c FROM donation
             WHERE bloodbank_id = ? AND status = 'Completed'
               AND donation_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
            [id]
        );
        const [expiring] = await db.execute(
            `SELECT batch_id, blood_group, units_left,
                    DATE_FORMAT(expires_on, '%d %b %Y') AS expires_on,
                    DATEDIFF(expires_on, CURDATE()) AS days_left
             FROM blood_batch
             WHERE bloodbank_id = ? AND status = 'Available' AND units_left > 0
               AND expires_on <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
             ORDER BY expires_on ASC, batch_id ASC LIMIT 8`,
            [id, EXPIRY_WARNING_DAYS]
        );
        const [recent] = await db.execute(
            `SELECT request_id, blood_group, units_required, urgency_level, patient_name, hospital_name, status,
                    DATE_FORMAT(created_at, '%d %b') AS created_on
             FROM blood_request WHERE bloodbank_id = ?
             ORDER BY created_at DESC, request_id DESC LIMIT 5`,
            [id]
        );

        res.json({
            success: true,
            thresholds: { low: LOW_STOCK, critical: CRITICAL_STOCK, expiryDays: EXPIRY_WARNING_DAYS },
            kpis: {
                totalUnits: stock.reduce((s, x) => s + x.units, 0),
                attentionGroups: stock.filter((x) => x.level !== "Good").length,
                pendingRequests: Number(req1.pending) || 0,
                criticalRequests: Number(req1.critical) || 0,
                inProgressRequests: Number(req1.accepted) || 0,
                donationsThisMonth: Number(don.c) || 0,
                expiringUnits: expiring.reduce((s, x) => s + Number(x.units_left), 0)
            },
            stock,
            expiring,
            recentRequests: recent
        });
    } catch (error) {
        console.error("bank overview error:", error);
        res.status(500).json({ success: false, message: "Could not load the dashboard." });
    }
};

module.exports = { me, overview };