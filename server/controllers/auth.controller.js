const bcrypt = require("bcrypt");
const db = require("../config/db");
const { validationResult } = require("express-validator");

const generateToken =
    require("../utils/generateToken");
const { startSession } = require("./session.controller");
const {
    findByUsername,
    findByEmail,
    findByPhone,
    createPendingUser,
    findByEmailOtp,
    verifyEmail,
    findByLogin,
    updateLastLogin,
    findByEmailForPasswordReset,
    saveResetOTP,
    findByResetOTP,
    updatePassword
} = require("../models/auth.model");

const {
    generateOTP
} = require("../utils/otp");

const {
    sendEmail
} = require("../services/email.service");


// =====================================================
// REGISTER
// =====================================================

const register = async (req, res) => {

    try {

        console.log("");
        console.log("======================================");
        console.log("📥 REGISTRATION REQUEST");
        console.log("======================================");

        console.log("📦 Registration data received:");

        console.log({
            ...req.body,
            password: "********"
        });


        // =================================================
        // VALIDATION
        // =================================================

        const errors =
            validationResult(req);

        if (!errors.isEmpty()) {

            console.log(
                "❌ Validation errors:",
                errors.array()
            );

            return res.status(400).json({

                success: false,

                errors:
                    errors.array()

            });

        }


        // =================================================
        // GET FORM DATA
        // =================================================

        const {

            full_name,
            date_of_birth,
            gender,

            username,
            email,
            password,
            phone,

            division,
            district,
            upazila,
            postal_code,

            blood_group,
            role,

            address,
            latitude,
            longitude

        } = req.body;


        // =================================================
        // BASIC REQUIRED FIELD CHECK
        // =================================================

        if (

            !full_name ||
            !date_of_birth ||
            !gender ||

            !username ||
            !email ||
            !password ||
            !phone ||

            !division ||
            !district ||
            !upazila ||
            !postal_code ||

            !blood_group ||
            !role ||

            !address

        ) {

            return res.status(400).json({

                success: false,

                message:
                    "All required registration fields must be provided."

            });

        }


        // =================================================
        // NORMALIZE DATA
        // =================================================

        const cleanUsername =
            username.trim();

        const cleanEmail =
            email.trim().toLowerCase();

        const cleanPhone =
            phone.trim();

        const cleanRole =
            role.toLowerCase();


        // =================================================
        // CONVERT ROLE
        // =================================================

        let databaseRole;

        if (cleanRole === "donor") {

            databaseRole = "Donor";

        } else if (cleanRole === "recipient") {

            databaseRole = "Recipient";

        } else if (cleanRole === "both") {

            databaseRole = "Both";

        } else {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid Blood-Lagbe role."

            });

        }


        // =================================================
        // CHECK USERNAME
        // =================================================

        console.log(
            "🔎 Checking username:",
            cleanUsername
        );

        if (
            await findByUsername(
                cleanUsername
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Username already exists."

            });

        }


        // =================================================
        // CHECK EMAIL
        // =================================================

        console.log(
            "🔎 Checking email:",
            cleanEmail
        );

        if (
            await findByEmail(
                cleanEmail
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email already exists."

            });

        }


        // =================================================
        // CHECK PHONE
        // =================================================

        console.log(
            "🔎 Checking phone:",
            cleanPhone
        );

        if (
            await findByPhone(
                cleanPhone
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Phone number already exists."

            });

        }
        
        // =================================================
        // HASH PASSWORD
        // =================================================

        console.log(
            "🔐 Hashing password..."
        );

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        // =================================================
        // GENERATE OTP
        // =================================================

        const otp =
            generateOTP();

        const otpExpiry =
            new Date(
                Date.now() +
                5 * 60 * 1000
            );


        console.log(
            "🔢 OTP generated:",
            otp
        );

        console.log(
            "⏰ OTP expires:",
            otpExpiry
        );


        // =================================================
        // CREATE PENDING USER
        // =================================================

        console.log(
            "💾 Creating pending user in MySQL..."
        );

        const result =
            await createPendingUser({

                full_name,

                date_of_birth,

                gender,

                username:
                    cleanUsername,

                email:
                    cleanEmail,

                password:
                    hashedPassword,

                phone:
                    cleanPhone,

                division,

                district,

                upazila,

                postal_code,

                blood_group,

                role:
                    databaseRole,

                email_otp:
                    otp,

                otp_expiry:
                    otpExpiry,

                address,
                latitude,
                longitude

            });


        console.log(
            "✅ User created successfully."
        );

        console.log(
            "🆔 New user ID:",
            result.insertId
        );


        // =================================================
        // SEND OTP EMAIL
        // =================================================

        console.log(
            "📧 Sending verification email..."
        );

        try {
            await sendEmail(
                cleanEmail,
                "Blood-Lagbe Email Verification",
                
            );
        } catch (mailError) {
            console.error("Verification email failed:", mailError.message);
            await db.execute(
                "DELETE FROM user WHERE user_id = ? AND email_verified = 0",
                [result.insertId]
            );
            return res.status(502).json({
                success: false,
                message: "We could not send the verification email. Please check the address and try again in a moment."
            });
        }


        console.log(
            "✅ Registration completed."
        );

        console.log(
            "📧 OTP sent to:",
            cleanEmail
        );

        console.log(
            "======================================"
        );


        // =================================================
        // RESPONSE
        // =================================================

        return res.status(201).json({

            success: true,

            message:
                "Registration successful. Please check your email for the OTP."

        });


    } catch (error) {

        console.error("");

        console.error(
            "❌ REGISTRATION ERROR:",
            error
        );

        console.error(
            "======================================"
        );


        return res.status(500).json({

            success: false,

            message:
                "Server Error"

        });

    }

};


