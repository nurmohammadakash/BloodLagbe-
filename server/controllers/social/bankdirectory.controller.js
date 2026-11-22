const db = require("../../config/db");
const { notify } = require("../../services/notify.service");
const inventory = require("../../services/inventory.service");
const { BLOOD_GROUPS, getActorInfo } = require("../../utils/social.helpers");

const URGENCY = ["Low", "Medium", "High", "Critical"];
const MAX_UNITS = 10;
const MAX_OPEN_PER_BANK = 3;       // Pending/Accepted requests one user may have with one bank
const MAX_REQUESTS_PER_DAY = 5;    // bank requests one user may send per day (all banks)
const MAX_DAYS_AHEAD = 60;
const DEFAULT_LOW = 5;
const DEFAULT_CRITICAL = 2;

const fail = (res, status, message, extra = {}) =>
    res.status(status).json({ success: false, message, ...extra });

const pad = (n) => String(n).padStart(2, "0");
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isDate = (v) => {
    const s = String(v || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const toInt = (v) => (/^-?\d+$/.test(String(v).trim()) ? Number(v) : NaN);

const stockLevel = (units, low, critical) => {
    if (units <= 0) return "Out";
    if (units <= critical) return "Critical";
    if (units <= low) return "Low";
    return "Good";
};

const km = (lat1, lng1, lat2, lng2) => {
    const rad = (x) => (x * Math.PI) / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
        + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
};

// GET /api/social/banks?q=&district=&group=&lat=&lng=
const listBanks = async (req, res) => {
    try {
        const q = String(req.query.q || "").trim().slice(0, 60);
        const district = String(req.query.district || "").trim().slice(0, 100);
        const group = BLOOD_GROUPS.includes(req.query.group) ? req.query.group : null;
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        const hasPos = req.query.lat !== undefined && req.query.lng !== undefined
            && Number.isFinite(lat) && Number.isFinite(lng);

        const where = ["b.status = 'Approved'", "b.email_verified = TRUE"];
        const params = [];
        if (district) { where.push("b.district = ?"); params.push(district); }
        if (q) {
            where.push("(b.name LIKE ? OR b.upazila LIKE ? OR b.address LIKE ?)");
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        const [banks] = await db.query(
            `SELECT b.bloodbank_id, b.name, b.division, b.district, b.upazila, b.address, b.phone,
                    b.latitude, b.longitude,
                    s.emergency_phone, s.is_24x7,
                    TIME_FORMAT(s.opening_time, '%H:%i') AS opening_time,
                    TIME_FORMAT(s.closing_time, '%H:%i') AS closing_time,
                    s.services,
                    COALESCE(s.low_stock_threshold, ${DEFAULT_LOW}) AS low,
                    COALESCE(s.critical_stock_threshold, ${DEFAULT_CRITICAL}) AS critical
             FROM blood_bank b
             LEFT JOIN bank_settings s ON s.bloodbank_id = b.bloodbank_id
             WHERE ${where.join(" AND ")}
             ORDER BY b.name ASC
             LIMIT 200`,
            params
        );

        const [districtRows] = await db.query(
            "SELECT DISTINCT district FROM blood_bank WHERE status = 'Approved' AND email_verified = TRUE ORDER BY district"
        );

        const stockByBank = {};
        if (banks.length) {
            const [stock] = await db.query(
                `SELECT bloodbank_id, blood_group, SUM(units_left) AS units
                 FROM blood_batch
                 WHERE bloodbank_id IN (?) AND status = 'Available' AND units_left > 0 AND expires_on >= CURDATE()
                 GROUP BY bloodbank_id, blood_group`,
                [banks.map((b) => b.bloodbank_id)]
            );
            stock.forEach((r) => {
                (stockByBank[r.bloodbank_id] = stockByBank[r.bloodbank_id] || {})[r.blood_group] = Number(r.units);
            });
        }

        let items = banks.map((b) => {
            const have = stockByBank[b.bloodbank_id] || {};
            const groups = BLOOD_GROUPS.map((g) => ({
                blood_group: g,
                units: have[g] || 0,
                level: stockLevel(have[g] || 0, b.low, b.critical)
            }));
            const distance = hasPos && b.latitude !== null && b.longitude !== null
                ? Math.round(km(lat, lng, Number(b.latitude), Number(b.longitude)) * 10) / 10
                : null;
            return {
                bloodbank_id: b.bloodbank_id,
                name: b.name,
                district: b.district,
                upazila: b.upazila,
                address: b.address,
                phone: b.emergency_phone || b.phone,
                is_24x7: !!b.is_24x7,
                hours: b.is_24x7 ? "Open 24/7" : (b.opening_time && b.closing_time ? `${b.opening_time} – ${b.closing_time}` : null),
                services: String(b.services || "").split(",").map((x) => x.trim()).filter(Boolean),
                distance_km: distance,
                total_units: groups.reduce((s, x) => s + x.units, 0),
                groups
            };
        });

        const unitsOf = (b) => b.groups.find((g) => g.blood_group === group).units;
        if (group) items = items.filter((b) => unitsOf(b) > 0);

        if (hasPos) items.sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
        else if (group) items.sort((a, b) => unitsOf(b) - unitsOf(a));

        res.json({ success: true, districts: districtRows.map((r) => r.district), banks: items });
    } catch (error) {
        console.error("listBanks error:", error);
        fail(res, 500, "Could not load blood banks.");
    }
};

// POST /api/social/banks/:id/requests
const createRequest = async (req, res) => {
    try {
        const me = req.actor.id;
        const bankId = Number(req.params.id);
        if (!Number.isInteger(bankId)) return fail(res, 404, "Blood bank not found.");

        const [banks] = await db.execute(
            "SELECT bloodbank_id, name FROM blood_bank WHERE bloodbank_id = ? AND status = 'Approved'",
            [bankId]
        );
        if (!banks.length) return fail(res, 404, "This blood bank is not accepting requests.");

        const b = req.body || {};
        const errors = {};

        const group = String(b.blood_group || "");
        if (!BLOOD_GROUPS.includes(group)) errors.blood_group = "Choose a blood group.";

        const units = toInt(b.units_required);
        if (!Number.isInteger(units) || units < 1 || units > MAX_UNITS) errors.units_required = `Enter 1 to ${MAX_UNITS} units.`;

        const urgency = String(b.urgency_level || "");
        if (!URGENCY.includes(urgency)) errors.urgency_level = "Choose how urgent this is.";

        const patient = String(b.patient_name || "").trim();
        if (patient.length < 2 || patient.length > 100) errors.patient_name = "Enter the patient's name.";

        let age = null;
        if (String(b.patient_age ?? "").trim() !== "") {
            age = toInt(b.patient_age);
            if (!Number.isInteger(age) || age < 0 || age > 120) errors.patient_age = "Enter a valid age (0-120).";
        }

        const hospital = String(b.hospital_name || "").trim();
        if (hospital.length < 2 || hospital.length > 150) errors.hospital_name = "Enter the hospital name.";

        const address = String(b.hospital_address || "").trim();
        if (address.length < 5 || address.length > 500) errors.hospital_address = "Enter the hospital address.";

        const contact = String(b.contact_person || "").trim();
        if (contact.length < 2 || contact.length > 100) errors.contact_person = "Enter a contact person.";

        const phone = String(b.contact_number || "").replace(/[\s-]/g, "").replace(/^\+?88/, "");
        if (!/^01[3-9]\d{8}$/.test(phone)) errors.contact_number = "Enter a valid Bangladeshi mobile number.";

        const today = dateStr(new Date());
        const limit = new Date(); limit.setDate(limit.getDate() + MAX_DAYS_AHEAD);
        const needed = String(b.required_date || "");
        if (!isDate(needed)) errors.required_date = "Choose the date blood is needed.";
        else if (needed < today) errors.required_date = "The date cannot be in the past.";
        else if (needed > dateStr(limit)) errors.required_date = `Choose a date within ${MAX_DAYS_AHEAD} days.`;

        const note = String(b.note || "").trim();
        if (note.length > 500) errors.note = "Keep the note under 500 characters.";

        if (Object.keys(errors).length) {
            return fail(res, 400, "Please fix the highlighted fields.", { errors });
        }

        const [[open]] = await db.execute(
            "SELECT COUNT(*) AS c FROM blood_request WHERE requester_id = ? AND bloodbank_id = ? AND status IN ('Pending','Accepted')",
            [me, bankId]
        );
        if (Number(open.c) >= MAX_OPEN_PER_BANK) {
            return fail(res, 409, `You already have ${MAX_OPEN_PER_BANK} open requests with this blood bank. Wait for a reply or cancel one first.`);
        }
        const [[day]] = await db.execute(
            "SELECT COUNT(*) AS c FROM blood_request WHERE requester_id = ? AND bloodbank_id IS NOT NULL AND created_at >= CURDATE()",
            [me]
        );
        if (Number(day.c) >= MAX_REQUESTS_PER_DAY) {
            return fail(res, 429, "You have reached today's limit for blood bank requests. Please try again tomorrow.");
        }

        const [result] = await db.execute(
            `INSERT INTO blood_request
             (requester_id, bloodbank_id, blood_group, units_required, urgency_level, patient_name, patient_age,
              hospital_name, hospital_address, contact_person, contact_number, required_date, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [me, bankId, group, units, urgency, patient, age, hospital, address, contact, phone, needed, note || null]
        );

        const actor = await getActorInfo(req.actor);
        await notify({
            recipientType: "bloodbank",
            recipientId: bankId,
            actor: req.actor,
            type: "bank_request",
            message: `${urgency === "Critical" || urgency === "High" ? `${urgency}: ` : ""}${actor.display_name} requested ${units} unit${units === 1 ? "" : "s"} of ${group} for ${patient}.`,
            link: "/bloodbank/dashboard#requests"
        });

        res.status(201).json({
            success: true,
            request_id: result.insertId,
            message: `Your request was sent to ${banks[0].name}.`
        });
    } catch (error) {
        console.error("createRequest error:", error);
        fail(res, 500, "Could not send your request.");
    }
};

// GET /api/social/bank-requests/mine
const myRequests = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT r.request_id, r.bloodbank_id, b.name AS bank_name, r.blood_group, r.units_required,
        r.urgency_level, r.patient_name, r.hospital_name, r.status, r.status_reason, r.bank_note,
        (SELECT COALESCE(SUM(s.units), 0) FROM blood_reservation s WHERE s.request_id = r.request_id) AS reserved_units,
        DATE_FORMAT(r.required_date, '%d %b %Y') AS required_date,
        r.created_at
             FROM blood_request r
             JOIN blood_bank b ON b.bloodbank_id = r.bloodbank_id
             WHERE r.requester_id = ?
             ORDER BY r.request_id DESC LIMIT 30`,
            [req.actor.id]
        );
        res.json({ success: true, requests: rows });
    } catch (error) {
        console.error("myRequests error:", error);
        fail(res, 500, "Could not load your requests.");
    }
};

// POST /api/social/bank-requests/:id/cancel   (Pending or Accepted; frees any reserved stock)
const cancelRequest = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return fail(res, 404, "Request not found.");

        await conn.beginTransaction();
        const [rows] = await conn.execute(
            "SELECT request_id, bloodbank_id, status, blood_group, units_required FROM blood_request WHERE request_id = ? AND requester_id = ? AND bloodbank_id IS NOT NULL FOR UPDATE",
            [id, req.actor.id]
        );
        const r = rows[0];
        if (!r) { await conn.rollback(); return fail(res, 404, "Request not found."); }
        if (!["Pending", "Accepted"].includes(r.status)) {
            await conn.rollback();
            return fail(res, 409, "This request can no longer be cancelled.");
        }

        await inventory.releaseReservations(conn, id, "Request cancelled by the requester");
        await conn.execute(
            "UPDATE blood_request SET status = 'Cancelled', status_reason = 'Cancelled by the requester' WHERE request_id = ?",
            [id]
        );
        await conn.commit();

        const actor = await getActorInfo(req.actor);
        await notify({
            recipientType: "bloodbank",
            recipientId: r.bloodbank_id,
            actor: req.actor,
            type: "bank_request_cancelled",
            message: `${actor.display_name} cancelled their request for ${r.units_required} unit${r.units_required === 1 ? "" : "s"} of ${r.blood_group}.`,
            link: "/bloodbank/dashboard#requests"
        });

        res.json({ success: true, message: "Request cancelled." });
    } catch (error) {
        await conn.rollback();
        console.error("cancelRequest error:", error);
        fail(res, 500, "Could not cancel the request.");
    } finally {
        conn.release();
    }
};

module.exports = { listBanks, createRequest, myRequests, cancelRequest };