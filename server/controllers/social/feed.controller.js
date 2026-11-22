const db = require("../../config/db");
const { notify, notifyUsers } = require("../../services/notify.service");
const { removeUpload, publicPath } = require("../../middleware/upload.middleware");
const { getFriendIds, getActorInfo, toInt, snippet } = require("../../utils/social.helpers");
const { getIO } = require("../../socket");

const POST_SELECT = `
    SELECT p.post_id, p.author_type, p.author_id, p.content, p.media_url, p.is_urgent, p.created_at,
           COALESCE(u.full_name, b.name) AS author_name,
           u.username AS author_username,
           u.profile_picture AS author_picture,
                      (SELECT COUNT(*) FROM feed_like l WHERE l.post_id = p.post_id AND l.reaction = 'like') AS like_count,
           (SELECT COUNT(*) FROM feed_like l WHERE l.post_id = p.post_id AND l.reaction = 'dislike') AS dislike_count,
                      (SELECT COUNT(*) FROM feed_comment c WHERE c.post_id = p.post_id AND c.is_hidden = 0) AS comment_count,
           (SELECT l.reaction FROM feed_like l WHERE l.post_id = p.post_id AND l.liker_type = ? AND l.liker_id = ? LIMIT 1) AS my_reaction
        FROM (SELECT * FROM feed_post WHERE is_hidden = 0) p
    LEFT JOIN user u ON p.author_type = 'user' AND u.user_id = p.author_id
    LEFT JOIN blood_bank b ON p.author_type = 'bloodbank' AND b.bloodbank_id = p.author_id`;

const shapePost = (row, actor) => ({
    ...row,
    is_urgent: !!row.is_urgent,
    my_reaction: row.my_reaction || null,
    liked_by_me: row.my_reaction === "like",
    disliked_by_me: row.my_reaction === "dislike",
    like_count: Number(row.like_count),
    dislike_count: Number(row.dislike_count || 0),
    comment_count: Number(row.comment_count),
    mine: row.author_type === actor.type && row.author_id === actor.id
});

