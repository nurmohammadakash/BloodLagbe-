(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const ui = AdminUI;
    const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const TABS = [
        ["pending", "Pending review"], ["approved", "Approved"], ["rejected", "Rejected"],
        ["inactive", "Suspended"], ["unverified", "Unverified"], ["all", "All"]
    ];

    const canManage = () => ["Super Admin", "Admin"].includes((Admin.admin() || {}).role_level);

    const statusLabel = (b) =>
        b.status === "Pending" && !b.email_verified ? "Unverified" : b.status === "Inactive" ? "Suspended" : b.status;

    const ACTIONS = {
        approve: {
            title: "Approve blood bank", verb: "Approve", askReason: false, danger: false,
            text: (b) => `Approve <strong>${esc(b.name)}</strong>? They will be able to sign in, and a confirmation email will be sent.`
        },
        reject: {
            title: "Reject registration", verb: "Reject", askReason: true, danger: true,
            text: (b) => `Reject the registration of <strong>${esc(b.name)}</strong>? The reason will be emailed to them.`
        },
        suspend: {
            title: "Suspend blood bank", verb: "Suspend", askReason: true, danger: true,
            text: (b) => `Suspend <strong>${esc(b.name)}</strong>? They will be blocked from signing in and using the platform.`
        },
        reactivate: {
            title: "Reactivate blood bank", verb: "Reactivate", askReason: false, danger: false,
            text: (b) => `Reactivate <strong>${esc(b.name)}</strong>? They will regain access immediately.`
        }
    };

    function actionsFor(b) {
        if (!canManage()) return [];
        if (b.status === "Pending") return b.email_verified ? ["reject", "approve"] : [];
        if (b.status === "Approved") return ["suspend"];
        if (b.status === "Inactive") return ["reactivate"];
        if (b.status === "Rejected") return ["approve"];
        return [];
    }

    function runAction(bank, action, done) {
        const c = ACTIONS[action];
        ui.reasonDialog({
            title: c.title,
            message: c.text(bank),
            confirmLabel: c.verb,
            danger: c.danger,
            askReason: c.askReason,
            onConfirm: async (reason) => {
                const r = await Admin.api(`/bloodbanks/${bank.bloodbank_id}/status`, {
                    method: "POST",
                    body: { action, reason }
                });
                Admin.toast(r.emailSent ? r.message : `${r.message} (email could not be sent)`, "success");
                done();
            }
        });
    }

    function detailHtml({ bank, inventory, stats }) {
        const stock = {};
        inventory.forEach((i) => { stock[i.blood_group] = i.unit_count; });
        const hasMap = bank.latitude && bank.longitude;

        return `
            <div class="detail-head">
                <span class="avatar-sm" style="width:52px;height:52px;font-size:16px">${esc(ui.initials(bank.name))}</span>
                <div><h2>${esc(bank.name)}</h2>${ui.pill(statusLabel(bank))}</div>
            </div>
            ${bank.status_reason ? `<div class="note-box"><strong>Reason:</strong> ${esc(bank.status_reason)}</div>` : ""}
            <div class="kv-grid">
                <div class="kv"><span>License</span><strong>${esc(bank.license_number)}</strong></div>
                <div class="kv"><span>Username</span><strong>@${esc(bank.username)}</strong></div>
                <div class="kv"><span>Email</span><strong>${esc(bank.email)} ${bank.email_verified ? "✅" : "(not verified)"}</strong></div>
                <div class="kv"><span>Phone</span><strong>${esc(bank.phone)}</strong></div>
                <div class="kv"><span>Location</span><strong>${esc(bank.upazila)}, ${esc(bank.district)}, ${esc(bank.division)}</strong></div>
                <div class="kv"><span>Postal code</span><strong>${esc(bank.postal_code)}</strong></div>
                <div class="kv" style="grid-column:1/-1"><span>Address</span><strong>${esc(bank.address)}</strong>
                    ${hasMap ? `<br><a href="https://www.google.com/maps?q=${esc(bank.latitude)},${esc(bank.longitude)}" target="_blank" rel="noopener" style="color:var(--red);font-size:13px">Open on map ↗</a>` : ""}</div>
                <div class="kv"><span>Registered</span><strong>${ui.fmtDate(bank.created_at)}</strong></div>
                <div class="kv"><span>Last reviewed</span><strong>${bank.reviewed_at ? `${ui.fmtDate(bank.reviewed_at)} by ${esc(bank.reviewed_by_name || "admin")}` : "Not reviewed yet"}</strong></div>
            </div>
            <div class="mini-stats">
                <div><strong>${stats.donations}</strong><span>Completed donations</span></div>
                <div><strong>${stats.requests}</strong><span>Requests handled</span></div>
                <div><strong>${stats.camps}</strong><span>Camps</span></div>
            </div>
            <div class="section-label">Blood stock (units)</div>
            <div class="stock-grid">
                ${GROUPS.map((g) => {
                    const u = stock[g] || 0;
                    return `<div class="stock-chip ${u <= 5 ? "low" : ""}"><b>${g}</b><span>${u}</span></div>`;
                }).join("")}
            </div>`;
    }

    AdminShell.register("bloodbanks", async (el) => {
        const state = { status: "pending", search: "", page: 1 };

        el.innerHTML = `
            <div class="page-head"><h1>Blood Banks</h1><p>Review registrations and manage blood bank accounts.</p></div>
            <div class="tabs" id="bbTabs"></div>
            <div class="toolbar">
                <input class="input" id="bbSearch" type="search" placeholder="Search by name, license, email, phone, district…">
            </div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>Blood bank</th><th>License</th><th>Location</th><th>Contact</th><th>Registered</th><th>Status</th><th></th></tr></thead>
                <tbody id="bbBody"></tbody>
            </table></div></div>
            <div class="pager" id="bbPager"></div>`;

        const tabsEl = el.querySelector("#bbTabs");
        const bodyEl = el.querySelector("#bbBody");
        const pagerEl = el.querySelector("#bbPager");
        let items = [];

        const renderTabs = (counts) => {
            tabsEl.innerHTML = TABS.map(([key, name]) =>
                `<button class="tab ${state.status === key ? "active" : ""}" data-tab="${key}">${name}<b>${counts[key] ?? 0}</b></button>`
            ).join("");
        };

        const emptyText = {
            pending: "No blood banks are waiting for approval. 🎉",
            unverified: "No unverified registrations.",
        };

        const renderRows = () => {
            if (!items.length) {
                bodyEl.innerHTML = `<tr><td colspan="7" class="muted-empty">${emptyText[state.status] || "No blood banks found."}</td></tr>`;
                return;
            }
            bodyEl.innerHTML = items.map((b, idx) => {
                const quick = b.status === "Pending" ? actionsFor(b) : [];
                return `
                <tr>
                    <td><strong>${esc(b.name)}</strong><br><span class="sub">@${esc(b.username)}</span></td>
                    <td>${esc(b.license_number)}</td>
                    <td>${esc(b.district)}<br><span class="sub">${esc(b.division)}</span></td>
                    <td>${esc(b.email)}<br><span class="sub">${esc(b.phone)}</span></td>
                    <td>${ui.fmtDate(b.created_at)}</td>
                    <td>${ui.pill(statusLabel(b))}</td>
                    <td class="actions">
                        <button class="btn-sm" data-act="view" data-i="${idx}">View</button>
                        ${quick.map((a) => `<button class="btn-sm ${a === "approve" ? "success" : "danger"}" data-act="${a}" data-i="${idx}">${ACTIONS[a].verb}</button>`).join("")}
                    </td>
                </tr>`;
            }).join("");
        };

        async function load() {
            bodyEl.innerHTML = `<tr><td colspan="7" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({ status: state.status, search: state.search, page: state.page, limit: 10 });
                const res = await Admin.api(`/bloodbanks?${qs}`);
                items = res.items;
                renderTabs(res.counts);
                renderRows();
                ui.pager(pagerEl, res.pagination, (p) => { state.page = p; load(); });
                AdminShell.setBadge("bloodbanks", res.counts.pending);
            } catch (err) {
                bodyEl.innerHTML = `<tr><td colspan="7" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        async function openDetail(id) {
            const m = ui.modal({ title: "Blood bank details", wide: true, body: `<div class="muted-empty">Loading…</div>` });
            try {
                const data = await Admin.api(`/bloodbanks/${id}`);
                m.bodyEl.innerHTML = detailHtml(data);

                const acts = actionsFor(data.bank).map((a) => ({
                    label: ACTIONS[a].verb,
                    className: ACTIONS[a].danger ? "btn-danger" : "btn-primary",
                    onClick: ({ close }) => { close(); runAction(data.bank, a, load); }
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

        el.querySelector("#bbSearch").addEventListener("input", ui.debounce((e) => {
            state.search = e.target.value.trim();
            state.page = 1;
            load();
        }));

        bodyEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-act]");
            if (!btn) return;
            const bank = items[Number(btn.dataset.i)];
            if (!bank) return;
            if (btn.dataset.act === "view") openDetail(bank.bloodbank_id);
            else runAction(bank, btn.dataset.act, load);
        });

        await load();
    });
})();