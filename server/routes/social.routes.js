const express = require("express");
const router = express.Router();

const { requireAuth, requireUser } = require("../middleware/actor.middleware");
const upload = require("../middleware/upload.middleware");

const friend = require("../controllers/social/friend.controller");
const feed = require("../controllers/social/feed.controller");
const profile = require("../controllers/social/profile.controller");
const note = require("../controllers/social/note.controller");
const exchange = require("../controllers/social/exchange.controller");
const notification = require("../controllers/social/notification.controller");
const board = require("../controllers/social/leaderboard.controller");
const report = require("../controllers/social/report.controller");
const connection = require("../controllers/social/connection.controller");
const bankDirectory = require("../controllers/social/bankdirectory.controller");
router.use(requireAuth);

router.get("/me", profile.me);

router.get("/users/search", profile.searchUsers);
router.get("/users/suggestions", requireUser, profile.suggestions);
router.get("/users/:username", profile.getProfile);
router.get("/users/:username/posts", feed.getUserPosts);
router.get("/users/:username/friends", profile.userFriends);
router.get("/users/:username/reviews", exchange.userReviews);

router.put("/profile/bio", requireUser, profile.updateBio);
router.post("/profile/avatar", requireUser, upload.avatarImage, profile.uploadAvatar);
router.post("/profile/cover", requireUser, upload.coverImage, profile.uploadCover);

router.get("/friends", requireUser, friend.myFriends);
router.get("/friends/requests", requireUser, friend.incomingRequests);
router.post("/friends/request/:userId", requireUser, friend.sendRequest);
router.post("/friends/respond/:friendshipId", requireUser, friend.respondRequest);
router.delete("/friends/:userId", requireUser, friend.removeFriendship);

router.get("/feed", feed.getFeed);
router.post("/posts/:id/report", report.reportPost);
router.post("/comments/:id/report", report.reportComment);
router.post("/posts", upload.postImage, feed.createPost);
router.delete("/posts/:postId", feed.deletePost);
router.post("/posts/:postId/like", feed.toggleLike);
router.post("/posts/:postId/dislike", feed.toggleDislike);
router.get("/posts/:postId/comments", feed.getComments);
router.post("/posts/:postId/comments", feed.addComment);

router.get("/notes", requireUser, note.listNotes);
router.put("/notes", requireUser, note.setNote);
router.delete("/notes", requireUser, note.clearNote);

router.post("/exchanges", requireUser, exchange.recordExchange);
router.get("/exchanges/pending", requireUser, exchange.pendingExchanges);
router.post("/exchanges/:exchangeId/respond", requireUser, exchange.respondExchange);
router.post("/reviews", requireUser, exchange.submitReview);

router.get("/notifications", notification.listNotifications);
router.post("/notifications/read-all", notification.markAllRead);
router.post("/notifications/:id/read", notification.markRead);

router.get("/leaderboard", board.leaderboard);
router.get("/connections/nid-check", requireUser, connection.checkNid);
router.get("/connections/mine", requireUser, connection.mine);
router.get("/connections/form/:ownerId", requireUser, connection.getForm);
router.post("/connections", requireUser, connection.submit);
router.get("/connections/:id", requireUser, connection.getOne);
router.post("/connections/:id/respond", requireUser, connection.respond);
router.post("/connections/:id/cancel", requireUser, connection.cancel);
router.post("/connections/:id/review", requireUser, connection.review);

router.get("/banks", requireUser, bankDirectory.listBanks);
router.post("/banks/:id/requests", requireUser, bankDirectory.createRequest);
router.get("/bank-requests/mine", requireUser, bankDirectory.myRequests);
router.post("/bank-requests/:id/cancel", requireUser, bankDirectory.cancelRequest);
module.exports = router;