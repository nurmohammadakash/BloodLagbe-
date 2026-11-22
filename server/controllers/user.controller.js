const { getUserProfile } = require("../models/user.model");

const profile = async (req, res) => {

    try {

        const user = await getUserProfile(req.user.user_id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

module.exports = {
    profile
};