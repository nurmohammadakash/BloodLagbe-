const db = require("../config/db");

// Keeps blood_inventory.unit_count equal to the usable units held in batches
const syncGroup = async (conn, bankId, group) => {
    const [[row]] = await conn.execute(
        `SELECT COALESCE(SUM(units_left), 0) AS total FROM blood_batch
         WHERE bloodbank_id = ? AND blood_group = ? AND status = 'Available' AND expires_on >= CURDATE()`,
        [bankId, group]
    );
    await conn.execute(
        `INSERT INTO blood_inventory (bloodbank_id, blood_group, unit_count) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE unit_count = VALUES(unit_count)`,
        [bankId, group, Number(row.total)]
    );
};

// First-expiry-first-out. Call inside a transaction; returns { ok, available }
const issueUnits = async (conn, bankId, group, units, reason) => {
    const [batches] = await conn.execute(
        `SELECT batch_id, units_left FROM blood_batch
         WHERE bloodbank_id = ? AND blood_group = ? AND status = 'Available' AND units_left > 0 AND expires_on >= CURDATE()
         ORDER BY expires_on ASC, batch_id ASC FOR UPDATE`,
        [bankId, group]
    );
    const available = batches.reduce((s, b) => s + b.units_left, 0);
    if (available < units) return { ok: false, available };

    let need = units;
    for (const b of batches) {
        if (!need) break;
        const take = Math.min(b.units_left, need);
        const left = b.units_left - take;
        await conn.execute("UPDATE blood_batch SET units_left = ?, status = ? WHERE batch_id = ?", [left, left === 0 ? "Depleted" : "Available", b.batch_id]);
        await conn.execute(
            "INSERT INTO inventory_log (bloodbank_id, batch_id, blood_group, action, change_units, reason) VALUES (?, ?, ?, 'Issued', ?, ?)",
            [bankId, b.batch_id, group, -take, reason]
        );
        need -= take;
    }
    await syncGroup(conn, bankId, group);
    return { ok: true, available };
};

// ---------------------------------------------------------------
// Reservations (Step 5)
// Reserved units are taken out of blood_batch.units_left, so all stock
// screens show only free units. The blood_reservation rows remember which
// batch each reserved unit came from.
// ---------------------------------------------------------------

// First-expiry-first-out, all or nothing. Call inside a transaction.
const reserveUnits = async (conn, bankId, requestId, group, units) => {
    const [batches] = await conn.execute(
        `SELECT batch_id, units_left FROM blood_batch
         WHERE bloodbank_id = ? AND blood_group = ? AND status = 'Available' AND units_left > 0 AND expires_on >= CURDATE()
         ORDER BY expires_on ASC, batch_id ASC FOR UPDATE`,
        [bankId, group]
    );
    const available = batches.reduce((s, b) => s + b.units_left, 0);
    if (available < units) return { ok: false, available };

    let need = units;
    for (const b of batches) {
        if (!need) break;
        const take = Math.min(b.units_left, need);
        const left = b.units_left - take;
        await conn.execute("UPDATE blood_batch SET units_left = ?, status = ? WHERE batch_id = ?", [left, left === 0 ? "Depleted" : "Available", b.batch_id]);
        await conn.execute(
            "INSERT INTO blood_reservation (request_id, bloodbank_id, batch_id, blood_group, units) VALUES (?, ?, ?, ?, ?)",
            [requestId, bankId, b.batch_id, group, take]
        );
        need -= take;
    }
    await syncGroup(conn, bankId, group);
    return { ok: true, available };
};

// Puts reserved units back into stock. Units from a batch that expired or was
// discarded in the meantime are written off in the activity log instead.
// Call inside a transaction.
const releaseReservations = async (conn, requestId, why = "Reservation released") => {
    const [rows] = await conn.execute(
        "SELECT reservation_id, bloodbank_id, batch_id, blood_group, units FROM blood_reservation WHERE request_id = ? FOR UPDATE",
        [requestId]
    );
    const groups = new Set();
    for (const r of rows) {
        const [[batch]] = await conn.execute(
            "SELECT status, (expires_on >= CURDATE()) AS fresh FROM blood_batch WHERE batch_id = ? FOR UPDATE",
            [r.batch_id]
        );
        if (batch && batch.status !== "Discarded" && batch.status !== "Expired" && Number(batch.fresh) === 1) {
            await conn.execute("UPDATE blood_batch SET units_left = units_left + ?, status = 'Available' WHERE batch_id = ?", [r.units, r.batch_id]);
        } else {
            const discarded = batch && batch.status === "Discarded";
            if (batch && !discarded && batch.status !== "Expired") {
                await conn.execute("UPDATE blood_batch SET status = 'Expired' WHERE batch_id = ?", [r.batch_id]);
            }
            await conn.execute(
                "INSERT INTO inventory_log (bloodbank_id, batch_id, blood_group, action, change_units, reason) VALUES (?, ?, ?, ?, ?, ?)",
                [r.bloodbank_id, r.batch_id, r.blood_group, discarded ? "Discarded" : "Expired", -r.units, `${why}: reserved units were no longer usable`]
            );
        }
        groups.add(`${r.bloodbank_id}|${r.blood_group}`);
    }
    await conn.execute("DELETE FROM blood_reservation WHERE request_id = ?", [requestId]);
    for (const key of groups) {
        const [bankId, group] = key.split("|");
        await syncGroup(conn, Number(bankId), group);
    }
    return rows.reduce((s, r) => s + r.units, 0);
};

// Releases reservations whose request was cancelled, expired or rejected by
// someone else (for example the admin or the automatic expiry).
const releaseOrphaned = async (bankId) => {
    const [rows] = await db.execute(
        `SELECT DISTINCT s.request_id FROM blood_reservation s
         JOIN blood_request r ON r.request_id = s.request_id
         WHERE s.bloodbank_id = ? AND r.status <> 'Accepted' LIMIT 20`,
        [bankId]
    );
    for (const { request_id } of rows) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await releaseReservations(conn, request_id, "Request closed");
            await conn.commit();
        } catch (error) {
            await conn.rollback();
            console.error("releaseOrphaned error:", error.message);
        } finally {
            conn.release();
        }
    }
};

// Marks batches that passed their expiry date as Expired and logs the loss
const expireStale = async (bankId) => {
    await releaseOrphaned(bankId);

    const [stale] = await db.execute(
        "SELECT batch_id FROM blood_batch WHERE bloodbank_id = ? AND status = 'Available' AND expires_on < CURDATE() LIMIT 1",
        [bankId]
    );
    if (!stale.length) return;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.execute(
            "SELECT batch_id, blood_group, units_left FROM blood_batch WHERE bloodbank_id = ? AND status = 'Available' AND expires_on < CURDATE() FOR UPDATE",
            [bankId]
        );
        for (const b of rows) {
            await conn.execute("UPDATE blood_batch SET status = 'Expired' WHERE batch_id = ?", [b.batch_id]);
            if (b.units_left > 0) {
                await conn.execute(
                    "INSERT INTO inventory_log (bloodbank_id, batch_id, blood_group, action, change_units, reason) VALUES (?, ?, ?, 'Expired', ?, 'Passed expiry date')",
                    [bankId, b.batch_id, b.blood_group, -b.units_left]
                );
            }
        }
        for (const g of new Set(rows.map((r) => r.blood_group))) await syncGroup(conn, bankId, g);
        await conn.commit();
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

module.exports = { syncGroup, expireStale, issueUnits, reserveUnits, releaseReservations, releaseOrphaned };