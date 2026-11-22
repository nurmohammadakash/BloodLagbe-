const db = require("../../config/db");
const inventory = require("../../services/inventory.service");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SOURCES = ["Donation", "Camp", "Transfer", "Other"];
const STATUSES = ["Available", "Expired", "Depleted", "Discarded"];
const MAX_BATCH_UNITS = 500;

const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const isDate = (v) => {
    const s = String(v || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const toInt = (v) => (/^-?\d+$/.test(String(v).trim()) ? Number(v) : NaN);

const withTransaction = async (work) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const out = await work(conn);
        if (out && out.rollback) await conn.rollback();
        else await conn.commit();
        return out;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const summary = async (req, res) => {
    try {
        const id = req.actor.id;
        await inventory.expireStale(id);

        const [cfg] = await db.execute(
            "SELECT low_stock_threshold, critical_stock_threshold, expiry_warning_days FROM bank_settings WHERE bloodbank_id = ?",
            [id]
        );
        const low = cfg.length ? cfg[0].low_stock_threshold : 5;
        const critical = cfg.length ? cfg[0].critical_stock_threshold : 2;
        const expiryDays = cfg.length ? cfg[0].expiry_warning_days : 7;

        const [rows] = await db.execute(
            `SELECT blood_group, SUM(units_left) AS units, COUNT(*) AS batches,
                    DATE_FORMAT(MIN(expires_on), '%d %b %Y') AS next_expiry, DATEDIFF(MIN(expires_on), CURDATE()) AS days_left
             FROM blood_batch
             WHERE bloodbank_id = ? AND status = 'Available' AND units_left > 0 AND expires_on >= CURDATE()
             GROUP BY blood_group`,
            [id]
        );
        const byGroup = Object.fromEntries(rows.map((r) => [r.blood_group, r]));

        const [inv] = await db.execute("SELECT blood_group, unit_count FROM blood_inventory WHERE bloodbank_id = ?", [id]);
        const counted = Object.fromEntries(inv.map((r) => [r.blood_group, Number(r.unit_count)]));

        const groups = BLOOD_GROUPS.map((g) => {
            const r = byGroup[g];
            const units = r ? Number(r.units) : 0;
            const level = units <= 0 ? "Out" : units <= critical ? "Critical" : units <= low ? "Low" : "Good";
            return {
                blood_group: g, units, level, batches: r ? Number(r.batches) : 0,
                next_expiry: r ? r.next_expiry : null, days_left: r ? Number(r.days_left) : null,
                untracked: Math.max(0, (counted[g] || 0) - units)
            };
        });

        res.json({
            success: true,
            thresholds: { low, critical, expiryDays },
            groups,
            totalUnits: groups.reduce((s, x) => s + x.units, 0),
            untrackedUnits: groups.reduce((s, x) => s + x.untracked, 0)
        });
    } catch (error) {
        console.error("inventory summary error:", error);
        res.status(500).json({ success: false, message: "Could not load inventory." });
    }
};

const listBatches = async (req, res) => {
    try {
        const id = req.actor.id;
        await inventory.expireStale(id);

        const status = STATUSES.includes(req.query.status) ? req.query.status : req.query.status === "all" ? null : "Available";
        const group = BLOOD_GROUPS.includes(req.query.group) ? req.query.group : null;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

        const where = ["bloodbank_id = ?"];
        const params = [id];
        if (status) { where.push("status = ?"); params.push(status); }
        if (group) { where.push("blood_group = ?"); params.push(group); }
        const whereSql = where.join(" AND ");

        const [[total]] = await db.execute(`SELECT COUNT(*) AS c FROM blood_batch WHERE ${whereSql}`, params);
        const [items] = await db.query(
            `SELECT batch_id, blood_group, units_received, units_left, source, note, status,
                    DATE_FORMAT(collected_on, '%d %b %Y') AS collected_on,
                    DATE_FORMAT(expires_on, '%d %b %Y') AS expires_on,
                    DATEDIFF(expires_on, CURDATE()) AS days_left
             FROM blood_batch WHERE ${whereSql}
             ORDER BY ${status === "Available" || !status ? "FIELD(status,'Available','Depleted','Expired','Discarded'), expires_on ASC" : "updated_at DESC"}, batch_id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        );

        const [counts] = await db.execute("SELECT status, COUNT(*) AS c FROM blood_batch WHERE bloodbank_id = ? GROUP BY status", [id]);
        const tabCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
        counts.forEach((r) => { tabCounts[r.status] = Number(r.c); });

        res.json({
            success: true, items, counts: tabCounts,
            pagination: { page, limit, total: Number(total.c), pages: Math.max(1, Math.ceil(Number(total.c) / limit)) }
        });
    } catch (error) {
        console.error("inventory list error:", error);
        res.status(500).json({ success: false, message: "Could not load batches." });
    }
};

const addBatch = async (req, res) => {
    try {
        const id = req.actor.id;
        const b = req.body || {};
        const errors = {};

        const group = String(b.blood_group || "");
        if (!BLOOD_GROUPS.includes(group)) errors.blood_group = "Choose a blood group.";

        const units = toInt(b.units);
        if (!Number.isInteger(units) || units < 1 || units > MAX_BATCH_UNITS) errors.units = `Enter 1 to ${MAX_BATCH_UNITS} units.`;

        const today = todayStr();
        const collected = String(b.collected_on || "");
        const expires = String(b.expires_on || "");
        if (!isDate(collected)) errors.collected_on = "Enter the collection date.";
        else if (collected > today) errors.collected_on = "Collection date cannot be in the future.";
        if (!isDate(expires)) errors.expires_on = "Enter the expiry date.";
        else if (isDate(collected) && expires <= collected) errors.expires_on = "Expiry must be after the collection date.";
        else if (expires < today) errors.expires_on = "This batch has already expired.";

        const source = SOURCES.includes(b.source) ? b.source : "Donation";
        const note = String(b.note || "").trim();
        if (note.length > 255) errors.note = "Keep the note under 255 characters.";

        if (Object.keys(errors).length) {
            return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
        }

        const batchId = await withTransaction(async (conn) => {
            const [r] = await conn.execute(
                `INSERT INTO blood_batch (bloodbank_id, blood_group, units_received, units_left, collected_on, expires_on, source, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, group, units, units, collected, expires, source, note || null]
            );
            await conn.execute(
                "INSERT INTO inventory_log (bloodbank_id, batch_id, blood_group, action, change_units, reason) VALUES (?, ?, ?, 'Received', ?, ?)",
                [id, r.insertId, group, units, note || `${source} batch added`]
            );
            await inventory.syncGroup(conn, id, group);
            return r.insertId;
        });

        res.status(201).json({ success: true, batch_id: batchId, message: `${units} unit${units === 1 ? "" : "s"} of ${group} added.` });
    } catch (error) {
        console.error("inventory add error:", error);
        res.status(500).json({ success: false, message: "Could not add the batch." });
    }
};

