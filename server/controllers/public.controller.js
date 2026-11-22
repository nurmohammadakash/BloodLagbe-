const jwt = require("jsonwebtoken");
const db = require("../config/db");

const listUrgentRequests = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT request_id, blood_group, units_required, urgency_level,
                   patient_name, hospital_name, hospital_address,
                   required_date, created_at
            FROM blood_request
            WHERE status = 'Pending'
              AND bloodbank_id IS NULL
              AND urgency_level IN ('High', 'Critical')
              AND required_date >= CURDATE()
            ORDER BY FIELD(urgency_level, 'Critical', 'High'), created_at DESC
            LIMIT 12
        `);
        res.json({ success: true, requests: rows });
    } catch (error) {
        console.error("Public urgent request error:", error);
        res.status(500).json({ success: false, message: "Unable to load urgent blood requests." });
    }
};
// Live numbers for the homepage counters (users, blood banks, blood requests, lives helped)
const getPublicStats = async (req, res) => {
    const count = async (sql) => {
        try {
            const [rows] = await db.execute(sql);
            return Number(rows[0].total) || 0;
        } catch (error) {
            console.error("Public stats query error:", error.message);
            return 0;
        }
    };
    try {
        const users = await count("SELECT COUNT(*) AS total FROM user WHERE email_verified = 1 AND account_status = 'Active'");
        const banks = await count("SELECT COUNT(*) AS total FROM blood_bank WHERE email_verified = 1 AND status NOT IN ('Rejected', 'Inactive')");
        const requests = await count("SELECT COUNT(*) AS total FROM blood_request");
        const connections = await count("SELECT COUNT(*) AS total FROM blood_connection WHERE status = 'Successful'");
        const exchanges = await count("SELECT COUNT(*) AS total FROM blood_exchange WHERE status = 'Successful'");
        res.set("Cache-Control", "no-store");
        res.json({ success: true, users, banks, requests, lives_helped: connections + exchanges });
    } catch (error) {
        console.error("Public stats error:", error);
        res.status(500).json({ success: false, message: "Unable to load statistics." });
    }
};
const listPublicDonors = async (req, res) => {
    try {
        const bloodGroup = String(req.query.blood_group || "").trim();
        const latitude = Number(req.query.latitude);
        const longitude = Number(req.query.longitude);
        const radius = Math.min(Math.max(Number(req.query.radius_km) || 5, 0.5), 5);
        const groupParams = [];
        let where = `email_verified = TRUE AND account_status = 'Active'
                     AND role IN ('Donor','Both')
                     AND eligibility_status = 'Eligible'`;
        if (bloodGroup) {
            const groups = bloodGroup.split(",").map(v=>v.trim()).filter(Boolean);
            if (groups.length) {
                where += ` AND blood_group IN (${groups.map(()=>"?").join(",")})`;
                groupParams.push(...groups);
            }
        }
                const district = String(req.query.district || "").trim().slice(0, 100);
        const districtParams = [];
        if (district) {
            where += " AND district = ?";
            districtParams.push(district);
        }

        let distanceSelect = "NULL AS distance_km";
        let distanceWhere = "";
        let selectParams = [];
        let whereParams = [];
        let distanceOrder = "created_at DESC";

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            distanceSelect = `(6371 * ACOS(LEAST(1, GREATEST(-1,
                COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?))
                + SIN(RADIANS(?)) * SIN(RADIANS(latitude))
            )))) AS distance_km`;
                        distanceWhere = ` AND latitude IS NOT NULL AND longitude IS NOT NULL AND (6371 * ACOS(LEAST(1, GREATEST(-1,
                COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?))
                + SIN(RADIANS(?)) * SIN(RADIANS(latitude))
            )))) <= ?`;
            selectParams = [latitude, longitude, latitude];
            whereParams = [latitude, longitude, latitude, radius];
            distanceOrder = "distance_km ASC";
        }

        const [rows] = await db.execute(`
            SELECT user_id, username, blood_group, district, latitude, longitude, ${distanceSelect}
            FROM user
            WHERE ${where}${distanceWhere}
            ORDER BY ${distanceOrder}
            LIMIT 100
            `, [...selectParams, ...groupParams, ...districtParams, ...whereParams]);

        res.json({
            success:true,
            donors:rows.map(row=>({
                id:row.user_id, username:row.username, blood_group:row.blood_group,district:row.district,
                latitude:row.latitude===null?null:Number(row.latitude),
                longitude:row.longitude===null?null:Number(row.longitude),
                distance_km:row.distance_km===null?null:Number(row.distance_km)
            }))
        });
    } catch (error) {
        console.error("Public donor error:",error);
        res.status(500).json({success:false,message:"Unable to load donors."});
    }
};

const googleMapsConfig = (req, res) => {
    res.json({ success: true, key: process.env.GOOGLE_MAPS_API_KEY || "" });
};

const checkUsername = async (req, res) => {
    try {
        const username = String(req.query.username || "").trim();
        if (username.length < 3) return res.json({ success: true, available: true, suggestions: [] });

        const [userRows] = await db.execute(
            `SELECT username FROM user WHERE username LIKE ? ORDER BY username LIMIT 8`,
            [`${username}%`]
        );
        const [bankRows] = await db.execute(
            `SELECT username FROM blood_bank WHERE username LIKE ? ORDER BY username LIMIT 8`,
            [`${username}%`]
        );
        const suggestions = [...userRows, ...bankRows].map(row => row.username);
        res.json({ success: true, available: suggestions.length === 0 || !suggestions.includes(username), suggestions });
    } catch (error) {
        console.error("Username check error:", error);
        res.status(500).json({ success: false, message: "Unable to check username." });
    }
};

const optionalUserId = (req) => {
    try {
        const header = req.headers.authorization || "";
        if (!header.startsWith("Bearer ")) return null;
        const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
        if (decoded.account_type === "bloodbank") return null;
        return Number(decoded.account_id || decoded.user_id) || null;
    } catch {
        return null;
    }
};

const ratingSummary = async () => {
    const [[summary]] = await db.execute(`
        SELECT COUNT(*) AS total_ratings,
               COALESCE(ROUND(AVG(rating_value), 1), 0) AS average_rating
        FROM site_rating
    `);
    return { total_ratings: Number(summary.total_ratings), average_rating: Number(summary.average_rating) };
};


const submitSiteRating = async (req, res) => {
    try {
        const rating = Number(req.body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
        }

        const userId = optionalUserId(req);
        let ratingId = null;

        if (userId) {
            const [rows] = await db.execute("SELECT rating_id FROM site_rating WHERE user_id = ? LIMIT 1", [userId]);
            if (rows.length) ratingId = rows[0].rating_id;
        } else if (req.session && req.session.siteRatingId) {
            const [rows] = await db.execute(
                "SELECT rating_id FROM site_rating WHERE rating_id = ? AND user_id IS NULL", [req.session.siteRatingId]
            );
            if (rows.length) ratingId = rows[0].rating_id;
        }

        if (ratingId) {
            await db.execute("UPDATE site_rating SET rating_value = ? WHERE rating_id = ?", [rating, ratingId]);
        } else {
            const [result] = await db.execute(
                "INSERT INTO site_rating (user_id, rating_value) VALUES (?, ?)", [userId, rating]
            );
            if (!userId && req.session) req.session.siteRatingId = result.insertId;
        }

        res.status(201).json({
            success: true,
            updated: !!ratingId,
            message: ratingId ? "Your rating was updated. Thank you!" : "Thank you for rating Blood-Lagbe!",
            ...(await ratingSummary())
        });
    } catch (error) {
        console.error("Site rating error:", error);
        res.status(500).json({ success: false, message: "Unable to save rating." });
    }
};

const getSiteRating = async (req, res) => {
    try {
        res.json({ success: true, ...(await ratingSummary()) });
    } catch (error) {
        console.error("Site rating summary error:", error);
        res.status(500).json({ success: false, message: "Unable to load rating." });
    }
};
module.exports = {
    listUrgentRequests,
    getPublicStats,
    listPublicDonors,
    googleMapsConfig,
    checkUsername,
    submitSiteRating,
    getSiteRating
};
