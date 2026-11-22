const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const db = require("../config/db");
const { generateOTP } = require("../utils/otp");
const { sendEmail } = require("../services/email.service");

const registerBloodBank = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const {
            blood_bank_name, license_number, email, contact,
            division, district, upazila, postal_code, address,
            username, password, confirmPassword, latitude, longitude
        } = req.body;

        if (!blood_bank_name || !license_number || !email || !contact || !division || !district || !upazila || !postal_code || !address || !username || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All required blood bank fields must be provided." });
        }
        if (password !== confirmPassword) return res.status(400).json({ success: false, message: "Passwords do not match." });

        const cleanEmail = email.trim().toLowerCase();
        const cleanUsername = username.trim();
        const [existing] = await db.execute(`SELECT username FROM user WHERE username = ? UNION SELECT username FROM blood_bank WHERE username = ? LIMIT 1`, [cleanUsername, cleanUsername]);
        if (existing.length) return res.status(400).json({ success: false, message: "Username already exists." });
        const [emailRows] = await db.execute(`SELECT email FROM user WHERE email = ? UNION SELECT email FROM blood_bank WHERE email = ? LIMIT 1`, [cleanEmail, cleanEmail]);
        if (emailRows.length) return res.status(400).json({ success: false, message: "Email already exists." });
        const [licenseRows] = await db.execute(`SELECT bloodbank_id FROM blood_bank WHERE license_number = ?`, [license_number.trim()]);
        if (licenseRows.length) return res.status(400).json({ success: false, message: "License number already exists." });

        const otp = generateOTP();
        const expiry = new Date(Date.now() + 5 * 60 * 1000);
        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.execute(`
            INSERT INTO blood_bank
            (name, license_number, email, phone, division, district, upazila, postal_code,
             address, username, password, latitude, longitude, email_verified, email_otp, otp_expiry, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, 'Pending')
        `, [blood_bank_name.trim(), license_number.trim(), cleanEmail, contact.trim(), division, district, upazila, postal_code.trim(), address.trim(), cleanUsername, hash, latitude || null, longitude || null, otp, expiry]);

        await sendEmail(cleanEmail, "Blood-Lagbe Blood Bank Email Verification", `<div style="font-family:Arial;max-width:600px;margin:auto;padding:30px"><h2>🩸 Blood-Lagbe Blood Bank Verification</h2><p>Hello ${blood_bank_name},</p><p>Your verification OTP is:</p><h1 style="letter-spacing:8px;text-align:center">${otp}</h1><p>This code expires in 5 minutes.</p></div>`);

        res.status(201).json({ success: true, message: "Blood Bank registration successful! Please verify your email.", bloodbank_id: result.insertId });
    } catch (error) {
        console.error("Blood bank registration error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const verifyBloodBankEmail = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const otp = String(req.body.otp || "").trim();
        const [rows] = await db.execute(`SELECT bloodbank_id FROM blood_bank WHERE email = ? AND email_otp = ? AND otp_expiry > NOW()`, [email, otp]);
        if (!rows.length) return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        await db.execute(`UPDATE blood_bank SET email_verified = TRUE, email_otp = NULL, otp_expiry = NULL WHERE bloodbank_id = ?`, [rows[0].bloodbank_id]);
res.json({ success: true, message: "Email verified successfully. Your blood bank is now waiting for admin approval. We will email you once it has been reviewed." });
    } catch (error) {
        console.error("Blood bank verification error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { registerBloodBank, verifyBloodBankEmail };