const issue = async (req, res) => {
    try {
        const id = req.actor.id;
        const b = req.body || {};
        const group = String(b.blood_group || "");
        const units = toInt(b.units);
        const reason = String(b.reason || "").trim();

        if (!BLOOD_GROUPS.includes(group)) return res.status(400).json({ success: false, message: "Choose a blood group." });
        if (!Number.isInteger(units) || units < 1 || units > MAX_BATCH_UNITS) {
            return res.status(400).json({ success: false, message: `Enter 1 to ${MAX_BATCH_UNITS} units.` });
        }
        if (reason.length < 3 || reason.length > 255) {
            return res.status(400).json({ success: false, message: "Enter who the blood is issued to (3-255 characters)." });
        }

        await inventory.expireStale(id);
        const result = await withTransaction(async (conn) => {
            const r = await inventory.issueUnits(conn, id, group, units, reason);
            return r.ok ? r : { ...r, rollback: true };
        });

        if (!result.ok) {
            return res.status(409).json({ success: false, message: `Only ${result.available} unit${result.available === 1 ? "" : "s"} of ${group} available.` });
        }
        res.json({ success: true, message: `${units} unit${units === 1 ? "" : "s"} of ${group} issued (oldest first).` });
    } catch (error) {
        console.error("inventory issue error:", error);
        res.status(500).json({ success: false, message: "Could not issue the units." });
    }
};

const discard = async (req, res) => {
    try {
        const id = req.actor.id;
        const batchId = Number(req.params.id);
        const reason = String((req.body || {}).reason || "").trim();
        if (!Number.isInteger(batchId)) return res.status(404).json({ success: false, message: "Batch not found." });
        if (reason.length < 3 || reason.length > 255) {
            return res.status(400).json({ success: false, message: "Please enter a reason (3-255 characters)." });
        }

        const result = await withTransaction(async (conn) => {
            const [rows] = await conn.execute("SELECT * FROM blood_batch WHERE batch_id = ? AND bloodbank_id = ? FOR UPDATE", [batchId, id]);
            const batch = rows[0];
            if (!batch) return { code: 404, message: "Batch not found.", rollback: true };
            if (batch.status !== "Available") return { code: 409, message: `A ${batch.status.toLowerCase()} batch cannot be discarded.`, rollback: true };

            if (batch.units_left > 0) {
                await conn.execute(
                    "INSERT INTO inventory_log (bloodbank_id, batch_id, blood_group, action, change_units, reason) VALUES (?, ?, ?, 'Discarded', ?, ?)",
                    [id, batchId, batch.blood_group, -batch.units_left, reason]
                );
            }
            await conn.execute("UPDATE blood_batch SET status = 'Discarded' WHERE batch_id = ?", [batchId]);
            await inventory.syncGroup(conn, id, batch.blood_group);
            return { ok: true, units: batch.units_left, group: batch.blood_group };
        });

        if (!result.ok) return res.status(result.code).json({ success: false, message: result.message });
        res.json({ success: true, message: `${result.units} unit${result.units === 1 ? "" : "s"} of ${result.group} discarded.` });
    } catch (error) {
        console.error("inventory discard error:", error);
        res.status(500).json({ success: false, message: "Could not discard the batch." });
    }
};

const log = async (req, res) => {
    try {
        const id = req.actor.id;
        await inventory.expireStale(id);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));

        const [[total]] = await db.execute("SELECT COUNT(*) AS c FROM inventory_log WHERE bloodbank_id = ?", [id]);
        const [items] = await db.query(
            `SELECT log_id, batch_id, blood_group, action, change_units, reason,
                    DATE_FORMAT(created_at, '%d %b %Y, %h:%i %p') AS at
             FROM inventory_log WHERE bloodbank_id = ?
             ORDER BY log_id DESC LIMIT ? OFFSET ?`,
            [id, limit, (page - 1) * limit]
        );
        res.json({
            success: true, items,
            pagination: { page, limit, total: Number(total.c), pages: Math.max(1, Math.ceil(Number(total.c) / limit)) }
        });
    } catch (error) {
        console.error("inventory log error:", error);
        res.status(500).json({ success: false, message: "Could not load the activity log." });
    }
};

module.exports = { summary, listBatches, addBatch, issue, discard, log };