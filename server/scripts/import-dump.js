// Wipes the tables in the database from .env and imports database/blood_lagbe_tidb.sql
// Usage:  node server/scripts/import-dump.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

(async () => {
    const file = path.join(__dirname, "../../database/blood_lagbe_tidb.sql");
    if (!fs.existsSync(file)) { console.log("File not found:", file); process.exit(1); }

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

    // 1. remove tables created by the earlier partial import
    const [rows] = await conn.query("SHOW TABLES");
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    for (const r of rows) {
        const name = Object.values(r)[0];
        await conn.query("DROP TABLE IF EXISTS `" + name + "`");
    }
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
    console.log("Old tables removed:", rows.length);

    // 2. import the full dump
    try {
        await conn.query(fs.readFileSync(file, "utf8"));
    } catch (err) {
        console.log("ERROR ->", err.message);
        console.log("Stopped. Send this error message to Claude.");
        await conn.end();
        process.exit(1);
    }

    const [t] = await conn.query("SHOW TABLES");
    const [u] = await conn.query("SELECT COUNT(*) AS n FROM `user`");
    console.log("Done. Tables:", t.length, "| Users:", u[0].n);
    await conn.end();
})().catch((e) => { console.error("Failed:", e.message); process.exit(1); });