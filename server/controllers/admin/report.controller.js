const db = require("../../config/db");
const { logAdminAction } = require("../../utils/audit");

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const PREVIEW_ROWS = 25;
const MAX_EXPORT_ROWS = 20000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const REPORTS = {
    users: {
        title: "Users",
        from: "FROM user u",
        dateCol: "u.created_at",
        order: "u.created_at DESC",
        columns: [
            { key: "user_id", label: "ID", sql: "u.user_id" },
            { key: "full_name", label: "Full name", sql: "u.full_name" },
            { key: "username", label: "Username", sql: "u.username" },
            { key: "email", label: "Email", sql: "u.email" },
            { key: "phone", label: "Phone", sql: "u.phone" },
            { key: "gender", label: "Gender", sql: "u.gender" },
            { key: "blood_group", label: "Blood group", sql: "u.blood_group" },
            { key: "role", label: "Role", sql: "u.role" },
            { key: "division", label: "Division", sql: "u.division" },
            { key: "district", label: "District", sql: "u.district" },
            { key: "account_status", label: "Status", sql: "u.account_status" },
            { key: "email_verified", label: "Email verified", sql: "IF(u.email_verified, 'Yes', 'No')" },
            { key: "joined", label: "Joined", sql: "DATE_FORMAT(u.created_at, '%Y-%m-%d')" }
        ],
        breakdowns: [
            { title: "By status", sql: "u.account_status" },
            { title: "By blood group", sql: "u.blood_group" },
            { title: "By role", sql: "u.role" }
        ]
    },
    requests: {
        title: "Blood requests",
        from: `FROM blood_request r
               JOIN user u ON u.user_id = r.requester_id
               LEFT JOIN blood_bank b ON b.bloodbank_id = r.bloodbank_id`,
        dateCol: "r.created_at",
        order: "r.created_at DESC",
        columns: [
            { key: "request_id", label: "ID", sql: "r.request_id" },
            { key: "blood_group", label: "Blood group", sql: "r.blood_group" },
            { key: "units_required", label: "Units", sql: "r.units_required" },
            { key: "urgency_level", label: "Urgency", sql: "r.urgency_level" },
            { key: "patient_name", label: "Patient", sql: "r.patient_name" },
            { key: "hospital_name", label: "Hospital", sql: "r.hospital_name" },
            { key: "required_date", label: "Needed by", sql: "DATE_FORMAT(r.required_date, '%Y-%m-%d')" },
            { key: "status", label: "Status", sql: "r.status" },
            { key: "requester", label: "Requester", sql: "u.username" },
            { key: "bloodbank", label: "Blood bank", sql: "b.name" },
            { key: "created", label: "Created", sql: "DATE_FORMAT(r.created_at, '%Y-%m-%d')" }
        ],
        breakdowns: [
            { title: "By status", sql: "r.status" },
            { title: "By blood group", sql: "r.blood_group" },
            { title: "By urgency", sql: "r.urgency_level" }
        ]
    },
    donations: {
        title: "Donations",
        from: `FROM donation d
               JOIN user du ON du.user_id = d.donor_id
               JOIN user ru ON ru.user_id = d.receiver_id
               JOIN blood_bank b ON b.bloodbank_id = d.bloodbank_id`,
        dateCol: "d.donation_date",
        order: "d.donation_date DESC, d.donation_id DESC",
        columns: [
            { key: "donation_id", label: "ID", sql: "d.donation_id" },
            { key: "donor", label: "Donor", sql: "du.full_name" },
            { key: "donor_group", label: "Blood group", sql: "du.blood_group" },
            { key: "receiver", label: "Receiver", sql: "ru.full_name" },
            { key: "bloodbank", label: "Blood bank", sql: "b.name" },
            { key: "donation_date", label: "Date", sql: "DATE_FORMAT(d.donation_date, '%Y-%m-%d')" },
            { key: "status", label: "Status", sql: "d.status" },
            { key: "nid_verified", label: "NID verified", sql: "IF(d.nid_verified, 'Yes', 'No')" }
        ],
        breakdowns: [
            { title: "By status", sql: "d.status" },
            { title: "By blood group", sql: "du.blood_group" },
            { title: "By blood bank", sql: "b.name" }
        ]
    },
        connections: {
        title: "Blood connections",
        from: `FROM blood_connection c
               JOIN user o ON o.user_id = c.note_owner_id
               JOIN user a ON a.user_id = c.applicant_id`,
        dateCol: "c.created_at",
        order: "c.created_at DESC, c.connection_id DESC",
        columns: [
            { key: "connection_id", label: "ID", sql: "c.connection_id" },
            { key: "note_owner", label: "Note owner", sql: "o.full_name" },
            { key: "applicant", label: "Applicant", sql: "a.full_name" },
            { key: "applicant_role", label: "Applicant role", sql: "c.applicant_role" },
            { key: "note_blood_group", label: "Note blood group", sql: "c.note_blood_group" },
            { key: "status", label: "Status", sql: "c.status" },
            { key: "requested", label: "Requested", sql: "DATE_FORMAT(c.created_at, '%Y-%m-%d')" },
            { key: "confirmed", label: "Confirmed", sql: "DATE_FORMAT(c.confirmed_at, '%Y-%m-%d')" },
            { key: "completed", label: "Completed", sql: "DATE_FORMAT(c.completed_at, '%Y-%m-%d')" }
        ],
        breakdowns: [
            { title: "By status", sql: "c.status" },
            { title: "By blood group", sql: "c.note_blood_group" },
            { title: "By applicant role", sql: "c.applicant_role" }
        ]
    },
    bloodbanks: {
        title: "Blood banks",
        from: "FROM blood_bank b",
        dateCol: "b.created_at",
        order: "b.created_at DESC",
        columns: [
            { key: "bloodbank_id", label: "ID", sql: "b.bloodbank_id" },
            { key: "name", label: "Name", sql: "b.name" },
            { key: "license_number", label: "License", sql: "b.license_number" },
            { key: "email", label: "Email", sql: "b.email" },
            { key: "phone", label: "Phone", sql: "b.phone" },
            { key: "division", label: "Division", sql: "b.division" },
            { key: "district", label: "District", sql: "b.district" },
            { key: "status", label: "Status", sql: "b.status" },
            { key: "registered", label: "Registered", sql: "DATE_FORMAT(b.created_at, '%Y-%m-%d')" }
        ],
        breakdowns: [
            { title: "By status", sql: "b.status" },
            { title: "By district", sql: "b.district" }
        ]
    }
};

