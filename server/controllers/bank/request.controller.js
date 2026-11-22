const db = require("../../config/db");
const inventory = require("../../services/inventory.service");
const { notify } = require("../../services/notify.service");

const URGENCY = ["Low", "Medium", "High", "Critical"];

const fail = (res, status, message, extra = {}) =>
    res.status(status).json({ success: false, message, ...extra });

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Tabs. "Approved" = accepted but nothing set aside, "Reserved" = accepted with units set aside.
const TABS = {
    pending: "r.status = 'Pending'",
    approved: "r.status = 'Accepted' AND COALESCE(x.units, 0) = 0",
    reserved: "r.status = 'Accepted' AND COALESCE(x.units, 0) > 0",
    issued: "r.status = 'Completed'",
    closed: "r.status IN ('Rejected','Cancelled','Expired')",
    all: "1 = 1"
};

const FROM = `FROM blood_request r
    JOIN user u ON u.user_id = r.requester_id
    LEFT JOIN (SELECT request_id, SUM(units) AS units FROM blood_reservation GROUP BY request_id) x
           ON x.request_id = r.request_id`;

const list = async (req, res) => {
    try {
        const bankId = req.actor.id;
        await inventory.expireStale(bankId);

        const tab = Object.prototype.hasOwnProperty.call(TABS, req.query.tab) ? req.query.tab : "pending";
        const search = String(req.query.search || "").trim().slice(0, 60);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 10));

        const where = ["r.bloodbank_id = ?", TABS[tab]];
        const params = [bankId];
        if (URGENCY.includes(req.query.urgency)) { where.push("r.urgency_level = ?"); params.push(req.query.urgency); }
        if (search) {
            where.push("(r.patient_name LIKE ? OR r.hospital_name LIKE ? OR r.contact_person LIKE ? OR r.contact_number LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)");
            const like = `%${search}%`;
            params.push(like, like, like, like, like, like);
        }
        const whereSql = where.join(" AND ");

        const open = ["pending", "approved", "reserved"].includes(tab);
        const orderBy = open
            ? "FIELD(r.urgency_level, 'Critical', 'High', 'Medium', 'Low'), r.required_date ASC, r.request_id ASC"
            : "r.updated_at DESC, r.request_id DESC";

        const [[total]] = await db.query(`SELECT COUNT(*) AS c ${FROM} WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT r.request_id, r.blood_group, r.units_required, r.urgency_level, r.patient_name, r.patient_age,
                    r.hospital_name, r.hospital_address, r.contact_person, r.contact_number, r.note,
                    r.status, r.status_reason, r.bank_note, r.created_at,
                    DATE_FORMAT(r.required_date, '%d %b %Y') AS needed_by,
                    (r.status IN ('Pending','Accepted') AND r.required_date < CURDATE()) AS overdue,
                    COALESCE(x.units, 0) AS reserved_units,
                    (SELECT COALESCE(SUM(b.units_left), 0) FROM blood_batch b
                      WHERE b.bloodbank_id = r.bloodbank_id AND b.blood_group = r.blood_group
                        AND b.status = 'Available' AND b.expires_on >= CURDATE()) AS in_stock,
                    u.full_name AS requester_name, u.username AS requester_username
             ${FROM}
             WHERE ${whereSql}
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );

        const [[c]] = await db.query(
            `SELECT SUM(r.status = 'Pending') AS pending,
                    SUM(r.status = 'Accepted' AND COALESCE(x.units, 0) = 0) AS approved,
                    SUM(r.status = 'Accepted' AND COALESCE(x.units, 0) > 0) AS reserved,
                    SUM(r.status = 'Completed') AS issued,
                    SUM(r.status IN ('Rejected','Cancelled','Expired')) AS closed,
                    COUNT(*) AS \`all\`
             ${FROM} WHERE r.bloodbank_id = ?`,
            [bankId]
        );

        res.json({
            success: true,
            items: items.map((r) => ({
                ...r,
                units_required: Number(r.units_required),
                reserved_units: Number(r.reserved_units),
                in_stock: Number(r.in_stock),
                overdue: !!Number(r.overdue)
            })),
            counts: Object.fromEntries(Object.keys(TABS).map((k) => [k, Number(c[k]) || 0])),
            pagination: { page, limit, total: Number(total.c), pages: Math.max(1, Math.ceil(Number(total.c) / limit)) }
        });
    } catch (error) {
        console.error("bank request list error:", error);
        fail(res, 500, "Could not load blood requests.");
    }
};

