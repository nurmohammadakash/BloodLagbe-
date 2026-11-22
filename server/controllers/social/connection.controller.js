const db = require("../../config/db");
const { notify } = require("../../services/notify.service");
const { BLOOD_GROUPS, getActorInfo } = require("../../utils/social.helpers");
const H = require("../../utils/connection.helpers");

const MIN_DAYS_BETWEEN_DONATIONS = 56;
const MAX_APPLICATIONS_PER_DAY = 5;
const SUBMITTED_EXPIRE_DAYS = 7;
const PENDING_EXPIRE_DAYS = 30;
const REQUIRE_PROFILE_BLOOD_GROUP_MATCH = true;
const DETAIL_VISIBLE = ["Submitted", "Pending", "Successful"];
// compares names ignoring case and extra spaces
const sameName = (a, b) =>
    String(a || "").toLowerCase().replace(/\s+/g, " ").trim() === String(b || "").toLowerCase().replace(/\s+/g, " ").trim();
const fail = (res, status, message, extra = {}) =>
    res.status(status).json({ success: false, message, ...extra });

const expireStale = async () => {
    await db.execute(
        `UPDATE blood_connection
         SET status = 'Cancelled', cancelled_by = 'System', cancelled_at = NOW(),
             status_reason = 'No response within ${SUBMITTED_EXPIRE_DAYS} days'
         WHERE status = 'Submitted' AND created_at < DATE_SUB(NOW(), INTERVAL ${SUBMITTED_EXPIRE_DAYS} DAY)`
    );
    await db.execute(
        `UPDATE blood_connection
         SET status = 'Cancelled', cancelled_by = 'System', cancelled_at = NOW(),
             status_reason = 'Not completed within ${PENDING_EXPIRE_DAYS} days'
         WHERE status = 'Pending' AND confirmed_at < DATE_SUB(NOW(), INTERVAL ${PENDING_EXPIRE_DAYS} DAY)`
    );
};

const findActiveNote = async (ownerId) => {
    const [rows] = await db.execute(
        `SELECT u.user_id, u.full_name, u.username, u.profile_picture, n.note_type, n.blood_group
         FROM user u
         JOIN user_note n ON n.user_id = u.user_id
         WHERE u.user_id = ? AND u.account_status = 'Active' AND n.expires_at > NOW()`,
        [ownerId]
    );
    return rows[0] || null;
};

const roleForNote = (noteType) => (noteType === "Need" ? "Donor" : "Receiver");

const getForm = async (req, res) => {
    try {
        const me = req.actor.id;
        const ownerId = Number(req.params.ownerId);
        if (!Number.isInteger(ownerId)) return fail(res, 400, "Invalid note.");
        if (ownerId === me) return fail(res, 400, "You cannot respond to your own note.");

        const note = await findActiveNote(ownerId);
        if (!note) return fail(res, 404, "This note is no longer available.");

        const [profiles] = await db.execute(
            "SELECT full_name, phone, email, blood_group, address FROM user WHERE user_id = ?",
            [me]
        );
        const [existing] = await db.execute(
            `SELECT connection_id, status FROM blood_connection
             WHERE note_owner_id = ? AND applicant_id = ? AND status IN ('Submitted','Pending') LIMIT 1`,
            [ownerId, me]
        );

        res.json({
            success: true,
            role: roleForNote(note.note_type),
            note: { note_type: note.note_type, blood_group: note.blood_group },
            owner: { user_id: note.user_id, full_name: note.full_name, username: note.username, profile_picture: note.profile_picture },
            prefill: {
                full_name: profiles[0].full_name,
                mobile: profiles[0].phone,
                email: profiles[0].email,
                blood_group: profiles[0].blood_group,
                address: profiles[0].address || ""
            },
            existing: existing[0] || null
        });
    } catch (error) {
        console.error("connection getForm error:", error);
        fail(res, 500, "Server Error");
    }
};

