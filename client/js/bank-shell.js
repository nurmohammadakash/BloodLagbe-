(() => {
    if (!Bank.token()) {
        location.replace("/login");
        return;
    }

    const NAV = [
        { group: "Main", items: [
            { id: "overview", icon: "📊", label: "Dashboard" }
        ]},
        { group: "Blood stock", items: [
            { id: "inventory", icon: "🧪", label: "Inventory" },
            { id: "requests", icon: "🩸", label: "Blood Requests" }
        ]},
        { group: "Account", items: [
            { id: "settings", icon: "⚙️", label: "Profile & Settings" }
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
            view.innerHTML = `<div class="card empty"><h3>Something went wrong</h3><p>${Bank.escape(err.message)}</p></div>`;
        }
    }

    function fillProfile(bank) {
        $("bankName").textContent = bank.name;
        $("bankStatus").textContent = bank.status === "Approved" ? "Verified blood bank" : bank.status;
        $("bankAvatar").textContent = (bank.name || "B").charAt(0).toUpperCase();
    }

    // Each module registers itself: BankShell.register("overview", async (el) => {...})
    window.BankShell = {
        register: (id, fn) => { views[id] = fn; },
        setBadge: (id, count) => { badges[id] = count; renderNav(currentId); }
    };

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
    $("logoutBtn").addEventListener("click", () => Bank.logout(false));

    window.addEventListener("hashchange", show);

    window.addEventListener("load", async () => {
        try {
            const data = await Bank.api("/me");
            Bank.profile = data.bank;
            fillProfile(data.bank);
        } catch (err) {
            if (err.status === 403 && /only for blood bank/i.test(err.message)) {
                location.replace("/dashboard");
                return;
            }
            $("view").innerHTML = `<div class="card empty"><h3>Cannot open the panel</h3><p>${Bank.escape(err.message)}</p></div>`;
            return;
        }
        show();
    });
})();