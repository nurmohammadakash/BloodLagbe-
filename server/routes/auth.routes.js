const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { sessionInfo, logout: sessionLogout } = require("../controllers/session.controller");
const {
    register,
    verifyOTP,
    login,
    forgotPassword,
    verifyResetOTP,
    resetPassword
} = require("../controllers/auth.controller");

const {
    registerValidation
} = require("../utils/validator");

/*
 * POST /api/auth/register
 */
router.post(
    "/register",
    registerValidation,
    register
);

/*
 * POST /api/auth/verify-email
 */
router.post("/verify-email", verifyOTP);

/*
 * POST /api/auth/login
 */
router.post("/login", login);
router.post("/logout", sessionLogout);
router.get("/session", authMiddleware, sessionInfo);
router.post("/forgot-password",forgotPassword);

router.post("/verify-reset-otp",verifyResetOTP);

router.post("/reset-password",resetPassword);
module.exports = router;