const validateForm = (role, body) => {
    const errors = {};
    const v = {};

    v.full_name = String(body.full_name || "").trim();
    v.father_name = String(body.father_name || "").trim();
    v.mother_name = String(body.mother_name || "").trim();
    if (!H.isValidName(v.full_name)) errors.full_name = "Enter your full name (letters only).";
    if (!H.isValidName(v.father_name)) errors.father_name = "Enter your father's name (letters only).";
    if (!H.isValidName(v.mother_name)) errors.mother_name = "Enter your mother's name (letters only).";

    v.address = String(body.address || "").trim();
    if (v.address.length < 5 || v.address.length > 255) errors.address = "Enter your current address (5-255 characters).";

    v.blood_group = String(body.blood_group || "");
    if (!BLOOD_GROUPS.includes(v.blood_group)) errors.blood_group = "Choose a blood group.";

    v.mobile = H.normalizeMobile(body.mobile);
    if (!v.mobile) errors.mobile = "Enter a valid Bangladeshi mobile number (01XXXXXXXXX).";

    v.email = H.normalizeEmail(body.email);
    if (!v.email) errors.email = "Enter a valid email address.";

    v.nid = H.normalizeNid(body.nid);
    if (!v.nid) errors.nid = "NID must be 10, 13 or 17 digits.";

    const consent = body.consent === true || body.consent === "true" || body.consent === "on" || body.consent === 1;
    if (!consent) errors.consent = "You must agree to share your details with the note owner.";

    v.last_donation_date = null;
    v.previous_donations = null;
    v.has_blood_disease = null;
    v.illness_reason = null;
    v.received_before = null;

    if (role === "Donor") {
        const count = Number(body.previous_donations);
        if (body.previous_donations === "" || body.previous_donations == null || !Number.isInteger(count) || count < 0 || count > 500) {
            errors.previous_donations = "Enter how many times you have donated (0 if never).";
        } else {
            v.previous_donations = count;
        }

        const last = String(body.last_donation_date || "").trim();
        if (last) {
            if (!H.isValidDateStr(last)) errors.last_donation_date = "Enter a valid date.";
            else if (last > H.todayStr()) errors.last_donation_date = "Date cannot be in the future.";
            else if (last < "1960-01-01") errors.last_donation_date = "Enter a valid date.";
            else v.last_donation_date = last;
        }
        if (v.previous_donations > 0 && !last && !errors.last_donation_date) {
            errors.last_donation_date = "Enter the date of your last donation.";
        }
        if (v.previous_donations === 0 && last) {
            errors.previous_donations = "Must be at least 1 if you have a last donation date.";
        }

        if (!["Yes", "No"].includes(body.has_blood_disease)) errors.has_blood_disease = "Please answer this question.";
        else v.has_blood_disease = body.has_blood_disease;
    } else {
        v.illness_reason = String(body.illness_reason || "").trim();
        if (v.illness_reason.length < 3 || v.illness_reason.length > 500) {
            errors.illness_reason = "Describe the disease or sickness (3-500 characters).";
        }
        if (!["Yes", "No"].includes(body.received_before)) errors.received_before = "Please answer this question.";
        else v.received_before = body.received_before;
    }

    return { errors, v };
};

