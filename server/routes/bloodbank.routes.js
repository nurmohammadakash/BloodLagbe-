const express = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/bloodbank.controller");
const router = express.Router();

router.post("/register", [
    body("email").trim().isEmail().withMessage("Invalid email address."),
    body("username").trim().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_.]+$/).withMessage("Username must be 3-20 characters and use only letters, numbers, _ or ."),
    body("password").isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/).withMessage("Password must be at least 8 characters and include uppercase, lowercase, number, and special character."),
    body("postal_code").trim().matches(/^\d{4}$/).withMessage("Postal code must contain exactly 4 digits."),
    body("contact").trim().matches(/^01[3-9]\d{8}$/).withMessage("Invalid Bangladeshi phone number.")
], controller.registerBloodBank);

router.post("/verify-email", controller.verifyBloodBankEmail);
module.exports = router;
