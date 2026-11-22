(() => {
    const TOKEN_KEY = "bloodLagbeAdminToken";
    const ADMIN_KEY = "bloodLagbeAdmin";

    const Admin = {
        token: () => localStorage.getItem(TOKEN_KEY),

        admin() {
            try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || "null"); }
            catch { return null; }
        },

        save(token, admin) {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
        },

        clear() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(ADMIN_KEY);
        },

        logout() {
            Admin.clear();
            location.href = "/admin/login";
        },

        // Every admin request goes through here
        async api(path, options = {}) {
            const hasBody = options.body !== undefined && typeof options.body !== "string";
            const res = await fetch(`/api/admin${path}`, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Admin.token()}`,
                    ...(options.headers || {})
                },
                body: hasBody ? JSON.stringify(options.body) : options.body
            });

            let data = {};
            try { data = await res.json(); } catch { /* non-JSON response */ }

            if (res.status === 401) {
                Admin.logout();
                throw new Error(data.message || "Session expired.");
            }
            if (!res.ok || data.success === false) {
                throw new Error(data.message || "Request failed.");
            }
            return data;
        },

        escape: (s) =>
            String(s ?? "").replace(/[&<>"']/g, (c) =>
                ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
            ),

        toast(message, type = "info") {
            const wrap = document.getElementById("toastWrap");
            if (!wrap) return;
            const el = document.createElement("div");
            el.className = `toast ${type}`;
            el.textContent = message;
            wrap.appendChild(el);
            setTimeout(() => el.remove(), 3500);
        }
    };

    window.Admin = Admin;
})();