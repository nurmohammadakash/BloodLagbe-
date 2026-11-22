(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const ui = AdminUI;
    const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const TABS = [["all", "All"], ["active", "Active"], ["pending", "Pending"], ["suspended", "Suspended"], ["blocked", "Blocked"]];

    const canManage = () => ["Super Admin", "Admin", "Moderator"].includes((Admin.admin() || {}).role_level);

    const ACTIONS = {
        suspend: {
            status: "Suspended", title: "Suspend user", verb: "Suspend", askReason: true, danger: true,
            text: (u) => `Suspend <strong>${esc(u.full_name)}</strong>? They will be unable to sign in or use the platform until reactivated.`
        },
        block: {
            status: "Blocked", title: "Block user", verb: "Block", askReason: true, danger: true,
            text: (u) => `Block <strong>${esc(u.full_name)}</strong>? Use this for serious violations.`
        },
        activate: {
            status: "Active", title: "Activate user", verb: "Activate", askReason: false, danger: false,
            text: (u) => `Activate <strong>${esc(u.full_name)}</strong>? They will regain access immediately.`
        }
    };

    function actionsFor(u) {
        if (!canManage()) return [];
        if (u.account_status === "Active") return ["suspend", "block"];
        if (u.account_status === "Suspended") return ["activate", "block"];
        if (u.account_status === "Blocked") return ["activate"];
        return [];   // Pending = email not verified yet
    }

    function runAction(user, action, done) {
        const c = ACTIONS[action];
        ui.reasonDialog({
            title: c.title,
            message: c.text(user),
            confirmLabel: c.verb,
            danger: c.danger,
            askReason: c.askReason,
            onConfirm: async (reason) => {
                const r = await Admin.api(`/users/${user.user_id}/status`, {
                    method: "POST",
                    body: { status: c.status, reason }
                });
                Admin.toast(r.emailSent ? r.message : `${r.message} (email could not be sent)`, "success");
                done();
            }
        });
    }

    function detailHtml({ user, stats }) {
        return `
            <div class="detail-head">
                <span class="avatar-sm" style="width:52px;height:52px;font-size:16px">${esc(ui.initials(user.full_name))}</span>
                <div><h2>${esc(user.full_name)}</h2>${ui.pill(user.account_status)}</div>
            </div>
            ${user.status_reason ? `<div class="note-box"><strong>Reason:</strong> ${esc(user.status_reason)}</div>` : ""}
            ${user.account_status === "Pending" ? `<div class="note-box">This user has not verified their email yet.</div>` : ""}
            <div class="mini-stats">
                <div><strong>${stats.donations}</strong><span>Donations</span></div>
                <div><strong>${stats.requests}</strong><span>Requests made</span></div>
                <div><strong>${stats.posts}</strong><span>Posts</span></div>
            </div>
            <div class="kv-grid">
                <div class="kv"><span>Username</span><strong>@${esc(user.username)}</strong></div>
                <div class="kv"><span>Blood group</span><strong>${esc(user.blood_group)}</strong></div>
                <div class="kv"><span>Email</span><strong>${esc(user.email)} ${user.email_verified ? "✅" : ""}</strong></div>
                <div class="kv"><span>Phone</span><strong>${esc(user.phone)}</strong></div>
                <div class="kv"><span>Role</span><strong>${esc(user.role)}</strong></div>
                <div class="kv"><span>Gender / Date of birth</span><strong>${esc(user.gender)} · ${esc(user.dob || "—")}</strong></div>
                <div class="kv"><span>Donor eligibility</span><strong>${esc(user.eligibility_status)}${user.next_eligible ? ` (next: ${esc(user.next_eligible)})` : ""}</strong></div>
                <div class="kv"><span>Trust score</span><strong>${esc(user.trust_score)}</strong></div>
                <div class="kv" style="grid-column:1/-1"><span>Address</span><strong>${esc(user.address || "—")}</strong><br>
                    <span class="sub">${esc(user.upazila)}, ${esc(user.district)}, ${esc(user.division)} ${esc(user.postal_code)}</span></div>
                <div class="kv"><span>Joined</span><strong>${ui.fmtDate(user.created_at)}</strong></div>
                <div class="kv"><span>Last login</span><strong>${user.last_login ? ui.fmtDate(user.last_login) : "Never"}</strong></div>
            </div>`;
    }

    AdminShell.register("users", async (el) => {
        const state = { status: "all", search: "", role: "", blood_group: "", page: 1 };

        el.innerHTML = `
            <div class="page-head"><h1>Users</h1><p>Search, review and manage donor and recipient accounts.</p></div>
            <div class="tabs" id="uTabs"></div>
            <div class="toolbar">
                <input class="input" id="uSearch" type="search" placeholder="Search by name, username, email, phone, district…">
                <select class="select" id="uRole">
                    <option value="">All roles</option><option>Donor</option><option>Recipient</option><option>Both</option>
                </select>
                <select class="select" id="uGroup">
                    <option value="">All blood groups</option>${GROUPS.map((g) => `<option>${g}</option>`).join("")}
                </select>
            </div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>User</th><th>Blood</th><th>Role</th><th>Location</th><th>Contact</th><th>Joined</th><th>Last login</th><th>Status</th><th></th></tr></thead>
                <tbody id="uBody"></tbody>
            </table></div></div>
            <div class="pager" id="uPager"></div>`;

        const tabsEl = el.querySelector("#uTabs");
        const bodyEl = el.querySelector("#uBody");
        const pagerEl = el.querySelector("#uPager");
        let items = [];

        const renderTabs = (counts) => {
            tabsEl.innerHTML = TABS.map(([key, name]) =>
                `<button class="tab ${state.status === key ? "active" : ""}" data-tab="${key}">${name}<b>${counts[key] ?? 0}</b></button>`
            ).join("");
        };

        const renderRows = () => {
            if (!items.length) {
                bodyEl.innerHTML = `<tr><td colspan="9" class="muted-empty">No users found.</td></tr>`;
                return;
            }
            bodyEl.innerHTML = items.map((u, idx) => `
                <tr>
                    <td><div class="user-cell"><span class="avatar-sm">${esc(ui.initials(u.full_name))}</span>
                        <div><strong>${esc(u.full_name)}</strong><br><span class="sub">@${esc(u.username)}</span></div></div></td>
                    <td><span class="blood-tag">${esc(u.blood_group)}</span></td>
                    <td>${esc(u.role)}</td>
                    <td>${esc(u.district)}<br><span class="sub">${esc(u.division)}</span></td>
                    <td>${esc(u.email)}<br><span class="sub">${esc(u.phone)}</span></td>
                    <td>${ui.fmtDate(u.created_at)}</td>
                    <td>${u.last_login ? ui.fmtDate(u.last_login) : "Never"}</td>
                    <td>${ui.pill(u.account_status)}</td>
                    <td class="actions"><button class="btn-sm" data-i="${idx}">View</button></td>
                </tr>`).join("");
        };

        async function load() {
            bodyEl.innerHTML = `<tr><td colspan="9" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({
                    status: state.status, search: state.search, role: state.role,
                    blood_group: state.blood_group, page: state.page, limit: 10
                });
                const res = await Admin.api(`/users?${qs}`);
                items = res.items;
                renderTabs(res.counts);
                renderRows();
                ui.pager(pagerEl, res.pagination, (p) => { state.page = p; load(); });
            } catch (err) {
                bodyEl.innerHTML = `<tr><td colspan="9" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        async function openDetail(id) {
            const m = ui.modal({ title: "User details", wide: true, body: `<div class="muted-empty">Loading…</div>` });
            try {
                const data = await Admin.api(`/users/${id}`);
                m.bodyEl.innerHTML = detailHtml(data);

                const acts = actionsFor(data.user).map((a) => ({
                    label: ACTIONS[a].verb,
                    className: ACTIONS[a].danger ? "btn-danger" : "btn-primary",
                    onClick: ({ close }) => { close(); runAction(data.user, a, load); }
                }));
                m.setActions([{ label: "Close" }, ...acts]);
            } catch (err) {
                m.bodyEl.innerHTML = `<div class="muted-empty">${esc(err.message)}</div>`;
            }
        }

        tabsEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-tab]");
            if (!btn) return;
            state.status = btn.dataset.tab;
            state.page = 1;
            load();
        });

        el.querySelector("#uSearch").addEventListener("input", ui.debounce((e) => {
            state.search = e.target.value.trim();
            state.page = 1;
            load();
        }));
        el.querySelector("#uRole").addEventListener("change", (e) => { state.role = e.target.value; state.page = 1; load(); });
        el.querySelector("#uGroup").addEventListener("change", (e) => { state.blood_group = e.target.value; state.page = 1; load(); });

        bodyEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-i]");
            if (!btn) return;
            const u = items[Number(btn.dataset.i)];
            if (u) openDetail(u.user_id);
        });

        await load();
    });
})();