// ------------------------------------------------------------------
// Actions. Every action locks the request row, so two people (or the
// requester cancelling at the same moment) can never both win.
// ------------------------------------------------------------------
const tx = async (work) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const out = await work(conn);
        if (out && out.error) await conn.rollback(); else await conn.commit();
        return out;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const lockRequest = async (conn, id, bankId) => {
    const [rows] = await conn.execute(
        `SELECT request_id, requester_id, blood_group, units_required, status, patient_name, hospital_name
         FROM blood_request WHERE request_id = ? AND bloodbank_id = ? FOR UPDATE`,
        [id, bankId]
    );
    return rows[0] || null;
};

const reservedUnits = async (conn, id) => {
    const [[row]] = await conn.execute("SELECT COALESCE(SUM(units), 0) AS u FROM blood_reservation WHERE request_id = ?", [id]);
    return Number(row.u);
};

const bankName = async (bankId) => {
    const [rows] = await db.execute("SELECT name FROM blood_bank WHERE bloodbank_id = ?", [bankId]);
    return rows[0] ? rows[0].name : "The blood bank";
};

const tell = (req, requesterId, type, message) =>
    notify({ recipientType: "user", recipientId: requesterId, actor: req.actor, type, message, link: "/banks" });

const requestId = (req) => {
    const id = Number(req.params.id);
    return Number.isInteger(id) ? id : null;
};

const notFound = { error: { code: 404, message: "Request not found." } };
const wrongState = (r, expected) => ({
    error: { code: 409, message: `This request is ${r.status === "Accepted" ? "already approved" : r.status.toLowerCase()}, so it cannot be ${expected}. Please refresh.` }
});

// Pending -> Accepted
const approve = async (req, res) => {
    try {
        const id = requestId(req);
        if (!id) return fail(res, 404, "Request not found.");
        const note = String((req.body || {}).note || "").trim();
        if (note.length > 255) return fail(res, 400, "Keep the note under 255 characters.");

        const out = await tx(async (conn) => {
            const r = await lockRequest(conn, id, req.actor.id);
            if (!r) return notFound;
            if (r.status !== "Pending") return wrongState(r, "approved");
            await conn.execute("UPDATE blood_request SET status = 'Accepted', bank_note = ? WHERE request_id = ?", [note || null, id]);
            return { r };
        });
        if (out.error) return fail(res, out.error.code, out.error.message);

        const name = await bankName(req.actor.id);
        await tell(req, out.r.requester_id, "bank_request_approved",
            `${name} approved your request for ${plural(out.r.units_required, "unit")} of ${out.r.blood_group}.${note ? ` ${note}` : ""}`);
        res.json({ success: true, message: "Request approved." });
    } catch (error) {
        console.error("bank approve error:", error);
        fail(res, 500, "Could not approve the request.");
    }
};

// Accepted -> set stock aside
const reserve = async (req, res) => {
    try {
        const id = requestId(req);
        if (!id) return fail(res, 404, "Request not found.");
        await inventory.expireStale(req.actor.id);

        const out = await tx(async (conn) => {
            const r = await lockRequest(conn, id, req.actor.id);
            if (!r) return notFound;
            if (r.status !== "Accepted") return wrongState(r, "reserved");
            if (await reservedUnits(conn, id)) return { error: { code: 409, message: "Stock is already reserved for this request." } };

            const result = await inventory.reserveUnits(conn, req.actor.id, id, r.blood_group, r.units_required);
            if (!result.ok) {
                return { error: { code: 409, message: `Only ${plural(result.available, "unit")} of ${r.blood_group} ${result.available === 1 ? "is" : "are"} in stock, but this request needs ${r.units_required}. Add stock in Inventory first.` } };
            }
            return { r };
        });
        if (out.error) return fail(res, out.error.code, out.error.message);

        const name = await bankName(req.actor.id);
        await tell(req, out.r.requester_id, "bank_request_reserved",
            `${name} has reserved ${plural(out.r.units_required, "unit")} of ${out.r.blood_group} for you. Please collect it soon.`);
        res.json({ success: true, message: `${plural(out.r.units_required, "unit")} of ${out.r.blood_group} reserved.` });
    } catch (error) {
        console.error("bank reserve error:", error);
        fail(res, 500, "Could not reserve the stock.");
    }
};