const getFeed = async (req, res) => {
    try {
        const actor = req.actor;
        const limit = toInt(req.query.limit, 10, 1, 30);
        const before = toInt(req.query.before, 0, 0, 2147483647);

        const conditions = [];
        const params = [actor.type, actor.id];

        if (actor.type === "user") {
            conditions.push(`(p.author_type = 'bloodbank' OR (p.author_type = 'user' AND (p.author_id = ?
                OR p.author_id IN (
                    SELECT addressee_id FROM friendship WHERE requester_id = ? AND status = 'Accepted'
                    UNION
                    SELECT requester_id FROM friendship WHERE addressee_id = ? AND status = 'Accepted'
                ))))`);
            params.push(actor.id, actor.id, actor.id);
        }
        if (before) {
            conditions.push("p.post_id < ?");
            params.push(before);
        }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const [rows] = await db.execute(
            `${POST_SELECT} ${where} ORDER BY p.post_id DESC LIMIT ${limit}`, params
        );

        res.json({ success: true, posts: rows.map(r => shapePost(r, actor)) });
    } catch (error) {
        console.error("getFeed error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getUserPosts = async (req, res) => {
    try {
        const actor = req.actor;
        const limit = toInt(req.query.limit, 10, 1, 30);
        const before = toInt(req.query.before, 0, 0, 2147483647);

        const [users] = await db.execute("SELECT user_id FROM user WHERE username = ?", [req.params.username]);
        if (!users.length) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const params = [actor.type, actor.id, users[0].user_id];
        let extra = "";
        if (before) {
            extra = "AND p.post_id < ?";
            params.push(before);
        }

        const [rows] = await db.execute(
            `${POST_SELECT} WHERE p.author_type = 'user' AND p.author_id = ? ${extra}
             ORDER BY p.post_id DESC LIMIT ${limit}`, params
        );
        res.json({ success: true, posts: rows.map(r => shapePost(r, actor)) });
    } catch (error) {
        console.error("getUserPosts error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const createPost = async (req, res) => {
    try {
        const actor = req.actor;
        const body = req.body || {};
        const content = String(body.content || "").trim().slice(0, 2000);
        const mediaUrl = req.file ? publicPath("posts", req.file) : null;

        if (!content && !mediaUrl) {
            return res.status(400).json({ success: false, message: "Write something or add an image." });
        }

        const urgent = actor.type === "bloodbank" && String(body.is_urgent) === "true";

        const [result] = await db.execute(
            "INSERT INTO feed_post (author_type, author_id, content, media_url, is_urgent) VALUES (?, ?, ?, ?, ?)",
            [actor.type, actor.id, content || null, mediaUrl, urgent]
        );

        if (actor.type === "user") {
            const info = await getActorInfo(actor);
            const friendIds = await getFriendIds(actor.id);
            await notifyUsers({
                recipientIds: friendIds,
                actor,
                type: "friend_post",
                message: `${info.display_name} posted: ${snippet(content) || "a photo"}`,
                link: "/dashboard"
            });
        }

        const [rows] = await db.execute(`${POST_SELECT} WHERE p.post_id = ?`, [actor.type, actor.id, result.insertId]);
        res.status(201).json({ success: true, post: shapePost(rows[0], actor) });
    } catch (error) {
        console.error("createPost error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const deletePost = async (req, res) => {
    try {
        const actor = req.actor;
        const [rows] = await db.execute(
            "SELECT media_url FROM feed_post WHERE post_id = ? AND author_type = ? AND author_id = ?",
            [req.params.postId, actor.type, actor.id]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }
        await db.execute("DELETE FROM feed_post WHERE post_id = ?", [req.params.postId]);
        removeUpload(rows[0].media_url);
        res.json({ success: true, message: "Post deleted." });
    } catch (error) {
        console.error("deletePost error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Like and dislike share one row per person: pressing the same button again
// removes it, pressing the other button switches it.
const react = (kind) => async (req, res) => {
    try {
        const actor = req.actor;
        const postId = Number(req.params.postId);

        const [posts] = await db.execute(
            "SELECT author_type, author_id, content FROM feed_post WHERE post_id = ?", [postId]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        const [existing] = await db.execute(
            "SELECT like_id, reaction FROM feed_like WHERE post_id = ? AND liker_type = ? AND liker_id = ?",
            [postId, actor.type, actor.id]
        );

        let mine = kind;
        let tellAuthor = false;
        if (existing.length && existing[0].reaction === kind) {
            await db.execute("DELETE FROM feed_like WHERE like_id = ?", [existing[0].like_id]);
            mine = null;
        } else if (existing.length) {
            await db.execute("UPDATE feed_like SET reaction = ? WHERE like_id = ?", [kind, existing[0].like_id]);
            tellAuthor = kind === "like";
        } else {
            await db.execute(
                "INSERT INTO feed_like (post_id, liker_type, liker_id, reaction) VALUES (?, ?, ?, ?)",
                [postId, actor.type, actor.id, kind]
            );
            tellAuthor = kind === "like";
        }

        if (tellAuthor) {
            const info = await getActorInfo(actor);
            await notify({
                recipientType: posts[0].author_type,
                recipientId: posts[0].author_id,
                actor,
                type: "like",
                message: `${info.display_name} liked your post.`,
                link: "/dashboard"
            });
        }

        const [[c]] = await db.execute(
            `SELECT COALESCE(SUM(reaction = 'like'), 0) AS likes, COALESCE(SUM(reaction = 'dislike'), 0) AS dislikes
             FROM feed_like WHERE post_id = ?`,
            [postId]
        );
        const counts = { like_count: Number(c.likes), dislike_count: Number(c.dislikes) };

        const io = getIO();
        if (io) io.to(`post:${postId}`).emit("post:reaction", { post_id: postId, ...counts });

        res.json({ success: true, reaction: mine, liked: mine === "like", disliked: mine === "dislike", ...counts });
    } catch (error) {
        console.error("react error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const toggleLike = react("like");
const toggleDislike = react("dislike");

const getComments = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT c.comment_id, c.author_type, c.author_id, c.content, c.created_at,
                    COALESCE(u.full_name, b.name) AS author_name,
                    u.username AS author_username,
                    u.profile_picture AS author_picture
             FROM feed_comment c
             LEFT JOIN user u ON c.author_type = 'user' AND u.user_id = c.author_id
             LEFT JOIN blood_bank b ON c.author_type = 'bloodbank' AND b.bloodbank_id = c.author_id
                          WHERE c.post_id = ? AND c.is_hidden = 0
             ORDER BY c.comment_id ASC
             LIMIT 200`,
            [req.params.postId]
        );
        res.json({ success: true, comments: rows });
    } catch (error) {
        console.error("getComments error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const addComment = async (req, res) => {
    try {
        const actor = req.actor;
        const postId = Number(req.params.postId);
        const content = String((req.body || {}).content || "").trim().slice(0, 1000);

        if (!content) {
            return res.status(400).json({ success: false, message: "Comment cannot be empty." });
        }

        const [posts] = await db.execute(
            "SELECT author_type, author_id FROM feed_post WHERE post_id = ?", [postId]
        );
        if (!posts.length) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        const [result] = await db.execute(
            "INSERT INTO feed_comment (post_id, author_type, author_id, content) VALUES (?, ?, ?, ?)",
            [postId, actor.type, actor.id, content]
        );

        const info = await getActorInfo(actor);
        await notify({
            recipientType: posts[0].author_type,
            recipientId: posts[0].author_id,
            actor,
            type: "comment",
            message: `${info.display_name} commented: ${snippet(content)}`,
            link: "/dashboard"
        });

        const comment = {
            comment_id: result.insertId,
            author_type: actor.type,
            author_id: actor.id,
            content,
            created_at: new Date(),
            author_name: info.display_name,
            author_username: info.username,
            author_picture: info.picture
        };
        const [[total]] = await db.execute(
            "SELECT COUNT(*) AS c FROM feed_comment WHERE post_id = ? AND is_hidden = 0", [postId]
        );
        const comment_count = Number(total.c);

        // push to everyone who currently has this post on screen
        const io = getIO();
        if (io) io.to(`post:${postId}`).emit("comment:new", { post_id: postId, comment, comment_count });

        res.status(201).json({ success: true, comment, comment_count });
    } catch (error) {
        console.error("addComment error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { getFeed, getUserPosts, createPost, deletePost, toggleLike, toggleDislike, getComments, addComment };