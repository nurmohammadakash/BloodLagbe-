(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const ui = AdminUI;
    const isAdminRole = () => ["Super Admin", "Admin"].includes((Admin.admin() || {}).role_level);

    const fmtTime = (ts) =>
        new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const actionClass = (a) => {
        if (/FAILED|DELETE|BLOCK|SUSPEND|REJECT|CANCEL|HIDE|VOID/.test(a)) return "bad";
        if (/APPROVE|ACTIVATE|REACTIVATE|RESTORE|LOGIN$|SEND/.test(a)) return "good";
        return "";
    };

    const fmtDetails = (raw) => {
        if (!raw) return '<span class="sub">—</span>';
        try {
            const obj = JSON.parse(raw);
            const parts = Object.entries(obj)
                .filter(([, v]) => v !== undefined && v !== null && v !== "")
                .map(([k, v]) => `<span class="kvp"><b>${esc(k)}:</b> ${esc(typeof v === "object" ? JSON.stringify(v) : v)}</span>`);
            return parts.length ? parts.join("") : '<span class="sub">—</span>';
        } catch {
            return esc(raw);
        }
    };

    AdminShell.register("audit", async (el) => {
        if (!isAdminRole()) {
            el.innerHTML = `<div class="card empty"><h3>Admins only</h3><p>Only Admins can view the audit log.</p></div>`;
            return;
        }

        const state = { action: "", admin_id: "", search: "", from: "", to: "", page: 1 };

        el.innerHTML = `
            <div class="page-head"><h1>Audit Log</h1><p>A permanent record of what every admin did, and when.</p></div>
            <div class="toolbar">
                <input class="input" id="auSearch" type="search" placeholder="Search details, target or IP…">
                <select class="select" id="auAction"><option value="">All actions</option></select>
                <select class="select" id="auAdmin"><option value="">All admins</option></select>
                <input class="input date" id="auFrom" type="date" title="From date">
                <input class="input date" id="auTo" type="date" title="To date">
            </div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th><th>IP</th></tr></thead>
                <tbody id="auBody"></tbody>
            </table></div></div>
            <div class="pager" id="auPager"></div>`;

        const $ = (id) => el.querySelector(`#${id}`);
        let filled = false;

        async function load() {
            const body = $("auBody");
            body.innerHTML = `<tr><td colspan="6" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({ ...state, limit: 20 });
                const res = await Admin.api(`/audit?${qs}`);

                if (!filled) {
                    $("auAction").innerHTML = `<option value="">All actions</option>` +
                        res.actions.map((a) => `<option>${esc(a)}</option>`).join("");
                    $("auAdmin").innerHTML = `<option value="">All admins</option>` +
                        res.admins.map((a) => `<option value="${esc(a.admin_id)}">${esc(a.username)}</option>`).join("");
                    filled = true;
                }

                body.innerHTML = res.items.length
                    ? res.items.map((l) => `
                        <tr>
                            <td style="white-space:nowrap">${fmtTime(l.created_at)}</td>
                            <td><strong>${esc(l.admin_name || "—")}</strong><br><span class="sub">${esc(l.role_level || "")}</span></td>
                            <td><span class="act ${actionClass(l.action)}">${esc(l.action)}</span></td>
                            <td>${l.target_type ? `${esc(l.target_type)}${l.target_id ? ` #${esc(l.target_id)}` : ""}` : "—"}</td>
                            <td style="max-width:420px">${fmtDetails(l.details)}</td>
                            <td><span class="sub">${esc(l.ip_address || "—")}</span></td>
                        </tr>`).join("")
                    : `<tr><td colspan="6" class="muted-empty">No log entries match these filters.</td></tr>`;

                ui.pager($("auPager"), res.pagination, (p) => { state.page = p; load(); });
            } catch (err) {
                body.innerHTML = `<tr><td colspan="6" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        const apply = (key) => (e) => { state[key] = e.target.value.trim(); state.page = 1; load(); };
        $("auSearch").addEventListener("input", ui.debounce(apply("search")));
        $("auAction").addEventListener("change", apply("action"));
        $("auAdmin").addEventListener("change", apply("admin_id"));
        $("auFrom").addEventListener("change", apply("from"));
        $("auTo").addEventListener("change", apply("to"));

        await load();
    });
})();