// Runs all SQL files from /database into the database set in .env, in the right order.
// Usage:  node server/scripts/import-db.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const FILES = [
    "schema.sql",
    "nid_registry.sql",
    "landing_and_bloodbank_migration.sql",
    "registration_fix.sql",
    "final_project_updates.sql",
    "final_fixes.sql"
];

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
        multipleStatements: true
    });
    console.log("Connected to", process.env.DB_HOST, "database:", process.env.DB_NAME);

    // Optional: node server/scripts/import-db.js nid_registry.sql  -> start from that file
    const startAt = process.argv[2] ? FILES.indexOf(process.argv[2]) : 0;
    if (startAt < 0) { console.log("Unknown file:", process.argv[2]); process.exit(1); }

    for (const file of FILES.slice(startAt)) {
        const sql = fs.readFileSync(path.join(__dirname, "../../database", file), "utf8");
        try {
            await conn.query(sql);
            console.log("OK   ", file);
        } catch (err) {
            console.log("ERROR", file, "->", err.message);
            console.log("Stopped. Send this error message to Claude.");
            await conn.end();
            process.exit(1);
        }
    }
    console.log("All done. Database is ready.");
    await conn.end();
})().catch((e) => { console.error("Connection failed:", e.message); process.exit(1); });