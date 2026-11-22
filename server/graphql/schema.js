// Simple read-only GraphQL API for public Blood-Lagbe data.
// One endpoint (/graphql): the client chooses exactly the fields it wants.

const { buildSchema, GraphQLError } = require("graphql");
const db = require("../config/db");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const typeDefs = `
    "Units of one blood group"
    type StockLine {
        bloodGroup: String!
        units: Int!
    }

    "An approved blood bank with its live free stock"
    type BloodBank {
        id: Int!
        name: String!
        district: String!
        upazila: String!
        address: String!
        totalUnits: Int!
        stock: [StockLine!]!
    }

    "A public High or Critical blood request (no patient details)"
    type UrgentRequest {
        id: Int!
        bloodGroup: String!
        units: Int!
        urgency: String!
        hospital: String!
        neededBy: String!
    }

    type SiteRating {
        average: Float!
        total: Int!
    }

    "Number of active, eligible donors for one blood group"
    type DonorCount {
        bloodGroup: String!
        donors: Int!
    }

    type Query {
        "Average and number of site ratings"
        siteRating: SiteRating!

        "Approved blood banks. Filter by district and/or a blood group that is in stock (for example O+)"
        bloodBanks(district: String, bloodGroup: String, limit: Int = 10): [BloodBank!]!

        "One blood bank by id"
        bloodBank(id: Int!): BloodBank

        "Most urgent pending requests"
        urgentRequests(limit: Int = 5): [UrgentRequest!]!

        "Eligible donors per blood group (SQL GROUP BY)"
        donorCounts: [DonorCount!]!
    }
`;

const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
};

const safely = (label, work) => async (...args) => {
    try {
        return await work(...args);
    } catch (error) {
        if (error instanceof GraphQLError) throw error;
        console.error(`GraphQL ${label} error:`, error);
        throw new GraphQLError("Could not load this data right now.");
    }
};

// Free units only (not expired, not reserved)
const loadStock = async (bankIds) => {
    const byBank = {};
    if (!bankIds.length) return byBank;
    const [rows] = await db.query(
        `SELECT bloodbank_id, blood_group, SUM(units_left) AS units
         FROM blood_batch
         WHERE bloodbank_id IN (?) AND status = 'Available' AND units_left > 0 AND expires_on >= CURDATE()
         GROUP BY bloodbank_id, blood_group`,
        [bankIds]
    );
    rows.forEach((r) => { (byBank[r.bloodbank_id] = byBank[r.bloodbank_id] || {})[r.blood_group] = Number(r.units); });
    return byBank;
};

const shapeBank = (row, stockMap) => {
    const have = stockMap[row.bloodbank_id] || {};
    const stock = BLOOD_GROUPS.map((g) => ({ bloodGroup: g, units: have[g] || 0 }));
    return {
        id: row.bloodbank_id,
        name: row.name,
        district: row.district,
        upazila: row.upazila,
        address: row.address,
        totalUnits: stock.reduce((s, x) => s + x.units, 0),
        stock
    };
};

const BANK_COLUMNS = "bloodbank_id, name, district, upazila, address";

const rootValue = {
    siteRating: safely("siteRating", async () => {
        const [[row]] = await db.query(
            "SELECT COUNT(*) AS total, COALESCE(ROUND(AVG(rating_value), 1), 0) AS average FROM site_rating"
        );
        return { average: Number(row.average), total: Number(row.total) };
    }),

    bloodBanks: safely("bloodBanks", async ({ district, bloodGroup, limit }) => {
        if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup)) {
            throw new GraphQLError(`bloodGroup must be one of: ${BLOOD_GROUPS.join(", ")}`);
        }
        const where = ["status = 'Approved'", "email_verified = TRUE"];
        const params = [];
        if (district) { where.push("district = ?"); params.push(String(district).slice(0, 100)); }

        const [banks] = await db.query(
            `SELECT ${BANK_COLUMNS} FROM blood_bank WHERE ${where.join(" AND ")} ORDER BY name LIMIT 200`,
            params
        );
        const stock = await loadStock(banks.map((b) => b.bloodbank_id));
        let items = banks.map((b) => shapeBank(b, stock));
        if (bloodGroup) items = items.filter((b) => b.stock.find((s) => s.bloodGroup === bloodGroup).units > 0);
        return items.slice(0, clamp(limit, 1, 50, 10));
    }),

    bloodBank: safely("bloodBank", async ({ id }) => {
        const [banks] = await db.query(
            `SELECT ${BANK_COLUMNS} FROM blood_bank WHERE bloodbank_id = ? AND status = 'Approved' AND email_verified = TRUE`,
            [id]
        );
        if (!banks.length) return null;
        return shapeBank(banks[0], await loadStock([banks[0].bloodbank_id]));
    }),

    urgentRequests: safely("urgentRequests", async ({ limit }) => {
        const [rows] = await db.query(
            `SELECT request_id, blood_group, units_required, urgency_level, hospital_name,
                    DATE_FORMAT(required_date, '%Y-%m-%d') AS needed_by
             FROM blood_request
             WHERE status = 'Pending' AND bloodbank_id IS NULL AND urgency_level IN ('High', 'Critical')
             ORDER BY FIELD(urgency_level, 'Critical', 'High'), created_at DESC
             LIMIT ?`,
            [clamp(limit, 1, 20, 5)]
        );
        return rows.map((r) => ({
            id: r.request_id,
            bloodGroup: r.blood_group,
            units: Number(r.units_required),
            urgency: r.urgency_level,
            hospital: r.hospital_name,
            neededBy: r.needed_by
        }));
    }),

    donorCounts: safely("donorCounts", async () => {
        const [rows] = await db.query(
            `SELECT blood_group, COUNT(*) AS donors
             FROM user
             WHERE email_verified = TRUE AND account_status = 'Active'
               AND role IN ('Donor', 'Both') AND eligibility_status = 'Eligible'
             GROUP BY blood_group`
        );
        const have = Object.fromEntries(rows.map((r) => [r.blood_group, Number(r.donors)]));
        return BLOOD_GROUPS.map((g) => ({ bloodGroup: g, donors: have[g] || 0 }));
    })
};

module.exports = { schema: buildSchema(typeDefs), rootValue };