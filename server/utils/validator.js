const { body } = require("express-validator");

exports.registerValidation = [
    body("full_name")
        .trim()
        .notEmpty()
        .withMessage("Full name is required."),

    body("date_of_birth")
        .notEmpty()
        .withMessage("Date of birth is required.")
        .isISO8601()
        .withMessage("Invalid date of birth.")
        .custom((value) => {
            const dob = new Date(value);
            const now = new Date();
            if (Number.isNaN(dob.getTime()) || dob > now) {
                throw new Error("Date of birth cannot be in the future.");
            }
            let age = now.getFullYear() - dob.getFullYear();
            const birthdayPassed =
                now.getMonth() > dob.getMonth() ||
                (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
            if (!birthdayPassed) age -= 1;
            if (age < 18) throw new Error("You must be at least 18 years old to register.");
            if (age > 100) throw new Error("Please enter a valid date of birth.");
            return true;
        }),

    body("gender")
        .isIn(["male", "female", "other"])
        .withMessage("Invalid gender."),

    body("username")
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage("Username must be 3-20 characters.")
        .matches(/^[a-zA-Z0-9_.]+$/)
        .withMessage("Username can contain only letters, numbers, _ and ."),

    body("email")
        .trim()
        .isEmail()
        .withMessage("Invalid email address.")
        .normalizeEmail(),

    body("phone")
        .trim()
        .matches(/^01[3-9]\d{8}$/)
        .withMessage("Invalid Bangladeshi phone number."),

    body("division")
        .trim()
        .notEmpty()
        .withMessage("Division is required."),

    body("district")
        .trim()
        .notEmpty()
        .withMessage("District is required."),

    body("upazila")
        .trim()
        .notEmpty()
        .withMessage("Upazila is required."),

    body("postal_code")
        .trim()
        .matches(/^\d{4}$/)
        .withMessage("Postal code must contain exactly 4 digits."),

    body("blood_group")
        .isIn([
            "A+", "A-",
            "B+", "B-",
            "AB+", "AB-",
            "O+", "O-"
        ])
        .withMessage("Invalid blood group."),

    body("role")
        .isIn(["donor", "recipient", "both"])
        .withMessage("Invalid Blood-Lagbe role."),

    body("address")
        .trim()
        .notEmpty()
        .withMessage("Full address is required."),

    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must contain at least 8 characters."),

    body("confirmPassword")
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match.");
            }
            return true;
        })
];
