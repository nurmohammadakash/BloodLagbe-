const db = require("../../config/db");

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUSES = ["Pending", "Accepted", "Completed", "Cancelled", "Expired"];
const SIX_MONTHS_AGO = "DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)";

const n = (v) => Number(v || 0);

const lastMonths = (count) => {
    const out = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return out;
};

// Turn [{ym, c}] rows into an array aligned with the months list (missing = 0)
const series = (rows, months) => {
    const map = {};
    rows.forEach((r) => { map[r.ym] = n(r.c); });
    return months.map((m) => map[m] || 0);
};

const getOverview = async (req, res) => {
    try {
        const months = lastMonths(6);

        const [
            [[u]], [[b]], [[r]], [[d]],
            [userRows], [bankRows], [donationRows],
            [demandRows], [stockRows], [statusRows],
            [urgent], [activity]
        ] = await Promise.all([
            db.query(`
                SELECT COUNT(*) total,
                       SUM(account_status = 'Active') active,
                       SUM(account_status IN ('Suspended','Blocked')) restricted,
                       SUM(role IN ('Donor','Both')) donors,
                       SUM(created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) new_this_month
                FROM user`),
            db.query(`
                SELECT COUNT(*) total,
                       SUM(status = 'Approved') approved,
                       SUM(status = 'Pending' AND email_verified = 1) pending,
                       SUM(status = 'Rejected') rejected
                FROM blood_bank`),
            db.query(`
                SELECT COUNT(*) total,
                       SUM(status IN ('Pending','Accepted')) open_count,
                       SUM(status = 'Completed') completed,
                       SUM(status IN ('Pending','Accepted') AND urgency_level = 'Critical') critical
                FROM blood_request`),
                        db.query(`
                SELECT COUNT(*) total,
                       SUM(st = 'Completed') completed,
                       SUM(st = 'Completed' AND d_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) this_month
                FROM (
                    SELECT status AS st, donation_date AS d_date FROM donation
                    UNION ALL
                    SELECT CASE status WHEN 'Confirmed' THEN 'Completed' ELSE status END, donated_on FROM blood_exchange
                ) x`),

            db.query(`SELECT DATE_FORMAT(created_at, '%Y-%m') ym, COUNT(*) c FROM user
                      WHERE created_at >= ${SIX_MONTHS_AGO} GROUP BY ym`),
            db.query(`SELECT DATE_FORMAT(created_at, '%Y-%m') ym, COUNT(*) c FROM blood_bank
                      WHERE created_at >= ${SIX_MONTHS_AGO} GROUP BY ym`),
                        db.query(`SELECT DATE_FORMAT(d_date, '%Y-%m') ym, COUNT(*) c FROM (
                          SELECT donation_date AS d_date FROM donation WHERE status = 'Completed'
                          UNION ALL
                          SELECT donated_on FROM blood_exchange WHERE status = 'Confirmed'
                      ) x
                      WHERE d_date >= ${SIX_MONTHS_AGO} GROUP BY ym`),

            db.query(`SELECT blood_group, SUM(units_required) units FROM blood_request
                      WHERE status IN ('Pending','Accepted') GROUP BY blood_group`),
            db.query(`SELECT i.blood_group, SUM(i.unit_count) units
                      FROM blood_inventory i
                      JOIN blood_bank bb ON bb.bloodbank_id = i.bloodbank_id
                      WHERE bb.status = 'Approved' GROUP BY i.blood_group`),
            db.query(`SELECT status, COUNT(*) c FROM blood_request GROUP BY status`),

            db.query(`
                SELECT request_id, blood_group, units_required, urgency_level, hospital_name,
                       DATE_FORMAT(required_date, '%d %b') needed_by
                FROM blood_request
                WHERE status IN ('Pending','Accepted') AND urgency_level IN ('Critical','High')
                ORDER BY FIELD(urgency_level, 'Critical', 'High'), required_date ASC
                LIMIT 6`),
            db.query(`
                (SELECT 'user' type, full_name title, CONCAT('New ', role, ' registered') subtitle, created_at
                   FROM user ORDER BY created_at DESC LIMIT 6)
                UNION ALL
                (SELECT 'bloodbank', name, CONCAT('Blood bank registered (', status, ')'), created_at
                   FROM blood_bank ORDER BY created_at DESC LIMIT 6)
                UNION ALL
                (SELECT 'request', CONCAT(blood_group, ' blood needed'),
                        CONCAT(hospital_name, ' · ', urgency_level), created_at
                   FROM blood_request ORDER BY created_at DESC LIMIT 6)
                ORDER BY created_at DESC LIMIT 8`)
        ]);

        const byGroup = (rows) => {
            const map = {};
            rows.forEach((x) => { map[x.blood_group] = n(x.units); });
            return GROUPS.map((g) => map[g] || 0);
        };

        const statusMap = {};
        statusRows.forEach((x) => { statusMap[x.status] = n(x.c); });

        res.json({
            success: true,
            data: {
                kpis: {
                    users: {
                        total: n(u.total), active: n(u.active), restricted: n(u.restricted),
                        donors: n(u.donors), newThisMonth: n(u.new_this_month)
                    },
                    bloodBanks: {
                        total: n(b.total), approved: n(b.approved),
                        pending: n(b.pending), rejected: n(b.rejected)
                    },
                    requests: {
                        total: n(r.total), open: n(r.open_count),
                        completed: n(r.completed), critical: n(r.critical)
                    },
                    donations: { total: n(d.total), completed: n(d.completed), thisMonth: n(d.this_month) }
                },
                charts: {
                    months,
                    users: series(userRows, months),
                    bloodBanks: series(bankRows, months),
                    donations: series(donationRows, months),
                    groups: GROUPS,
                    demand: byGroup(demandRows),
                    stock: byGroup(stockRows),
                    requestStatus: STATUSES.map((s) => ({ status: s, count: statusMap[s] || 0 }))
                },
                urgent,
                activity
            }
        });
    } catch (error) {
        console.error("❌ Admin overview error:", error);
        res.status(500).json({ success: false, message: "Could not load overview data." });
    }
};

module.exports = { getOverview };