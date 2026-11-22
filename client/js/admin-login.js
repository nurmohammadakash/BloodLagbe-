document.addEventListener("DOMContentLoaded", () => {
    const TOKEN_KEY = "bloodLagbeAdminToken";
    const ADMIN_KEY = "bloodLagbeAdmin";

    if (localStorage.getItem(TOKEN_KEY)) {
        location.replace("/admin");
        return;
    }

    const form = document.getElementById("adminLoginForm");
    const msg = document.getElementById("formMsg");
    const btn = document.getElementById("loginBtn");
    const pw = document.getElementById("password");

    const showMsg = (text, type) => {
        msg.textContent = text;
        msg.className = `form-msg ${type || ""}`;
    };

    document.getElementById("pwToggle").addEventListener("click", (e) => {
        const hidden = pw.type === "password";
        pw.type = hidden ? "text" : "password";
        e.target.textContent = hidden ? "Hide" : "Show";
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const login = document.getElementById("login").value.trim();
        const password = pw.value;

        if (!login || !password) {
            showMsg("Please enter your username/email and password.", "error");
            return;
        }

        btn.disabled = true;
        btn.textContent = "Signing in…";
        showMsg("", "");

        try {
            const res = await fetch("/api/admin/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login, password })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                showMsg(data.message || "Login failed.", "error");
                return;
            }

            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
            showMsg("Login successful. Redirecting…", "success");
            setTimeout(() => (location.href = "/admin"), 500);
        } catch (err) {
            showMsg("Unable to connect to the server.", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Sign in";
        }
    });
});