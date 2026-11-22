const bcrypt = require("bcrypt");
const db = require("../../config/db");

const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const SERVICES = ["Whole blood", "Platelets", "Plasma", "Blood testing", "Home delivery", "Donation camps"];
const DEFAULTS = {
    about: "", emergency_phone: "", is_24x7: false, opening_time: "09:00", closing_time: "17:00",
    open_days: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"], services: ["Whole blood"],
    low_stock_threshold: 5, critical_stock_threshold: 2, expiry_warning_days: 7
};
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const normalizePhone = (v) => {
    const s = String(v || "").replace(/[\s-]/g, "").replace(/^\+?88/, "");
    return /^01[3-9]\d{8}$/.test(s) ? s : null;
};
const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ""));
const toList = (csv) => String(csv || "").split(",").map((x) => x.trim()).filter(Boolean);
const toInt = (v) => (/^-?\d+$/.test(String(v).trim()) ? Number(v) : NaN);

const get = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT b.name, b.license_number, b.email, b.phone, b.address, b.division, b.district, b.upazila, b.status,
                    DATE_FORMAT(b.created_at, '%d %b %Y') AS member_since,
                    s.about, s.emergency_phone, s.is_24x7,
                    TIME_FORMAT(s.opening_time, '%H:%i') AS opening_time, TIME_FORMAT(s.closing_time, '%H:%i') AS closing_time,
                    s.open_days, s.services, s.low_stock_threshold, s.critical_stock_threshold, s.expiry_warning_days
             FROM blood_bank b LEFT JOIN bank_settings s ON s.bloodbank_id = b.bloodbank_id
             WHERE b.bloodbank_id = ?`,
            [req.actor.id]
        );
        const r = rows[0];
        if (!r) return res.status(404).json({ success: false, message: "Account not found." });

        res.json({
            success: true,
            options: { days: DAYS, services: SERVICES },
            bank: {
                name: r.name, license_number: r.license_number, email: r.email, status: r.status, member_since: r.member_since,
                division: r.division, district: r.district, upazila: r.upazila, phone: r.phone, address: r.address
            },
            settings: r.low_stock_threshold === null ? DEFAULTS : {
                about: r.about || "", emergency_phone: r.emergency_phone || "", is_24x7: !!r.is_24x7,
                opening_time: r.opening_time, closing_time: r.closing_time,
                open_days: toList(r.open_days), services: toList(r.services),
                low_stock_threshold: r.low_stock_threshold, critical_stock_threshold: r.critical_stock_threshold,
                expiry_warning_days: r.expiry_warning_days
            }
        });
    } catch (error) {
        console.error("bank settings get error:", error);
        res.status(500).json({ success: false, message: "Could not load settings." });
    }
};

const update = async (req, res) => {
    try {
        const id = req.actor.id;
        const b = req.body || {};
        const errors = {};

        const phone = normalizePhone(b.phone);
        if (!phone) errors.phone = "Enter a valid Bangladeshi mobile number (01XXXXXXXXX).";

        let emergency = String(b.emergency_phone || "").trim();
        if (emergency) {
            emergency = normalizePhone(emergency);
            if (!emergency) errors.emergency_phone = "Enter a valid mobile number or leave it empty.";
        }

        const address = String(b.address || "").trim();
        if (address.length < 5 || address.length > 255) errors.address = "Enter the full address (5-255 characters).";

        const about = String(b.about || "").trim();
        if (about.length > 500) errors.about = "Keep the description under 500 characters.";

        const is24 = b.is_24x7 === true || b.is_24x7 === "true";
        const days = Array.isArray(b.open_days) ? [...new Set(b.open_days)] : [];
        if (days.some((d) => !DAYS.includes(d))) errors.open_days = "Invalid day selected.";
        else if (!is24 && !days.length) errors.open_days = "Choose at least one open day.";

        let opening = String(b.opening_time || "");
        let closing = String(b.closing_time || "");
        if (!is24) {
            if (!isTime(opening) || !isTime(closing)) errors.opening_time = "Enter opening and closing times.";
            else if (closing <= opening) errors.closing_time = "Closing time must be after opening time.";
        } else {
            opening = "00:00";
            closing = "23:59";
        }

        const services = Array.isArray(b.services) ? [...new Set(b.services)] : [];
        if (!services.length || services.some((x) => !SERVICES.includes(x))) errors.services = "Choose at least one service.";

        const critical = toInt(b.critical_stock_threshold);
        const low = toInt(b.low_stock_threshold);
        const expiry = toInt(b.expiry_warning_days);
        if (!Number.isInteger(critical) || critical < 0 || critical > 50) errors.critical_stock_threshold = "Enter a number from 0 to 50.";
        if (!Number.isInteger(low) || low > 100 || (Number.isInteger(critical) && low <= critical)) {
            errors.low_stock_threshold = "Must be higher than the critical level and at most 100.";
        }
        if (!Number.isInteger(expiry) || expiry < 1 || expiry > 30) errors.expiry_warning_days = "Enter a number from 1 to 30.";

        if (phone && !errors.phone) {
            const [a] = await db.execute("SELECT 1 FROM blood_bank WHERE phone = ? AND bloodbank_id <> ? LIMIT 1", [phone, id]);
            const [u] = await db.execute("SELECT 1 FROM user WHERE phone = ? LIMIT 1", [phone]);
            if (a.length || u.length) errors.phone = "This mobile number is already used by another account.";
        }

        if (Object.keys(errors).length) {
            return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute("UPDATE blood_bank SET phone = ?, address = ? WHERE bloodbank_id = ?", [phone, address, id]);
            await conn.execute(
                `INSERT INTO bank_settings
                 (bloodbank_id, about, emergency_phone, is_24x7, opening_time, closing_time, open_days, services,
                  low_stock_threshold, critical_stock_threshold, expiry_warning_days)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE about = VALUES(about), emergency_phone = VALUES(emergency_phone),
                    is_24x7 = VALUES(is_24x7), opening_time = VALUES(opening_time), closing_time = VALUES(closing_time),
                    open_days = VALUES(open_days), services = VALUES(services),
                    low_stock_threshold = VALUES(low_stock_threshold),
                    critical_stock_threshold = VALUES(critical_stock_threshold),
                    expiry_warning_days = VALUES(expiry_warning_days)`,
                [id, about || null, emergency || null, is24 ? 1 : 0, opening, closing, days.join(","), services.join(","), low, critical, expiry]
            );
            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

        res.json({ success: true, message: "Settings saved." });
    } catch (error) {
        console.error("bank settings update error:", error);
        res.status(500).json({ success: false, message: "Could not save settings." });
    }
};

const changePassword = async (req, res) => {
    try {
        const current = String((req.body || {}).currentPassword || "");
        const next = String((req.body || {}).newPassword || "");

        if (!current || !next) return res.status(400).json({ success: false, message: "All fields are required." });
        if (!PASSWORD_RULE.test(next)) {
            return res.status(400).json({ success: false, message: "New password must be at least 8 characters with uppercase, lowercase, a number and a special character." });
        }
        if (next === current) return res.status(400).json({ success: false, message: "New password must be different from the current one." });

        const [rows] = await db.execute("SELECT password FROM blood_bank WHERE bloodbank_id = ?", [req.actor.id]);
        if (!rows.length || !(await bcrypt.compare(current, rows[0].password))) {
            return res.status(400).json({ success: false, message: "Current password is incorrect." });
        }

        await db.execute("UPDATE blood_bank SET password = ? WHERE bloodbank_id = ?", [await bcrypt.hash(next, 10), req.actor.id]);
        res.json({ success: true, message: "Password changed successfully." });
    } catch (error) {
        console.error("bank password error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { get, update, changePassword };