const csvCell = (value) => {
    if (value === null || value === undefined) return "";
    let s = String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const buildFilter = (cfg, from, to) => {
    const where = ["1=1"];
    const params = [];
    if (from) {
        where.push(`${cfg.dateCol} >= ?`);
        params.push(from);
    }
    if (to) {
        where.push(`${cfg.dateCol} < DATE_ADD(?, INTERVAL 1 DAY)`);
        params.push(to);
    }
    return { whereSql: where.join(" AND "), params };
};

const get = async (req, res) => {
    try {
        const type = req.params.type;
        if (!has(REPORTS, type)) {
            return res.status(404).json({ success: false, message: "Unknown report type." });
        }
        const cfg = REPORTS[type];

        const from = String(req.query.from || "");
        const to = String(req.query.to || "");
        if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
            return res.status(400).json({ success: false, message: "Dates must look like YYYY-MM-DD." });
        }
        if (from && to && from > to) {
            return res.status(400).json({ success: false, message: "The start date must be before the end date." });
        }

        const { whereSql, params } = buildFilter(cfg, from, to);
        const selectSql = cfg.columns.map((c) => `${c.sql} AS ${c.key}`).join(", ");

        if (req.query.format === "csv") {
            const [rows] = await db.query(
                `SELECT ${selectSql} ${cfg.from} WHERE ${whereSql} ORDER BY ${cfg.order} LIMIT ?`,
                [...params, MAX_EXPORT_ROWS]
            );

            const lines = [cfg.columns.map((c) => csvCell(c.label)).join(",")];
            rows.forEach((r) => lines.push(cfg.columns.map((c) => csvCell(r[c.key])).join(",")));

            await logAdminAction({
                adminId: req.admin.admin_id,
                ip: req.ip,
                action: "REPORT_EXPORT",
                targetType: "report",
                targetId: type,
                details: { from: from || null, to: to || null, rows: rows.length }
            });

            const name = `blood-lagbe-${type}-${from || "start"}_to_${to || "today"}.csv`;
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
            return res.send("\uFEFF" + lines.join("\r\n"));
        }

        const [[totalRow]] = await db.query(`SELECT COUNT(*) total ${cfg.from} WHERE ${whereSql}`, params);
        const [rows] = await db.query(
            `SELECT ${selectSql} ${cfg.from} WHERE ${whereSql} ORDER BY ${cfg.order} LIMIT ?`,
            [...params, PREVIEW_ROWS]
        );

        const breakdowns = [];
        for (const b of cfg.breakdowns) {
            const [items] = await db.query(
                `SELECT ${b.sql} AS label, COUNT(*) AS count ${cfg.from} WHERE ${whereSql} GROUP BY ${b.sql} ORDER BY count DESC LIMIT 8`,
                params
            );
            breakdowns.push({
                title: b.title,
                rows: items.map((i) => ({ label: i.label == null ? "—" : String(i.label), count: Number(i.count) }))
            });
        }

        res.json({
            success: true,
            title: cfg.title,
            total: Number(totalRow.total),
            previewLimit: PREVIEW_ROWS,
            exportLimit: MAX_EXPORT_ROWS,
            columns: cfg.columns.map((c) => ({ key: c.key, label: c.label })),
            rows,
            breakdowns
        });
    } catch (error) {
        console.error("❌ Admin report error:", error);
        res.status(500).json({ success: false, message: "Could not build the report." });
    }
};

module.exports = { get };