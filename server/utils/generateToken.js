const jwt = require("jsonwebtoken");

const generateToken = (account) => jwt.sign(
    {
        account_id: account.account_id || account.user_id,
        account_type: account.account_type || "user",
        user_id: account.account_type === "user" ? account.account_id : undefined,
        email: account.email,
        role: account.role || "BloodBank"
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
);
module.exports = generateToken;
