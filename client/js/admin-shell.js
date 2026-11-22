(() => {
    // ---- Auth guard ----
    if (!Admin.token()) {
        location.replace("/admin/login");
        return;
    }

    const NAV = [
        { group: "Main", items: [
            { id: "overview", icon: "📊", label: "Overview" }
        ]},
        { group: "Management", items: [
            { id: "users", icon: "👥", label: "Users" },
            { id: "bloodbanks", icon: "🏥", label: "Blood Banks" },
            { id: "bankforecast", icon: "🤖", label: "AI Forecast" },
            { id: "requests", icon: "🩸", label: "Blood Requests" },
                        { id: "connections", icon: "🤝", label: "Blood Connections" },
            { id: "donations", icon: "💉", label: "Donations & Stock" },
            { id: "camps", icon: "⛺", label: "Camps & Events" }
        ]},
        { group: "Community", items: [
            { id: "moderation", icon: "🛡️", label: "Moderation" },
            { id: "reviews", icon: "⭐", label: "Reviews" },
            { id: "announcements", icon: "📢", label: "Announcements" }
        ]},
        { group: "System", items: [
            { id: "reports", icon: "📈", label: "Reports" },
            { id: "audit", icon: "🧾", label: "Audit Log" },
                        { id: "admins", icon: "🔑", label: "Admin Accounts" },
            { id: "settings", icon: "⚙️", label: "Settings" }
        ]}
    ];

    const views = {};
    const badges = {};
    let currentId = "overview";

    const $ = (id) => document.getElementById(id);
    const allItems = NAV.flatMap((g) => g.items);
    const findItem = (id) => allItems.find((i) => i.id === id);

    function renderNav(activeId) {
        currentId = activeId;
        $("sidebarNav").innerHTML = NAV.map((g) => `
            <div class="nav-group">
                <span class="nav-label">${g.group}</span>
                ${g.items.map((i) => `
                    <a class="nav-item ${i.id === activeId ? "active" : ""}" href="#${i.id}">
                        <span class="ico">${i.icon}</span><span>${i.label}</span>
                        ${badges[i.id] ? `<span class="nav-badge">${badges[i.id]}</span>` : ""}
                    </a>`).join("")}
            </div>`).join("");
    }

    function closeSidebar() {
        $("sidebar").classList.remove("open");
        $("sidebarOverlay").classList.remove("open");
    }

    async function show() {
        const id = (location.hash || "#overview").slice(1);
        const item = findItem(id) || findItem("overview");
        const view = $("view");

        $("pageTitle").textContent = item.label;
        renderNav(item.id);
        closeSidebar();

        const render = views[item.id];
        if (!render) {
            view.innerHTML = `
                <div class="card empty">
                    <div style="font-size:42px">${item.icon}</div>
                    <h3>${item.label}</h3>
                    <p>This module is coming in an upcoming step.</p>
                </div>`;
            return;
        }

        view.innerHTML = "";
        try {
            await render(view);
        } catch (err) {
            view.innerHTML = `<div class="card empty"><h3>Something went wrong</h3><p>${Admin.escape(err.message)}</p></div>`;
        }
    }

    function fillProfile(a) {
        if (!a) return;
        $("adminName").textContent = a.username;
        $("adminRole").textContent = a.role_level;
        $("adminAvatar").textContent = (a.username || "A").charAt(0).toUpperCase();
    }

    // Each module registers itself: AdminShell.register("users", async (el) => {...})
    window.AdminShell = {
        register: (id, fn) => { views[id] = fn; },
        setBadge: (id, count) => { badges[id] = count; renderNav(currentId); }
    };

    // ---- Events ----
    $("menuBtn").addEventListener("click", () => {
        $("sidebar").classList.add("open");
        $("sidebarOverlay").classList.add("open");
    });
    $("sidebarOverlay").addEventListener("click", closeSidebar);

    $("profileBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        $("profileDropdown").classList.toggle("open");
    });
    document.addEventListener("click", () => $("profileDropdown").classList.remove("open"));

    $("logoutBtn").addEventListener("click", async () => {
        try { await Admin.api("/auth/logout", { method: "POST" }); } catch { /* ignore */ }
        Admin.logout();
    });

    window.addEventListener("hashchange", show);

    window.addEventListener("load", async () => {
        fillProfile(Admin.admin());
        show();

        // Sidebar badges (pending blood banks, critical requests, open reports)
        Promise.allSettled([
            Admin.api("/bloodbanks?status=pending&limit=1"),
            Admin.api("/requests?status=open&limit=1"),
            Admin.api("/moderation/reports?status=open&limit=1")
        ]).then(([b, r, m]) => {
            if (b.status === "fulfilled") AdminShell.setBadge("bloodbanks", b.value.counts.pending);
            if (r.status === "fulfilled") AdminShell.setBadge("requests", r.value.counts.critical);
            if (m.status === "fulfilled") AdminShell.setBadge("moderation", m.value.counts.open);
        });

        try {
            const data = await Admin.api("/auth/me");   // confirms the session is still valid
            Admin.save(Admin.token(), data.admin);
            fillProfile(data.admin);
        } catch { /* Admin.api already redirected on 401 */ }
    });
})();