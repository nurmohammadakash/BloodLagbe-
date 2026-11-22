// Server-side session for logged-in users and blood banks.
// The JWT still authorises API calls; the session records who is signed in,
// from where and since when, and is destroyed on logout.

const SESSION_COOKIE = "bl.sid";

const browserName = (ua = "") => {
    const browser = /Edg\//.test(ua) ? "Edge"
        : /OPR\//.test(ua) ? "Opera"
        : /Chrome\//.test(ua) ? "Chrome"
        : /Firefox\//.test(ua) ? "Firefox"
        : /Safari\//.test(ua) ? "Safari"
        : "Unknown browser";
    const os = /Windows/.test(ua) ? "Windows"
        : /Android/.test(ua) ? "Android"
        : /iPhone|iPad/.test(ua) ? "iOS"
        : /Mac OS/.test(ua) ? "macOS"
        : /Linux/.test(ua) ? "Linux"
        : "Unknown OS";
    return `${browser} on ${os}`;
};

const cleanIp = (ip = "") => String(ip).replace(/^::ffff:/, "") || "unknown";

const describe = (req) => ({
    browser: browserName(req.headers["user-agent"]),
    ip: cleanIp(req.ip)
});

// Called by login. A fresh session id is issued on every login (prevents session fixation).
const startSession = (req, account) => new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
        if (error) return reject(error);
        const now = new Date().toISOString();
        req.session.account = {
            type: account.account_type === "bloodbank" ? "bloodbank" : "user",
            id: Number(account.account_id),
            username: account.username,
            name: account.full_name,
            logged_in_at: now,
            last_activity: now,
            resumed: false,
            ...describe(req)
        };
        req.session.save((err) => (err ? reject(err) : resolve()));
    });
});

// GET /api/auth/session  (needs the JWT)
const sessionInfo = async (req, res) => {
    try {
        const jwtType = req.user.account_type === "bloodbank" ? "bloodbank" : "user";
        const jwtId = Number(req.user.account_id || req.user.user_id);

        let s = req.session && req.session.account;

        // No session (server restarted) or it belongs to someone else: start a new one
        if (!s || s.type !== jwtType || s.id !== jwtId) {
            const now = new Date().toISOString();
            req.session.account = s = {
                type: jwtType,
                id: jwtId,
                username: req.user.username || null,
                name: null,
                logged_in_at: now,
                last_activity: now,
                resumed: true,
                ...describe(req)
            };
        }

        const previousActivity = s.last_activity;
        s.last_activity = new Date().toISOString();

        res.json({
            success: true,
            session: {
                account_type: s.type,
                username: s.username,
                logged_in_at: s.logged_in_at,
                previous_activity: previousActivity,
                last_activity: s.last_activity,
                expires_at: new Date(Date.now() + req.session.cookie.maxAge).toISOString(),
                browser: s.browser,
                ip: s.ip,
                resumed: s.resumed
            }
        });
    } catch (error) {
        console.error("sessionInfo error:", error);
        res.status(500).json({ success: false, message: "Could not read the session." });
    }
};

// POST /api/auth/logout  (works even if the token already expired)
const logout = (req, res) => {
    const finish = () => {
        res.clearCookie(SESSION_COOKIE);
        res.json({ success: true, message: "Logged out." });
    };
    if (!req.session) return finish();
    req.session.destroy(() => finish());
};

module.exports = { SESSION_COOKIE, startSession, sessionInfo, logout };