// =====================================================
// VERIFY OTP
// =====================================================

const verifyOTP = async (req, res) => {

    try {

        console.log("");
        console.log(
            "📥 Email verification request received"
        );


        const {
            email,
            otp
        } = req.body;


        console.log(
            "📧 Email:",
            email
        );

        console.log(
            "🔢 OTP:",
            otp
        );


        // =================================================
        // CHECK REQUIRED FIELDS
        // =================================================

        if (!email || !otp) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and OTP are required."

            });

        }


        // =================================================
        // FIND USER
        // =================================================

        const user =
            await findByEmailOtp(
                email.trim().toLowerCase(),
                otp.trim()
            );


        console.log(
            "👤 User:",
            user
                ? `Found user ID ${user.user_id}`
                : "Not found"
        );


        if (!user) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid or expired OTP."

            });

        }


        // =================================================
        // VERIFY EMAIL
        // =================================================

        await verifyEmail(
            user.user_id
        );


        console.log(
            "✅ Email verified successfully."
        );


        return res.status(200).json({

            success: true,

            message:
                "Email verified successfully. Your account is now active."

        });


    } catch (error) {

        console.error(
            "❌ Email verification error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server Error"

        });

    }

};


// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {
    try {
        const loginValue = String(req.body.login || "").trim();
        const password = String(req.body.password || "");
        if (!loginValue || !password) return res.status(400).json({success:false,message:"Login and password are required."});

        const account = await findByLogin(loginValue);
        if (!account) return res.status(401).json({success:false,message:"Invalid username/email or password."});

        const passwordMatch = await bcrypt.compare(password, account.password);
        if (!passwordMatch) return res.status(401).json({success:false,message:"Invalid username/email or password."});

        if (!account.email_verified) return res.status(403).json({success:false,message:"Please verify your email first."});

        if (account.account_type === "user" && account.status !== "Active")
            return res.status(403).json({success:false,message:`Your account is ${account.status}.`});

        if (account.account_type === "bloodbank" && account.status !== "Approved")
            return res.status(403).json({success:false,message:`Your blood bank account is ${account.status}.`});

        await updateLastLogin(account);
        await startSession(req, account);
        const token = generateToken(account);

        const responseAccount = account.account_type === "bloodbank"
            ? { bloodbank_id: account.account_id, full_name: account.full_name, name: account.full_name, username: account.username, email: account.email, account_type:"bloodbank" }
            : { user_id: account.account_id, full_name: account.full_name, username: account.username, email: account.email, role: account.role, blood_group: account.blood_group, account_type:"user" };

        return res.status(200).json({success:true,message:"Login successful.",token,user:responseAccount});
    } catch (error) {
        console.error("❌ Login error:",error);
        return res.status(500).json({success:false,message:"Server Error"});
    }
};

const forgotPassword = async (req, res) => {
    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        // Find user
        const user = await findByEmailForPasswordReset(email);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No account found with this email address."
            });
        }

        // Generate OTP
        const otp = generateOTP();

        // OTP expires in 5 minutes
        const expiry = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // Save OTP
        await saveResetOTP(
            user.user_id,
            otp,
            expiry
        );

        // Send email
        await sendEmail(
            email,
            "Blood Lagbe Password Reset",
            `
                <div style="font-family: Arial, sans-serif;">

                    <h2>Password Reset Request</h2>

                    <p>
                        We received a request to reset your
                        Blood-Lagbe password.
                    </p>

                    <p>Your password reset OTP is:</p>

                    <h1>${otp}</h1>

                    <p>
                        This OTP will expire in 5 minutes.
                    </p>

                    <p>
                        If you did not request this,
                        you can safely ignore this email.
                    </p>

                </div>
            `
        );

        return res.status(200).json({
            success: true,
            message: "Password reset OTP sent successfully."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};
const verifyResetOTP = async (req, res) => {
    try {

        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required."
            });
        }

        const user = await findByResetOTP(
            email,
            otp
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP."
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

const resetPassword = async (req, res) => {
    try {

        const {
            email,
            otp,
            password,
            confirmPassword
        } = req.body;

        if (
            !email ||
            !otp ||
            !password ||
            !confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        // Confirm password
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });
        }

        // Password requirements
        const strongPassword =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

        if (!strongPassword.test(password)) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must contain at least 8 characters, including uppercase, lowercase, number and special character."
            });
        }

        // Verify OTP again
        const user = await findByResetOTP(
            email,
            otp
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP."
            });
        }

        // Hash new password
        const hashedPassword =
            await bcrypt.hash(password, 10);

        // Update password
        await updatePassword(
            user.user_id,
            hashedPassword
        );

        return res.status(200).json({
            success: true,
            message:
                "Password reset successfully. You can now login."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    register,
    verifyOTP,
    login,
    forgotPassword,
    verifyResetOTP,
    resetPassword
};