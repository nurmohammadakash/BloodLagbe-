const mysql = require("mysql2");

console.log("🔧 Database configuration:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

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