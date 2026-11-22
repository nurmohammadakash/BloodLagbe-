const { requireAuth } = require("./actor.middleware");

const onlyBank = (req, res, next) => {
    if (req.actor.type !== "bloodbank") {
        return res.status(403).json({ success: false, message: "This area is only for blood bank accounts." });
    }
    next();
};

// Token check + live "Approved" check (from requireAuth) + blood bank account type
module.exports = { requireBank: [...requireAuth, onlyBank] };