const submit = async (req, res) => {
    try {
        const me = req.actor.id;
        const body = req.body || {};
        const ownerId = Number(body.owner_id);

        if (!Number.isInteger(ownerId)) return fail(res, 400, "Invalid note.");
        if (ownerId === me) return fail(res, 400, "You cannot respond to your own note.");

        const note = await findActiveNote(ownerId);
        if (!note) return fail(res, 404, "This note is no longer available.");

        const role = roleForNote(note.note_type);

        const [dup] = await db.execute(
            `SELECT connection_id FROM blood_connection
             WHERE note_owner_id = ? AND applicant_id = ? AND status IN ('Submitted','Pending') LIMIT 1`,
            [ownerId, me]
        );
        if (dup.length) return fail(res, 409, "You have already responded to this person.");

        const [[recent]] = await db.execute(
            "SELECT COUNT(*) AS c FROM blood_connection WHERE applicant_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)",
            [me]
        );
        if (Number(recent.c) >= MAX_APPLICATIONS_PER_DAY) {
            return fail(res, 429, `You can send at most ${MAX_APPLICATIONS_PER_DAY} requests per day. Please try again tomorrow.`);
        }

        const { errors, v } = validateForm(role, body);

        const [profiles] = await db.execute(
            "SELECT blood_group, DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS dob FROM user WHERE user_id = ?",
            [me]
        );
        const profile = profiles[0];

        if (!errors.blood_group) {
            if (REQUIRE_PROFILE_BLOOD_GROUP_MATCH && v.blood_group !== profile.blood_group) {
                errors.blood_group = `Must match the blood group on your profile (${profile.blood_group}).`;
            } else if (role === "Donor" && !H.canDonate(v.blood_group, note.blood_group)) {
                errors.blood_group = `${v.blood_group} blood cannot be given to someone who needs ${note.blood_group}.`;
            } else if (role === "Receiver" && !H.canDonate(note.blood_group, v.blood_group)) {
                errors.blood_group = `${v.blood_group} patients cannot receive ${note.blood_group} blood.`;
            }
        }

        if (!errors.mobile) {
            const [a] = await db.execute("SELECT 1 FROM user WHERE phone = ? AND user_id <> ? LIMIT 1", [v.mobile, me]);
            const [b] = await db.execute("SELECT 1 FROM blood_bank WHERE phone = ? LIMIT 1", [v.mobile]);
            const [c] = await db.execute("SELECT 1 FROM blood_connection WHERE mobile = ? AND applicant_id <> ? LIMIT 1", [v.mobile, me]);
            if (a.length || b.length || c.length) errors.mobile = "This mobile number belongs to another person.";
        }
        if (!errors.email) {
            const [a] = await db.execute("SELECT 1 FROM user WHERE email = ? AND user_id <> ? LIMIT 1", [v.email, me]);
            const [b] = await db.execute("SELECT 1 FROM blood_bank WHERE email = ? LIMIT 1", [v.email]);
            const [c] = await db.execute("SELECT 1 FROM blood_connection WHERE email = ? AND applicant_id <> ? LIMIT 1", [v.email, me]);
            if (a.length || b.length || c.length) errors.email = "This email address belongs to another person.";
        }
        if (!errors.nid) {
            // the NID must exist in the (fake) national ID dataset and belong to this person
            const [reg] = await db.execute(
                "SELECT full_name, DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS dob FROM nid_registry WHERE nid = ? LIMIT 1",
                [v.nid]
            );
            if (!reg.length) {
                errors.nid = "This NID was not found in the national ID records.";
            } else if (!sameName(reg[0].full_name, v.full_name) || reg[0].dob !== profile.dob) {
                errors.nid = "This NID does not match the name and date of birth on your account.";
            } else {
                const [c] = await db.execute("SELECT 1 FROM blood_connection WHERE nid = ? AND applicant_id <> ? LIMIT 1", [v.nid, me]);
                if (c.length) errors.nid = "This NID has already been used by another person.";
            }
        }

        if (Object.keys(errors).length) {
            return fail(res, 400, "Please fix the highlighted fields.", { errors });
        }

        let rejection = null;
        if (role === "Donor") {
            if (v.has_blood_disease === "Yes") {
                rejection = {
                    reason: "Declared a blood related disease",
                    message: "Based on your answers, you are not eligible to donate blood. Thank you for your willingness to help."
                };
            } else if (H.ageOn(profile.dob, H.todayStr()) < 18) {
                rejection = {
                    reason: "Under 18 years old",
                    message: "You must be at least 18 years old to donate blood."
                };
            } else if (v.last_donation_date && H.diffDays(H.todayStr(), v.last_donation_date) < MIN_DAYS_BETWEEN_DONATIONS) {
                const next = H.addDays(v.last_donation_date, MIN_DAYS_BETWEEN_DONATIONS);
                rejection = {
                    reason: `Donated too recently (last donation ${v.last_donation_date})`,
                    message: `You donated recently. Please wait until ${next} before donating again.`
                };
            }
        }

        const [result] = await db.execute(
            `INSERT INTO blood_connection
             (note_owner_id, applicant_id, note_type, note_blood_group, applicant_role,
              full_name, father_name, mother_name, address, blood_group, mobile, email, nid,
              last_donation_date, previous_donations, has_blood_disease, illness_reason, received_before,
              status, status_reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ownerId, me, note.note_type, note.blood_group, role,
                v.full_name, v.father_name, v.mother_name, v.address, v.blood_group, v.mobile, v.email, v.nid,
                v.last_donation_date, v.previous_donations, v.has_blood_disease, v.illness_reason, v.received_before,
                rejection ? "Rejected" : "Submitted", rejection ? rejection.reason : null
            ]
        );

        if (rejection) {
            return res.status(201).json({ success: true, outcome: "rejected", message: rejection.message });
        }

        await notify({
            recipientId: ownerId,
            actor: req.actor,
            type: "connection_request",
            message: role === "Donor"
                ? `${v.full_name} wants to donate ${note.blood_group} blood to you.`
                : `${v.full_name} wants to receive blood from you.`,
            link: `/connection?id=${result.insertId}`
        });

        res.status(201).json({
            success: true,
            outcome: "submitted",
            connection_id: result.insertId,
            message: `Your details were sent to ${note.full_name}. You will be notified when they respond.`
        });
    } catch (error) {
        console.error("connection submit error:", error);
        fail(res, 500, "Server Error");
    }
};

const mine = async (req, res) => {
    try {
        await expireStale();
        const me = req.actor.id;
        const [rows] = await db.execute(
            `SELECT c.connection_id, c.status, c.status_reason, c.note_type, c.note_blood_group, c.applicant_role,
                    c.created_at, c.confirmed_at, c.completed_at,
                    CASE WHEN c.note_owner_id = ? THEN 'owner' ELSE 'applicant' END AS my_side,
                    o.user_id AS owner_id, o.full_name AS owner_name, o.username AS owner_username, o.profile_picture AS owner_picture,
                    a.user_id AS applicant_id, a.full_name AS applicant_name, a.username AS applicant_username, a.profile_picture AS applicant_picture,
                    EXISTS(SELECT 1 FROM connection_review r WHERE r.connection_id = c.connection_id AND r.rater_id = ?) AS i_reviewed
             FROM blood_connection c
             JOIN user o ON o.user_id = c.note_owner_id
             JOIN user a ON a.user_id = c.applicant_id
             WHERE (c.note_owner_id = ? AND c.status <> 'Rejected') OR c.applicant_id = ?
             ORDER BY c.connection_id DESC LIMIT 100`,
            [me, me, me, me]
        );
        res.json({
            success: true,
            waiting_for_me: rows.filter(r => r.my_side === "owner" && r.status === "Submitted").length,
            connections: rows.map(r => ({ ...r, i_reviewed: !!r.i_reviewed }))
        });
    } catch (error) {
        console.error("connection mine error:", error);
        fail(res, 500, "Server Error");
    }
};

const getOne = async (req, res) => {
    try {
        await expireStale();
        const me = req.actor.id;
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return fail(res, 404, "Connection not found.");

        const [rows] = await db.execute(
            `SELECT c.*, o.full_name AS owner_name, o.username AS owner_username, o.profile_picture AS owner_picture,
                    o.phone AS owner_phone, o.email AS owner_email,
                    a.username AS applicant_username, a.profile_picture AS applicant_picture
             FROM blood_connection c
             JOIN user o ON o.user_id = c.note_owner_id
             JOIN user a ON a.user_id = c.applicant_id
             WHERE c.connection_id = ? AND (c.note_owner_id = ? OR c.applicant_id = ?)`,
            [id, me, me]
        );
        const c = rows[0];
        if (!c || (c.note_owner_id === me && c.status === "Rejected")) {
            return fail(res, 404, "Connection not found.");
        }

        const side = c.note_owner_id === me ? "owner" : "applicant";
        const showApplicantDetails = side === "applicant" || DETAIL_VISIBLE.includes(c.status);
        const showOwnerContact = side === "owner" || ["Pending", "Successful"].includes(c.status);

        const [reviews] = await db.execute(
            "SELECT rater_id, stars, comment, created_at FROM connection_review WHERE connection_id = ?",
            [id]
        );
        const myReview = reviews.find(r => r.rater_id === me) || null;
        const otherReview = reviews.find(r => r.rater_id !== me) || null;

        const applicant = { user_id: c.applicant_id, username: c.applicant_username, profile_picture: c.applicant_picture, full_name: c.full_name };
        if (showApplicantDetails) {
            Object.assign(applicant, {
                father_name: c.father_name,
                mother_name: c.mother_name,
                address: c.address,
                blood_group: c.blood_group,
                mobile: c.mobile,
                email: c.email,
                nid_masked: H.maskNid(c.nid),
                last_donation_date: c.last_donation_date,
                previous_donations: c.previous_donations,
                has_blood_disease: c.has_blood_disease,
                illness_reason: c.illness_reason,
                received_before: c.received_before
            });
        }

        const owner = { user_id: c.note_owner_id, username: c.owner_username, full_name: c.owner_name, profile_picture: c.owner_picture };
        if (showOwnerContact) {
            owner.mobile = c.owner_phone;
            owner.email = c.owner_email;
        }

        res.json({
            success: true,
            connection: {
                connection_id: c.connection_id,
                status: c.status,
                status_reason: c.status_reason,
                note_type: c.note_type,
                note_blood_group: c.note_blood_group,
                applicant_role: c.applicant_role,
                my_side: side,
                created_at: c.created_at,
                confirmed_at: c.confirmed_at,
                completed_at: c.completed_at,
                applicant,
                owner,
                permissions: {
                    can_respond: side === "owner" && c.status === "Submitted",
                    can_cancel: (side === "applicant" && c.status === "Submitted") || c.status === "Pending",
                    can_review: c.status === "Pending" && !myReview
                },
                my_review: myReview,
                other_reviewed: !!otherReview,
                other_review: c.status === "Successful" ? otherReview : null
            }
        });
    } catch (error) {
        console.error("connection getOne error:", error);
        fail(res, 500, "Server Error");
    }
};

const withLockedConnection = async (id, work) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.execute("SELECT * FROM blood_connection WHERE connection_id = ? FOR UPDATE", [id]);
        const out = await work(conn, rows[0] || null);
        await conn.commit();
        return out;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const respond = async (req, res) => {
    try {
        await expireStale();
        const me = req.actor.id;
        const id = Number(req.params.id);
        const action = String((req.body || {}).action || "");
        if (!["confirm", "decline"].includes(action)) return fail(res, 400, "Action must be confirm or decline.");

        const result = await withLockedConnection(id, async (conn, c) => {
            if (!c || c.note_owner_id !== me) return { code: 404, message: "Request not found." };
            if (c.status !== "Submitted") return { code: 409, message: "This request is no longer waiting for your answer." };

            if (action === "decline") {
                await conn.execute("UPDATE blood_connection SET status = 'Declined' WHERE connection_id = ?", [id]);
                return { ok: true, status: "Declined", applicantId: c.applicant_id, closed: [] };
            }

            await conn.execute(
                "UPDATE blood_connection SET status = 'Pending', confirmed_at = NOW() WHERE connection_id = ?",
                [id]
            );
            const [others] = await conn.execute(
                "SELECT connection_id, applicant_id FROM blood_connection WHERE note_owner_id = ? AND status = 'Submitted' AND connection_id <> ? FOR UPDATE",
                [me, id]
            );
            if (others.length) {
                await conn.query(
                    "UPDATE blood_connection SET status = 'Closed', status_reason = 'Another person was chosen for this note' WHERE connection_id IN (?)",
                    [others.map(o => o.connection_id)]
                );
            }
            return { ok: true, status: "Pending", applicantId: c.applicant_id, closed: others };
        });

        if (!result.ok) return fail(res, result.code, result.message);

        const info = await getActorInfo(req.actor);
        if (result.status === "Pending") {
            await notify({
                recipientId: result.applicantId, actor: req.actor, type: "connection_confirmed",
                message: `${info.display_name} confirmed your request. You can now see their contact details.`,
                link: `/connection?id=${id}`
            });
            for (const o of result.closed) {
                await notify({
                    recipientId: o.applicant_id, actor: req.actor, type: "connection_closed",
                    message: `${info.display_name} chose another person for their blood note.`,
                    link: `/connection?id=${o.connection_id}`
                });
            }
        } else {
            await notify({
                recipientId: result.applicantId, actor: req.actor, type: "connection_declined",
                message: `${info.display_name} declined your request.`,
                link: `/connection?id=${id}`
            });
        }

        res.json({ success: true, status: result.status });
    } catch (error) {
        console.error("connection respond error:", error);
        fail(res, 500, "Server Error");
    }
};

const cancel = async (req, res) => {
    try {
        await expireStale();
        const me = req.actor.id;
        const id = Number(req.params.id);
        const reason = String((req.body || {}).reason || "").trim().slice(0, 255);

        const result = await withLockedConnection(id, async (conn, c) => {
            if (!c || (c.note_owner_id !== me && c.applicant_id !== me)) return { code: 404, message: "Connection not found." };
            const side = c.note_owner_id === me ? "Owner" : "Applicant";

            if (c.status === "Submitted" && side === "Owner") return { code: 409, message: "Use Decline to answer a request." };
            if (!["Submitted", "Pending"].includes(c.status)) return { code: 409, message: "This connection can no longer be cancelled." };
            if (c.status === "Pending" && reason.length < 3) return { code: 400, message: "Please give a reason for cancelling." };

            await conn.execute(
                `UPDATE blood_connection
                 SET status = 'Cancelled', cancelled_by = ?, cancelled_at = NOW(), status_reason = ?
                 WHERE connection_id = ?`,
                [side, reason || "Withdrawn by applicant", id]
            );
            return { ok: true, otherId: side === "Owner" ? c.applicant_id : c.note_owner_id };
        });

        if (!result.ok) return fail(res, result.code, result.message);

        const info = await getActorInfo(req.actor);
        await notify({
            recipientId: result.otherId, actor: req.actor, type: "connection_cancelled",
            message: `${info.display_name} cancelled your blood connection.`,
            link: `/connection?id=${id}`
        });

        res.json({ success: true, status: "Cancelled" });
    } catch (error) {
        console.error("connection cancel error:", error);
        fail(res, 500, "Server Error");
    }
};

const review = async (req, res) => {
    try {
        await expireStale();
        const me = req.actor.id;
        const id = Number(req.params.id);
        const stars = Number((req.body || {}).stars);
        const comment = String((req.body || {}).comment || "").trim().slice(0, 300) || null;

        if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
            return fail(res, 400, "Rating must be between 1 and 5 stars.");
        }

        const result = await withLockedConnection(id, async (conn, c) => {
            if (!c || (c.note_owner_id !== me && c.applicant_id !== me)) return { code: 404, message: "Connection not found." };
            if (c.status !== "Pending") return { code: 403, message: "You can review only after the owner has confirmed the connection." };

            const otherId = c.note_owner_id === me ? c.applicant_id : c.note_owner_id;
            try {
                await conn.execute(
                    "INSERT INTO connection_review (connection_id, rater_id, rated_id, stars, comment) VALUES (?, ?, ?, ?, ?)",
                    [id, me, otherId, stars, comment]
                );
            } catch (error) {
                if (error.code === "ER_DUP_ENTRY") return { code: 409, message: "You have already reviewed this connection." };
                throw error;
            }

            const [[count]] = await conn.execute("SELECT COUNT(*) AS c FROM connection_review WHERE connection_id = ?", [id]);
            const done = Number(count.c) >= 2;
            if (done) {
                await conn.execute("UPDATE blood_connection SET status = 'Successful', completed_at = NOW() WHERE connection_id = ?", [id]);
            }
            return { ok: true, otherId, done };
        });

        if (!result.ok) return fail(res, result.code, result.message);

        const info = await getActorInfo(req.actor);
        if (result.done) {
            await notify({
                recipientId: result.otherId, actor: req.actor, type: "connection_successful",
                message: `Your blood connection with ${info.display_name} is complete. Thank you!`,
                link: `/connection?id=${id}`
            });
        } else {
            await notify({
                recipientId: result.otherId, actor: req.actor, type: "connection_review",
                message: `${info.display_name} reviewed you. Please review them too to complete the connection.`,
                link: `/connection?id=${id}`
            });
        }

        res.status(201).json({
            success: true,
            status: result.done ? "Successful" : "Pending",
            message: result.done ? "Connection complete. Thank you!" : "Thank you. Waiting for the other person's review."
        });
    } catch (error) {
        console.error("connection review error:", error);
        fail(res, 500, "Server Error");
    }
};
// Live NID check used by the form while the person types
const checkNid = async (req, res) => {
    try {
        const nid = H.normalizeNid(req.query.nid);
        if (!nid) {
            return res.json({ success: true, valid: false, message: "NID must be 10, 13 or 17 digits." });
        }
        const [reg] = await db.execute(
            "SELECT full_name, DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS dob FROM nid_registry WHERE nid = ? LIMIT 1", [nid]
        );
        if (!reg.length) {
            return res.json({ success: true, valid: false, message: "This NID was not found in the national ID records." });
        }
        const [me] = await db.execute("SELECT DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS dob FROM user WHERE user_id = ?", [req.actor.id]);
        const name = String(req.query.name || "").trim();
        const matches = (!name || sameName(reg[0].full_name, name)) && me.length && reg[0].dob === me[0].dob;
        res.json({
            success: true,
            valid: !!matches,
            message: matches ? "NID verified." : "This NID does not match the name and date of birth on your account."
        });
    } catch (error) {
        console.error("checkNid error:", error);
        res.status(500).json({ success: false, message: "Unable to check NID right now." });
    }
};

module.exports = { checkNid, getForm, submit, mine, getOne, respond, cancel, review, expireStale };