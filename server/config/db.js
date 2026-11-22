const mysql = require("mysql2");

console.log("🔧 Database configuration:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
const USE_SSL = process.env.DB_SSL === "true" || String(process.env.DB_HOST || "").endsWith("tidbcloud.com");
console.log("DB_SSL on:", USE_SSL);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    // TiDB Cloud (free MySQL) needs a secure connection. Set DB_SSL=true there. Leave empty locally.
    ssl: USE_SSL ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {

    if (err) {

        console.error(
            "❌ MySQL Connection Error:",
            err.message
        );

    } else {

        console.log("✅ MySQL Connected Successfully");

        connection.release();

    }

});

module.exports = pool.promise();