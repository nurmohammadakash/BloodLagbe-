const express = require("express");
const router = express.Router();

const { requireAdmin, requireRole } = require("../middleware/admin.middleware");
const auth = require("../controllers/admin/auth.controller");
const overview = require("../controllers/admin/overview.controller");
const bloodbanks = require("../controllers/admin/bloodbank.controller");
const users = require("../controllers/admin/user.controller");
const requests = require("../controllers/admin/request.controller");
const donations = require("../controllers/admin/donation.controller");
const moderation = require("../controllers/admin/moderation.controller");
const reviews = require("../controllers/admin/review.controller");
const exchanges = require("../controllers/admin/exchange.controller");
const announcements = require("../controllers/admin/announcement.controller");
const audit = require("../controllers/admin/audit.controller");
const settings = require("../controllers/admin/settings.controller");
const admins = require("../controllers/admin/admins.controller");
const reports = require("../controllers/admin/report.controller");
const connections = require("../controllers/admin/connection.controller");
const bankForecast = require("../controllers/admin/bankforecast.controller");
// Auth
router.post("/auth/login", auth.login);
router.get("/auth/me", requireAdmin, auth.me);
router.post("/auth/logout", requireAdmin, auth.logout);

// Overview
router.get("/overview", requireAdmin, overview.getOverview);

// Blood banks (approve/reject/suspend: Admin and Super Admin only)
router.get("/bloodbanks", requireAdmin, bloodbanks.list);
router.get("/bloodbanks/:id", requireAdmin, bloodbanks.detail);
router.post("/bloodbanks/:id/status", requireAdmin, requireRole("Admin"), bloodbanks.changeStatus);

// Users (Moderators can suspend/block too)
router.get("/users", requireAdmin, users.list);
router.get("/users/:id", requireAdmin, users.detail);
router.post("/users/:id/status", requireAdmin, requireRole("Admin", "Moderator"), users.changeStatus);

// Blood requests (Admin and Moderator can cancel/expire)
router.get("/requests", requireAdmin, requests.list);
router.post("/requests/expire-overdue", requireAdmin, requireRole("Admin", "Moderator"), requests.expireOverdue);
router.get("/requests/:id", requireAdmin, requests.detail);
router.post("/requests/:id/cancel", requireAdmin, requireRole("Admin", "Moderator"), requests.cancel);

// Donations and stock (read-only)
router.get("/donations", requireAdmin, donations.list);
router.get("/stock", requireAdmin, donations.stock);
router.get("/bank-forecast", requireAdmin, bankForecast.forecast);
// Moderation (Admin and Moderator can act; Support is view-only)
const canModerate = [requireAdmin, requireRole("Admin", "Moderator")];

router.get("/moderation/reports", requireAdmin, moderation.listReports);
router.post("/moderation/reports/resolve", canModerate, moderation.resolveReport);
router.post("/moderation/warn", canModerate, moderation.warn);
router.get("/moderation/posts", requireAdmin, moderation.listPosts);
router.get("/moderation/comments", requireAdmin, moderation.listComments);
router.get("/moderation/item/:type/:id", requireAdmin, moderation.detail);
router.post("/moderation/item/:type/:id/:action", canModerate, moderation.itemAction);

// Reviews
router.get("/reviews", requireAdmin, reviews.list);
router.post("/reviews/:id/clear-text", canModerate, reviews.clearText);
router.post("/reviews/:id/delete", canModerate, reviews.remove);
// Peer donations (blood_exchange)
router.get("/exchanges", requireAdmin, exchanges.list);
router.post("/exchanges/:id/reject", canModerate, exchanges.reject);

// Announcements (Admin and Super Admin only)
const adminOnly = [requireAdmin, requireRole("Admin")];
router.get("/announcements", adminOnly, announcements.list);
router.get("/announcements/options", adminOnly, announcements.options);
router.post("/announcements/preview", adminOnly, announcements.preview);
router.post("/announcements", adminOnly, announcements.create);

// Audit log (Admin and Super Admin only)
router.get("/audit", adminOnly, audit.list);
// Settings
router.post("/settings/change-password", requireAdmin, settings.changePassword);
// Admin accounts (Super Admin only)
const superOnly = [requireAdmin, requireRole()];
router.get("/admins", superOnly, admins.list);
router.post("/admins", superOnly, admins.create);
router.post("/admins/:id/role", superOnly, admins.changeRole);
router.post("/admins/:id/status", superOnly, admins.changeStatus);
// Reports (Admin and Super Admin only)
router.get("/reports/:type", adminOnly, reports.get);
// Blood connections (Admin and Moderator can cancel)
router.get("/connections", requireAdmin, connections.list);
router.get("/connections/:id", requireAdmin, connections.detail);
router.post("/connections/:id/cancel", requireAdmin, requireRole("Admin", "Moderator"), connections.cancel);
module.exports = router;