// Reserved -> back to Approved
const release = async (req, res) => {
    try {
        const id = requestId(req);
        if (!id) return fail(res, 404, "Request not found.");

        const out = await tx(async (conn) => {
            const r = await lockRequest(conn, id, req.actor.id);
            if (!r) return notFound;
            if (r.status !== "Accepted") return wrongState(r, "released");
            const units = await inventory.releaseReservations(conn, id, "Reservation released by the blood bank");
            if (!units) return { error: { code: 409, message: "There is no reserved stock for this request." } };
            return { r, units };
        });
        if (out.error) return fail(res, out.error.code, out.error.message);

        const name = await bankName(req.actor.id);
        await tell(req, out.r.requester_id, "bank_request_released",
            `${name} released the stock it had reserved for your request. It is still approved.`);
        res.json({ success: true, message: `${plural(out.units, "unit")} returned to stock.` });
    } catch (error) {
        console.error("bank release error:", error);
        fail(res, 500, "Could not release the reservation.");
    }
};

// Accepted (reserved or not) -> Completed. Hands the blood over.
const issue = async (req, res) => {
    try {
        const id = requestId(req);
        if (!id) return fail(res, 404, "Request not found.");
        await inventory.expireStale(req.actor.id);

        const out = await tx(async (conn) => {
            const r = await lockRequest(conn, id, req.actor.id);
            if (!r) return notFound;
            if (r.status !== "Accepted") return wrongState(r, "issued");

            const reason = `Request #${id}: ${r.patient_name}, ${r.hospital_name}`.slice(0, 255);
            const [held] = await conn.execute(
                `SELECT s.reservation_id, s.batch_id, s.blood_group, s.units, (b.expires_on >= CURDATE()) AS fresh
                 FROM blood_reservation s LEFT JOIN blood_batch b ON b.batch_id = s.batch_id
                 WHERE s.request_id = ? FOR UPDATE`,
                [id]
            );

            if (held.length) {
                if (held.some((h) => !Number(h.fresh))) {
                    return { error: { code: 409, message: "Some reserved units have expired. Release the reservation and reserve again." } };
                }
                for (const h of held) {
                    await conn.execute(
                        "INSERT INTO inventory_log (bloodbank_id, batch_id, blood_group, action, change_units, reason) VALUES (?, ?, ?, 'Issued', ?, ?)",
                        [req.actor.id, h.batch_id, h.blood_group, -h.units, reason]
                    );
                }
                await conn.execute("DELETE FROM blood_reservation WHERE request_id = ?", [id]);
            } else {
                const result = await inventory.issueUnits(conn, req.actor.id, r.blood_group, r.units_required, reason);
                if (!result.ok) {
                    return { error: { code: 409, message: `Only ${plural(result.available, "unit")} of ${r.blood_group} ${result.available === 1 ? "is" : "are"} in stock, but this request needs ${r.units_required}.` } };
                }
            }

            await conn.execute("UPDATE blood_request SET status = 'Completed', issued_at = NOW() WHERE request_id = ?", [id]);
            return { r };
        });
        if (out.error) return fail(res, out.error.code, out.error.message);

        const name = await bankName(req.actor.id);
        await tell(req, out.r.requester_id, "bank_request_issued",
            `${name} issued ${plural(out.r.units_required, "unit")} of ${out.r.blood_group} for ${out.r.patient_name}.`);
        res.json({ success: true, message: `${plural(out.r.units_required, "unit")} of ${out.r.blood_group} issued.` });
    } catch (error) {
        console.error("bank issue error:", error);
        fail(res, 500, "Could not issue the blood.");
    }
};

// Pending or Accepted -> Rejected (releases any reserved stock)
const reject = async (req, res) => {
    try {
        const id = requestId(req);
        if (!id) return fail(res, 404, "Request not found.");
        const reason = String((req.body || {}).reason || "").trim();
        if (reason.length < 3 || reason.length > 250) return fail(res, 400, "Please enter a reason (3-250 characters).");

        const out = await tx(async (conn) => {
            const r = await lockRequest(conn, id, req.actor.id);
            if (!r) return notFound;
            if (!["Pending", "Accepted"].includes(r.status)) return wrongState(r, "rejected");
            await inventory.releaseReservations(conn, id, "Request rejected");
            await conn.execute("UPDATE blood_request SET status = 'Rejected', status_reason = ? WHERE request_id = ?", [reason, id]);
            return { r };
        });
        if (out.error) return fail(res, out.error.code, out.error.message);

        const name = await bankName(req.actor.id);
        await tell(req, out.r.requester_id, "bank_request_rejected",
            `${name} could not fulfil your request for ${plural(out.r.units_required, "unit")} of ${out.r.blood_group}: ${reason}`);
        res.json({ success: true, message: "Request rejected." });
    } catch (error) {
        console.error("bank reject error:", error);
        fail(res, 500, "Could not reject the request.");
    }
};

module.exports = { list, approve, reserve, release, issue, reject };