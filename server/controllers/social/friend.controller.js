const db = require("../../config/db");
const { notify } = require("../../services/notify.service");
const { getRelation, getActorInfo } = require("../../utils/social.helpers");

const sendRequest = async (req, res) => {
    try {
        const me = req.actor.id;
        const other = Number(req.params.userId);

        if (!other || other === me) {
            return res.status(400).json({ success: false, message: "Invalid user." });
        }

        const [target] = await db.execute(
            "SELECT user_id FROM user WHERE user_id = ? AND account_status = 'Active'", [other]
        );
        if (!target.length) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const relation = await getRelation(me, other);
        if (relation.status === "friends") {
            return res.status(409).json({ success: false, message: "You are already friends." });
        }
        if (relation.status === "request_sent") {
            return res.status(409).json({ success: false, message: "Friend request already sent." });
        }
        if (relation.status === "request_received") {
            return res.status(409).json({ success: false, message: "This user already sent you a request. Accept it instead." });
        }

        await db.execute(
            "INSERT INTO friendship (requester_id, addressee_id) VALUES (?, ?)", [me, other]
        );

        const info = await getActorInfo(req.actor);
        await notify({
            recipientId: other,
            actor: req.actor,
            type: "friend_request",
            message: `${info.display_name} sent you a friend request.`,
            link: `/profile?u=${info.username}`
        });

        res.status(201).json({ success: true, message: "Friend request sent.", status: "request_sent" });
    } catch (error) {
        console.error("sendRequest error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const respondRequest = async (req, res) => {
    try {
        const me = req.actor.id;
        const id = Number(req.params.friendshipId);
        const action = String((req.body || {}).action || "");

        if (!["accept", "reject"].includes(action)) {
            return res.status(400).json({ success: false, message: "Action must be accept or reject." });
        }

        const [rows] = await db.execute(
            "SELECT requester_id FROM friendship WHERE friendship_id = ? AND addressee_id = ? AND status = 'Pending'",
            [id, me]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Friend request not found." });
        }

        if (action === "reject") {
            await db.execute("DELETE FROM friendship WHERE friendship_id = ?", [id]);
            return res.json({ success: true, message: "Request removed.", status: "none" });
        }

        await db.execute(
            "UPDATE friendship SET status = 'Accepted', responded_at = NOW() WHERE friendship_id = ?", [id]
        );

        const info = await getActorInfo(req.actor);
        await notify({
            recipientId: rows[0].requester_id,
            actor: req.actor,
            type: "friend_accept",
            message: `${info.display_name} accepted your friend request.`,
            link: `/profile?u=${info.username}`
        });

        res.json({ success: true, message: "You are now friends.", status: "friends" });
    } catch (error) {
        console.error("respondRequest error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const removeFriendship = async (req, res) => {
    try {
        const me = req.actor.id;
        const other = Number(req.params.userId);

        const [result] = await db.execute(
            `DELETE FROM friendship
             WHERE (status = 'Accepted' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)))
                OR (status = 'Pending' AND requester_id = ? AND addressee_id = ?)`,
            [me, other, other, me, me, other]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: "Nothing to remove." });
        }
        res.json({ success: true, message: "Removed.", status: "none" });
    } catch (error) {
        console.error("removeFriendship error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const myFriends = async (req, res) => {
    try {
        const me = req.actor.id;
        const [friends] = await db.execute(
            `SELECT u.user_id, u.full_name, u.username, u.profile_picture, u.blood_group
             FROM friendship f
             JOIN user u ON u.user_id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
             WHERE f.status = 'Accepted' AND (f.requester_id = ? OR f.addressee_id = ?)
             ORDER BY u.full_name`,
            [me, me, me]
        );
        res.json({ success: true, count: friends.length, friends });
    } catch (error) {
        console.error("myFriends error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const incomingRequests = async (req, res) => {
    try {
        const [requests] = await db.execute(
            `SELECT f.friendship_id, f.created_at, u.user_id, u.full_name, u.username, u.profile_picture, u.blood_group
             FROM friendship f
             JOIN user u ON u.user_id = f.requester_id
             WHERE f.addressee_id = ? AND f.status = 'Pending'
             ORDER BY f.created_at DESC`,
            [req.actor.id]
        );
        res.json({ success: true, count: requests.length, requests });
    } catch (error) {
        console.error("incomingRequests error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { sendRequest, respondRequest, removeFriendship, myFriends, incomingRequests };