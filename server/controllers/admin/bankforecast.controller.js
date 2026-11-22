// AI forecast data: the 8 numbers the TensorFlow Lite model needs, for every approved
// blood bank x blood group. The model itself runs in the admin's browser.
const db = require("../../config/db");

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DEFAULT_LOW = 5;
const n = (v) => Number(v || 0);
const r1 = (v) => Math.round(v * 100) / 100;

// Free units only: not expired, not reserved
const FREE = "status = 'Available' AND units_left > 0 AND expires_on >= CURDATE()";

// Units that blood banks still have to serve. Reserved stock is already out of the free stock.
const loadOpenDemand = async () => {
    try {
        const [rows] = await db.query(
            `SELECT r.bloodbank_id, r.blood_group, SUM(r.units_required) AS units
             FROM blood_request r
             LEFT JOIN (SELECT request_id, SUM(units) AS u FROM blood_reservation GROUP BY request_id) x
                    ON x.request_id = r.request_id
             WHERE r.bloodbank_id IS NOT NULL
               AND (r.status = 'Pending' OR (r.status = 'Accepted' AND COALESCE(x.u, 0) = 0))
             GROUP BY r.bloodbank_id, r.blood_group`
        );
        return rows;
    } catch (error) {
        if (error.code !== "ER_NO_SUCH_TABLE" && error.code !== "ER_BAD_FIELD_ERROR") throw error;
        // the reservation table does not exist (yet): count all waiting requests
        const [rows] = await db.query(
            `SELECT bloodbank_id, blood_group, SUM(units_required) AS units
             FROM blood_request
             WHERE bloodbank_id IS NOT NULL AND status IN ('Pending', 'Accepted')
             GROUP BY bloodbank_id, blood_group`
        );
        return rows;
    }
};

// GET /api/admin/bank-forecast
const forecast = async (req, res) => {
    try {
        const [banks] = await db.query(
            `SELECT b.bloodbank_id, b.name, b.district,
                    COALESCE(s.low_stock_threshold, ${DEFAULT_LOW}) AS low
             FROM blood_bank b LEFT JOIN bank_settings s ON s.bloodbank_id = b.bloodbank_id
             WHERE b.status = 'Approved' ORDER BY b.name`
        );
        const [stock] = await db.query(
            `SELECT bloodbank_id, blood_group, SUM(units_left) AS units,
                    SUM(CASE WHEN expires_on <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN units_left ELSE 0 END) AS expiring
             FROM blood_batch WHERE ${FREE} GROUP BY bloodbank_id, blood_group`
        );
        const [moves] = await db.query(
            `SELECT bloodbank_id, blood_group,
                    SUM(CASE WHEN action = 'Issued' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN -change_units ELSE 0 END) AS out7,
                    SUM(CASE WHEN action = 'Issued' THEN -change_units ELSE 0 END) AS out30,
                    SUM(CASE WHEN action = 'Received' THEN change_units ELSE 0 END) AS in30
             FROM inventory_log
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND action IN ('Issued', 'Received')
             GROUP BY bloodbank_id, blood_group`
        );
        const demand = await loadOpenDemand();

        const key = (b, g) => `${b}|${g}`;
        const stockMap = Object.fromEntries(stock.map((r) => [key(r.bloodbank_id, r.blood_group), r]));
        const moveMap = Object.fromEntries(moves.map((r) => [key(r.bloodbank_id, r.blood_group), r]));
        const demandMap = Object.fromEntries(demand.map((r) => [key(r.bloodbank_id, r.blood_group), n(r.units)]));

        const rows = [];
        banks.forEach((b) => {
            GROUPS.forEach((g) => {
                const k = key(b.bloodbank_id, g);
                const s = stockMap[k] || {};
                const m = moveMap[k] || {};
                const units = n(s.units);
                const out7 = n(m.out7) / 7;
                const out30 = n(m.out30) / 30;
                const cover = Math.min(units / Math.max(Math.max(out7, out30), 0.1), 30);
                rows.push({
                    bloodbank_id: b.bloodbank_id, bank_name: b.name, district: b.district, blood_group: g,
                    stock: units,
                    out7_per_day: r1(out7),
                    out30_per_day: r1(out30),
                    in30_per_day: r1(n(m.in30) / 30),
                    expiring7: n(s.expiring),
                    open_demand: demandMap[k] || 0,
                    low_threshold: n(b.low),
                    days_cover: r1(cover),
                    active: units > 0 || out30 > 0 || (demandMap[k] || 0) > 0
                });
            });
        });

        res.json({ success: true, generated_at: new Date().toISOString(), rows });
    } catch (error) {
        console.error("admin forecast error:", error);
        res.status(500).json({ success: false, message: "Could not load forecast data." });
    }
};

module.exports = { forecast };