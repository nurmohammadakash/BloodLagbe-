const db = require("../../config/db");

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const n = (v) => Number(v || 0);

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUS_TABS = { all: null, pending: "Pending", verified: "Verified", completed: "Completed", cancelled: "Cancelled" };

const LOW_NATIONAL = 10;   // total units per blood group across all banks
const LOW_BANK = 5;        // units per blood group in one bank

const list = async (req, res) => {
    try {
        const statusKey = has(STATUS_TABS, req.query.status) ? req.query.status : "all";
        const search = String(req.query.search || "").trim();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        const where = ["1=1"];
        const params = [];

        if (STATUS_TABS[statusKey]) {
            where.push("d.status = ?");
            params.push(STATUS_TABS[statusKey]);
        }
        if (search) {
            const like = `%${search}%`;
            where.push("(du.full_name LIKE ? OR du.username LIKE ? OR ru.full_name LIKE ? OR ru.username LIKE ? OR b.name LIKE ?)");
            params.push(like, like, like, like, like);
        }
        const whereSql = where.join(" AND ");

        const fromSql = `FROM donation d
                         JOIN user du ON du.user_id = d.donor_id
                         JOIN user ru ON ru.user_id = d.receiver_id
                         JOIN blood_bank b ON b.bloodbank_id = d.bloodbank_id`;

        const [[totalRow]] = await db.query(`SELECT COUNT(*) total ${fromSql} WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT d.donation_id, d.status, d.request_id, d.nid_verified,
                    CONCAT(REPEAT('*', GREATEST(CHAR_LENGTH(d.nid_number) - 3, 0)), RIGHT(d.nid_number, 3)) AS nid_masked,
                    d.verified_latitude, d.verified_longitude,
                    DATE_FORMAT(d.donation_date, '%d %b %Y') AS donation_date,
                    TIME_FORMAT(d.donation_time, '%h:%i %p') AS donation_time,
                    du.full_name AS donor_name, du.blood_group AS donor_group,
                    ru.full_name AS receiver_name, b.name AS bloodbank_name, d.created_at
             ${fromSql}
             WHERE ${whereSql}
             ORDER BY d.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );

        const [[c]] = await db.query(`
            SELECT COUNT(*) all_count,
                   SUM(status = 'Pending') pending,
                   SUM(status = 'Verified') verified,
                   SUM(status = 'Completed') completed,
                   SUM(status = 'Cancelled') cancelled,
                   SUM(status = 'Completed' AND donation_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) this_month
            FROM donation`);

        const total = n(totalRow.total);
        res.json({
            success: true,
            items,
            counts: {
                all: n(c.all_count), pending: n(c.pending), verified: n(c.verified),
                completed: n(c.completed), cancelled: n(c.cancelled), thisMonth: n(c.this_month)
            },
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Admin donation list error:", error);
        res.status(500).json({ success: false, message: "Could not load donations." });
    }
};

const stock = async (req, res) => {
    try {
        const search = String(req.query.search || "").trim();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        const where = ["b.status = 'Approved'"];
        const params = [];
        if (search) {
            where.push("(b.name LIKE ? OR b.district LIKE ?)");
            params.push(`%${search}%`, `%${search}%`);
        }
        const whereSql = where.join(" AND ");

        // GROUPS is a fixed constant list, so building these columns is safe
        const pivot = GROUPS.map(
            (g, i) => `COALESCE(SUM(CASE WHEN i.blood_group = '${g}' THEN i.unit_count END), 0) AS g${i}`
        ).join(", ");

        const [[nationalRows], [demandRows], [[totalRow]], [bankRows]] = await Promise.all([
            db.query(`SELECT i.blood_group, SUM(i.unit_count) units, SUM(i.unit_count > 0) banks
                      FROM blood_inventory i
                      JOIN blood_bank b ON b.bloodbank_id = i.bloodbank_id
                      WHERE b.status = 'Approved' GROUP BY i.blood_group`),
            db.query(`SELECT blood_group, SUM(units_required) units FROM blood_request
                      WHERE status IN ('Pending','Accepted') GROUP BY blood_group`),
            db.query(`SELECT COUNT(*) total FROM blood_bank b WHERE ${whereSql}`, params),
            db.query(
                `SELECT b.bloodbank_id, b.name, b.district, ${pivot},
                        COALESCE(SUM(i.unit_count), 0) AS total, MAX(i.last_updated) AS updated
                 FROM blood_bank b
                 LEFT JOIN blood_inventory i ON i.bloodbank_id = b.bloodbank_id
                 WHERE ${whereSql}
                 GROUP BY b.bloodbank_id, b.name, b.district
                 ORDER BY total ASC, b.name ASC
                 LIMIT ? OFFSET ?`,
                [...params, limit, (page - 1) * limit]
            )
        ]);

        const natMap = {};
        nationalRows.forEach((r) => { natMap[r.blood_group] = r; });
        const demandMap = {};
        demandRows.forEach((r) => { demandMap[r.blood_group] = n(r.units); });

        const national = GROUPS.map((g) => {
            const units = n(natMap[g] && natMap[g].units);
            const demand = demandMap[g] || 0;
            const status = demand > units ? "Shortage" : units <= LOW_NATIONAL ? "Low" : "Healthy";
            return { blood_group: g, units, banks: n(natMap[g] && natMap[g].banks), demand, status };
        });

        const banks = bankRows.map((r) => ({
            bloodbank_id: r.bloodbank_id,
            name: r.name,
            district: r.district,
            units: GROUPS.map((_, i) => n(r[`g${i}`])),
            total: n(r.total),
            updated: r.updated
        }));

        const total = n(totalRow.total);
        res.json({
            success: true,
            national,
            banks,
            thresholds: { national: LOW_NATIONAL, bank: LOW_BANK },
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
        });
    } catch (error) {
        console.error("❌ Admin stock error:", error);
        res.status(500).json({ success: false, message: "Could not load blood stock." });
    }
};

module.exports = { list, stock };