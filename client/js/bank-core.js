(() => {
    const TOKEN_KEY = "bloodLagbeToken";
    const USER_KEY = "bloodLagbeUser";

    const Bank = {
        profile: null,

        token: () => localStorage.getItem(TOKEN_KEY),

        clear() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        },

        logout(expired = false) {
            try { fetch("/api/auth/logout", { method: "POST", keepalive: true }); } catch { /* ignore */ }
            Bank.clear();
            location.href = expired ? "/login" : "/";
        },

        // Every blood bank request goes through here
        async api(path, options = {}) {
            const hasBody = options.body !== undefined && typeof options.body !== "string";
            const res = await fetch(`/api/bank${path}`, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Bank.token()}`,
                    ...(options.headers || {})
                },
                body: hasBody ? JSON.stringify(options.body) : options.body
            });

            let data = {};
            try { data = await res.json(); } catch { /* non-JSON response */ }

            if (res.status === 401) {
                Bank.logout(true);
                throw Object.assign(new Error(data.message || "Session expired."), { status: 401 });
            }
            if (!res.ok || data.success === false) {
                                throw Object.assign(new Error(data.message || "Request failed."), { status: res.status, data });
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

    window.Bank = Bank;
})();