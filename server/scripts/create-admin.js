require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const bcrypt = require("bcrypt");
const db = require("../config/db");

(async () => {
    const [username, email, password] = process.argv.slice(2);

    if (!username || !email || !password) {
        console.log('Usage: node server/scripts/create-admin.js <username> <email> "<password>"');
        process.exit(1);
    }

    const hash = await bcrypt.hash(password, 10);
    await db.execute(
        "INSERT INTO admin (username, email, password, role_level) VALUES (?, ?, ?, 'Super Admin')",
        [username, email, hash]
    );

    console.log(`✅ Super Admin "${username}" created.`);
    process.exit(0);
})().catch(err => {
    console.error("❌", err.message);
    process.exit(1);
});