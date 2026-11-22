const db = require("../../config/db");
const { notify } = require("../../services/notify.service");
const { getActorInfo } = require("../../utils/social.helpers");

const MIN_DAYS_BETWEEN_DONATIONS = 56;

const recordExchange = async (req, res) => {
    try {
        const me = req.actor.id;
        const { username, direction, donated_on } = req.body || {};

        if (!["donated", "received"].includes(direction)) {
            return res.status(400).json({ success: false, message: "Direction must be donated or received." });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(donated_on || ""))) {
            return res.status(400).json({ success: false, message: "Please provide a valid date." });
        }

        const date = new Date(`${donated_on}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        if (Number.isNaN(date.getTime()) || date > today) {
            return res.status(400).json({ success: false, message: "Donation date cannot be in the future." });
        }
        if (date < oneYearAgo) {
            return res.status(400).json({ success: false, message: "Donation date cannot be older than one year." });
        }

        const [others] = await db.execute(
            "SELECT user_id, full_name, blood_group FROM user WHERE username = ? AND account_status = 'Active'",
            [String(username || "")]
        );
        if (!others.length) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        const other = others[0];
        if (other.user_id === me) {
            return res.status(400).json({ success: false, message: "You cannot record a donation with yourself." });
        }

        const [mine] = await db.execute("SELECT blood_group FROM user WHERE user_id = ?", [me]);
        const donorId = direction === "donated" ? me : other.user_id;
        const recipientId = direction === "donated" ? other.user_id : me;
        const bloodGroup = direction === "donated" ? mine[0].blood_group : other.blood_group;

        const [duplicate] = await db.execute(
            `SELECT exchange_id FROM blood_exchange
             WHERE donor_id = ? AND recipient_id = ? AND donated_on = ? AND status <> 'Rejected'`,
            [donorId, recipientId, donated_on]
        );
        if (duplicate.length) {
            return res.status(409).json({ success: false, message: "This donation is already recorded." });
        }

        if (MIN_DAYS_BETWEEN_DONATIONS > 0) {
            const [tooClose] = await db.execute(
                `SELECT exchange_id FROM blood_exchange
                 WHERE donor_id = ? AND status <> 'Rejected'
                   AND ABS(DATEDIFF(donated_on, ?)) < ?`,
                [donorId, donated_on, MIN_DAYS_BETWEEN_DONATIONS]
            );
            if (tooClose.length) {
                return res.status(409).json({
                    success: false,
                    message: `A donor can donate only once every ${MIN_DAYS_BETWEEN_DONATIONS} days.`
                });
            }
        }

        const [result] = await db.execute(
            `INSERT INTO blood_exchange (donor_id, recipient_id, blood_group, donated_on, initiated_by)
             VALUES (?, ?, ?, ?, ?)`,
            [donorId, recipientId, bloodGroup, donated_on, me]
        );

        const info = await getActorInfo(req.actor);
        await notify({
            recipientId: other.user_id,
            actor: req.actor,
            type: "donation_pending",
            message: direction === "donated"
                ? `${info.display_name} says they donated ${bloodGroup} blood to you. Please confirm.`
                : `${info.display_name} says you donated ${bloodGroup} blood to them. Please confirm.`,
            link: "/dashboard"
        });

        res.status(201).json({
            success: true,
            message: "Donation recorded. It will count once the other person confirms.",
            exchange_id: result.insertId
        });
    } catch (error) {
        console.error("recordExchange error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const pendingExchanges = async (req, res) => {
    try {
        const me = req.actor.id;
        const [rows] = await db.execute(
            `SELECT e.exchange_id, e.donor_id, e.recipient_id, e.blood_group, e.donated_on, e.created_at,
                    u.user_id AS other_id, u.full_name AS other_name, u.username AS other_username,
                    u.profile_picture AS other_picture,
                    (e.donor_id = ?) AS i_am_donor
             FROM blood_exchange e
             JOIN user u ON u.user_id = e.initiated_by
             WHERE e.status = 'Pending' AND e.initiated_by <> ? AND (e.donor_id = ? OR e.recipient_id = ?)
             ORDER BY e.created_at DESC`,
            [me, me, me, me]
        );
        res.json({ success: true, exchanges: rows.map(r => ({ ...r, i_am_donor: !!r.i_am_donor })) });
    } catch (error) {
        console.error("pendingExchanges error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const respondExchange = async (req, res) => {
    try {
        const me = req.actor.id;
        const action = String((req.body || {}).action || "");

        if (!["confirm", "reject"].includes(action)) {
            return res.status(400).json({ success: false, message: "Action must be confirm or reject." });
        }

        const [rows] = await db.execute(
            `SELECT exchange_id, initiated_by, blood_group FROM blood_exchange
             WHERE exchange_id = ? AND status = 'Pending' AND initiated_by <> ? AND (donor_id = ? OR recipient_id = ?)`,
            [req.params.exchangeId, me, me, me]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Nothing to confirm." });
        }

        const status = action === "confirm" ? "Confirmed" : "Rejected";
        await db.execute(
            "UPDATE blood_exchange SET status = ?, confirmed_at = NOW() WHERE exchange_id = ?",
            [status, rows[0].exchange_id]
        );

        if (action === "confirm") {
            const info = await getActorInfo(req.actor);
            await notify({
                recipientId: rows[0].initiated_by,
                actor: req.actor,
                type: "donation_confirmed",
                message: `${info.display_name} confirmed the ${rows[0].blood_group} blood donation. You can now rate each other.`,
                link: `/profile?u=${info.username}`
            });
        }

        res.json({ success: true, status });
    } catch (error) {
        console.error("respondExchange error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const submitReview = async (req, res) => {
    try {
        const me = req.actor.id;
        const body = req.body || {};
        const exchangeId = Number(body.exchange_id);
        const stars = Number(body.stars);
        const review = String(body.review || "").trim().slice(0, 300) || null;

        if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5 stars." });
        }

        const [rows] = await db.execute(
            `SELECT donor_id, recipient_id FROM blood_exchange
             WHERE exchange_id = ? AND status = 'Confirmed' AND (donor_id = ? OR recipient_id = ?)`,
            [exchangeId, me, me]
        );
        if (!rows.length) {
            return res.status(403).json({
                success: false,
                message: "You can rate someone only after a confirmed blood donation with them."
            });
        }

        const ratedId = rows[0].donor_id === me ? rows[0].recipient_id : rows[0].donor_id;

        try {
            await db.execute(
                "INSERT INTO user_review (exchange_id, rater_id, rated_id, stars, review) VALUES (?, ?, ?, ?, ?)",
                [exchangeId, me, ratedId, stars, review]
            );
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ success: false, message: "You already rated this donation." });
            }
            throw error;
        }

        const info = await getActorInfo(req.actor);
        await notify({
            recipientId: ratedId,
            actor: req.actor,
            type: "rating",
            message: `${info.display_name} rated you ${stars} star${stars > 1 ? "s" : ""}.`,
            link: "/profile"
        });

        res.status(201).json({ success: true, message: "Thank you for your rating." });
    } catch (error) {
        console.error("submitReview error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const userReviews = async (req, res) => {
    try {
        const [users] = await db.execute("SELECT user_id FROM user WHERE username = ?", [req.params.username]);
        if (!users.length) return res.status(404).json({ success: false, message: "User not found." });

                const [reviews] = await db.execute(
            `SELECT x.review_id, x.stars, x.review, x.created_at,
                    u.full_name AS rater_name, u.username AS rater_username, u.profile_picture AS rater_picture
             FROM (
                 SELECT CONCAT('e', review_id) AS review_id, rater_id, stars, review, created_at
                 FROM user_review WHERE rated_id = ?
                 UNION ALL
                 SELECT CONCAT('c', review_id) AS review_id, rater_id, stars, comment AS review, created_at
                 FROM connection_review WHERE rated_id = ?
             ) x
             JOIN user u ON u.user_id = x.rater_id
             ORDER BY x.created_at DESC LIMIT 50`,
            [users[0].user_id, users[0].user_id]
        );
        res.json({ success: true, reviews });
    } catch (error) {
        console.error("userReviews error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { recordExchange, pendingExchanges, respondExchange, submitReview, userReviews };