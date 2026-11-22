const path = require("path");
const dotenv = require("dotenv");
const envPath = path.join(__dirname, "../.env");
console.log("🔧 Loading environment file:", envPath);

const envResult = dotenv.config({
    path: envPath
});

if (envResult.error) {
    console.error(
        "❌ Failed to load .env:",
        envResult.error.message
    );
} else {
    console.log("✅ .env loaded successfully");
}

// =====================================================
// IMPORTS
// =====================================================

const express = require("express");
const session = require("express-session");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const publicRoutes = require("./routes/public.routes");
const bloodBankRoutes = require("./routes/bloodbank.routes");
const bankRoutes = require("./routes/bank.routes");
const socialRoutes = require("./routes/social.routes");
const adminRoutes = require("./routes/admin.routes");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { createHandler } = require("graphql-http/lib/use/express");
const { schema: graphqlSchema, rootValue: graphqlRoot } = require("./graphql/schema");
// =====================================================
// DATABASE CONFIGURATION DEBUG
// =====================================================

console.log("");
console.log("🔧 Database configuration:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("");

// =====================================================
// CREATE EXPRESS APP
// =====================================================

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
// =====================================================
// PATHS
// =====================================================

const clientPath = path.join(
    __dirname,
    "../client"
);

console.log("📁 Client path:", clientPath);

// =====================================================
// BODY PARSING MIDDLEWARE
// =====================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

// =====================================================
// SESSION MIDDLEWARE
// =====================================================

app.use(
    session({
        name: "bl.sid",
        rolling: true,
        secret: process.env.SESSION_SECRET || "blood_lagbe_super_secret_key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

// =====================================================
// AUTH API ROUTES
// =====================================================
//
// All routes inside auth.routes.js start with:
//
// /api/auth
//
// Examples:
//
// POST /api/auth/register
// POST /api/auth/verify-email
// POST /api/auth/login
//
// =====================================================

app.use(
    "/api/auth",
    authRoutes
);

app.use("/api/user", userRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/bloodbank", bloodBankRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/social", socialRoutes);
// GraphQL: one read-only endpoint for public data
app.use("/graphql", rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.all("/graphql", createHandler({ schema: graphqlSchema, rootValue: graphqlRoot }));
// =====================================================
// SERVE FRONTEND
// =====================================================

app.use(
    express.static(clientPath)
);
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many failed login attempts. Try again in 15 minutes." }
});
app.use("/api/admin/auth/login", adminLoginLimiter);
app.use("/api/admin", adminRoutes);

// =====================================================
// HOME PAGE
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "index.html"
            )
        );

    }
);

// =====================================================
// AUTH PAGES
// =====================================================

app.get(
    "/login",
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "auth",
                "login.html"
            )
        );

    }
);
app.get("/admin/login", (req, res) => {
    res.sendFile(path.join(clientPath, "pages", "admin", "login.html"));
});

app.get(["/admin", "/admin/dashboard"], (req, res) => {
    res.sendFile(path.join(clientPath, "pages", "admin", "dashboard.html"));
});

app.get(
    "/signup",
    (req, res) => {
        res.sendFile(path.join(clientPath, "pages", "auth", "role-selection.html"));
    }
);

app.get(
    "/bloodbank/register",
    (req, res) => {
        res.sendFile(path.join(clientPath, "pages", "bloodbank", "register.html"));
    }
);

app.get(
    "/register",
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "auth",
                "register.html"
            )
        );

    }
);

// =====================================================
// VERIFY EMAIL
// =====================================================
//
// Support BOTH:
//
// /verify-email
// /verify-email.html
//
// =====================================================

app.get(
    ["/verify-email", "/verify-email.html"],
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "auth",
                "verify-email.html"
            )
        );

    }
);

app.get(
    "/forgot-password",
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "auth",
                "forgot-password.html"
            )
        );

    }
);

app.get(
    "/reset-password",
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "auth",
                "reset-password.html"
            )
        );

    }
);

// =====================================================
// USER PAGES
// =====================================================

app.get(
    "/dashboard",
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "user",
                "dashboard.html"
            )
        );

    }
);

app.get(
    "/profile",
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "user",
                "profile.html"
            )
        );

    }
);
app.get(
    "/connection",
    (req, res) => {
        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "user",
                "connection.html"
            )
        );
    }
);
app.get("/banks", (req, res) => {
    res.sendFile(path.join(clientPath, "pages", "user", "banks.html"));
});
app.get("/donor-search", (req, res) => {
    res.sendFile(path.join(clientPath, "pages", "donor-search.html"));
});
app.get("/graphql-demo", (req, res) => {
    res.sendFile(path.join(clientPath, "pages", "graphql.html"));
});
app.get(
    "/newsfeed",
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "user",
                "newsfeed.html"
            )
        );

    }
);

// =====================================================
// ADMIN
// =====================================================

app.get(
    "/admin/dashboard",
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "admin",
                "dashboard.html"
            )
        );

    }
);

// =====================================================
// BLOOD BANK
// =====================================================

app.get(
    "/bloodbank/dashboard",
    (req, res) => {

        res.sendFile(
            path.join(
                clientPath,
                "pages",
                "bloodbank",
                "dashboard.html"
            )
        );

    }
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Blood-Lagbe server is running",

            timestamp:
                new Date().toISOString()

        });

    }
);

// =====================================================
// 404 HANDLER
// =====================================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "Route not found"

        });

    }
);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "❌ Server Error:",
            err
        );

        res.status(500).json({

            success: false,

            message:
                "Internal server error"

        });

    }
);

// =====================================================
// START SERVER
// =====================================================

const PORT =
    process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, "../client")));

const server = app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "======================================"
        );

        console.log(
            "🩸 BLOOD-LAGBE SERVER"
        );

        console.log(
            "======================================"
        );

        console.log(
            `🚀 Server running at http://localhost:${PORT}`
        );

        console.log(
            `🏠 Home: http://localhost:${PORT}/`
        );

        console.log(
            `📝 Register: http://localhost:${PORT}/register`
        );

        console.log(
            `🔐 Login: http://localhost:${PORT}/login`
        );

        console.log(
            `📧 Verify Email: http://localhost:${PORT}/verify-email`
        );

        console.log(
            `❤️ Health: http://localhost:${PORT}/api/health`
        );
        console.log(`🛡️ Admin: http://localhost:${PORT}/admin/login`);

        console.log(
            "======================================"
        );

        console.log("");

    }
);
require("./socket").init(server);