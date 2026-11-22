(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const ui = AdminUI;
    const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const TABS = [["all", "All"], ["pending", "Pending"], ["verified", "Verified"], ["completed", "Completed"], ["cancelled", "Cancelled"]];

    /* ---------------- Donations section ---------------- */
    function donationsSection(box) {
        const state = { status: "all", search: "", page: 1 };

        box.innerHTML = `
            <div class="grid-4" id="dKpis"></div>
            <div class="tabs" id="dTabs"></div>
            <div class="toolbar">
                <input class="input" id="dSearch" type="search" placeholder="Search donor, receiver or blood bank…">
            </div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>#</th><th>Donor</th><th>Receiver</th><th>Blood bank</th><th>Date</th><th>NID</th><th>Request</th><th>Status</th></tr></thead>
                <tbody id="dBody"></tbody>
            </table></div></div>
            <div class="pager" id="dPager"></div>`;

        const kpis = box.querySelector("#dKpis");
        const tabsEl = box.querySelector("#dTabs");
        const bodyEl = box.querySelector("#dBody");
        const pagerEl = box.querySelector("#dPager");

        const renderKpis = (c) => {
            kpis.innerHTML = `
                <div class="card stat"><div class="ico">💉</div><div><strong>${c.all}</strong><span>Total donations</span></div></div>
                <div class="card stat"><div class="ico">✅</div><div><strong>${c.completed}</strong><span>Completed</span><small class="up">${c.thisMonth} this month</small></div></div>
                <div class="card stat"><div class="ico">⏳</div><div><strong>${c.pending + c.verified}</strong><span>In progress</span><small>${c.pending} pending · ${c.verified} verified</small></div></div>
                <div class="card stat"><div class="ico">🚫</div><div><strong>${c.cancelled}</strong><span>Cancelled</span></div></div>`;
        };

        const renderTabs = (counts) => {
            tabsEl.innerHTML = TABS.map(([key, name]) =>
                `<button class="tab ${state.status === key ? "active" : ""}" data-tab="${key}">${name}<b>${counts[key] ?? 0}</b></button>`
            ).join("");
        };

        const renderRows = (items) => {
            if (!items.length) {
                bodyEl.innerHTML = `<tr><td colspan="8" class="muted-empty">No donations found.</td></tr>`;
                return;
            }
            bodyEl.innerHTML = items.map((d) => `
                <tr>
                    <td>#${esc(d.donation_id)}</td>
                    <td><strong>${esc(d.donor_name)}</strong><br><span class="sub">${esc(d.donor_group)}</span></td>
                    <td>${esc(d.receiver_name)}</td>
                    <td>${esc(d.bloodbank_name)}</td>
                    <td>${esc(d.donation_date)}<br><span class="sub">${esc(d.donation_time)}</span></td>
                    <td><code>${esc(d.nid_masked)}</code> ${d.nid_verified ? "✅" : ""}
                        ${d.verified_latitude ? `<a href="https://www.google.com/maps?q=${esc(d.verified_latitude)},${esc(d.verified_longitude)}" target="_blank" rel="noopener" title="Verified location">📍</a>` : ""}</td>
                    <td>${d.request_id ? `#${esc(d.request_id)}` : "—"}</td>
                    <td>${ui.pill(d.status)}</td>
                </tr>`).join("");
        };

        async function load() {
            bodyEl.innerHTML = `<tr><td colspan="8" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({ status: state.status, search: state.search, page: state.page, limit: 10 });
                const res = await Admin.api(`/donations?${qs}`);
                renderKpis(res.counts);
                renderTabs(res.counts);
                renderRows(res.items);
                ui.pager(pagerEl, res.pagination, (p) => { state.page = p; load(); });
            } catch (err) {
                bodyEl.innerHTML = `<tr><td colspan="8" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        tabsEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-tab]");
            if (!btn) return;
            state.status = btn.dataset.tab;
            state.page = 1;
            load();
        });
        box.querySelector("#dSearch").addEventListener("input", ui.debounce((e) => {
            state.search = e.target.value.trim();
            state.page = 1;
            load();
        }));

        return load();
    }

    /* ---------------- Blood stock section ---------------- */
    function stockSection(box) {
        const state = { search: "", page: 1 };

        box.innerHTML = `
            <div id="sAlerts" class="alerts"></div>
            <div class="group-grid" id="sGroups"></div>
            <div class="card-head"><h3>Stock by blood bank</h3><span id="sNote"></span></div>
            <div class="toolbar">
                <input class="input" id="sSearch" type="search" placeholder="Search blood bank or district…">
            </div>
            <div class="card table-card"><div class="table-wrap"><table class="table stock-table">
                <thead><tr><th>Blood bank</th>${GROUPS.map((g) => `<th>${g}</th>`).join("")}<th>Total</th></tr></thead>
                <tbody id="sBody"></tbody>
            </table></div></div>
            <div class="pager" id="sPager"></div>`;

        const alertsEl = box.querySelector("#sAlerts");
        const groupsEl = box.querySelector("#sGroups");
        const bodyEl = box.querySelector("#sBody");
        const pagerEl = box.querySelector("#sPager");

        const renderNational = (national) => {
            const shortage = national.filter((g) => g.status === "Shortage").map((g) => g.blood_group);
            const low = national.filter((g) => g.status === "Low").map((g) => g.blood_group);

            alertsEl.innerHTML =
                (shortage.length ? `<div class="alert danger">🚨 <span><strong>Shortage:</strong> open demand is higher than total stock for ${esc(shortage.join(", "))}</span></div>` : "") +
                (low.length ? `<div class="alert warn">⚠️ <span><strong>Low stock:</strong> ${esc(low.join(", "))}</span></div>` : "");

            groupsEl.innerHTML = national.map((g) => `
                <div class="group-card ${g.status.toLowerCase()}">
                    <div class="top"><span class="blood-tag">${esc(g.blood_group)}</span>${ui.pill(g.status)}</div>
                    <strong>${g.units}</strong>
                    <small>units in stock · ${g.banks} bank(s)</small>
                    <small>Open demand: ${g.demand} unit(s)</small>
                </div>`).join("");
        };

        const renderBanks = (banks, lowBank) => {
            if (!banks.length) {
                bodyEl.innerHTML = `<tr><td colspan="${GROUPS.length + 2}" class="muted-empty">No approved blood banks found.</td></tr>`;
                return;
            }
            bodyEl.innerHTML = banks.map((b) => `
                <tr>
                    <td><strong>${esc(b.name)}</strong><br><span class="sub">${esc(b.district)}${b.updated ? ` · updated ${ui.fmtDate(b.updated)}` : " · no stock recorded"}</span></td>
                    ${b.units.map((u) => `<td class="stock-cell ${u === 0 ? "zero" : u <= lowBank ? "low" : ""}">${u}</td>`).join("")}
                    <td class="stock-cell">${b.total}</td>
                </tr>`).join("");
        };

        async function load() {
            bodyEl.innerHTML = `<tr><td colspan="${GROUPS.length + 2}" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({ search: state.search, page: state.page, limit: 10 });
                const res = await Admin.api(`/stock?${qs}`);
                renderNational(res.national);
                renderBanks(res.banks, res.thresholds.bank);
                box.querySelector("#sNote").textContent = `Red = ${res.thresholds.bank} units or fewer`;
                ui.pager(pagerEl, res.pagination, (p) => { state.page = p; load(); });
            } catch (err) {
                bodyEl.innerHTML = `<tr><td colspan="${GROUPS.length + 2}" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        box.querySelector("#sSearch").addEventListener("input", ui.debounce((e) => {
            state.search = e.target.value.trim();
            state.page = 1;
            load();
        }));

        return load();
    }
        /* ---------------- Peer donations (blood_exchange) ---------------- */
    function exchangesSection(box) {
        const state = { status: "all", search: "", page: 1 };
        const TABS = [["all", "All"], ["confirmed", "Confirmed"], ["pending", "Pending"], ["rejected", "Rejected"]];
        const canModerate = () => ["Super Admin", "Admin", "Moderator"].includes((Admin.admin() || {}).role_level);

        box.innerHTML = `
            <div class="note-box">Peer donations are donations members record between themselves. They count towards the leaderboard once the other person confirms.</div>
            <div class="grid-4" id="xKpis"></div>
            <div class="tabs" id="xTabs"></div>
            <div class="toolbar"><input class="input" id="xSearch" type="search" placeholder="Search donor or recipient…"></div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>#</th><th>Donor</th><th>Recipient</th><th>Blood</th><th>Donated on</th><th>Recorded</th><th>Status</th><th></th></tr></thead>
                <tbody id="xBody"></tbody>
            </table></div></div>
            <div class="pager" id="xPager"></div>`;

        const kpis = box.querySelector("#xKpis");
        const tabsEl = box.querySelector("#xTabs");
        const bodyEl = box.querySelector("#xBody");
        const pagerEl = box.querySelector("#xPager");
        let items = [];

        const renderKpis = (c) => {
            kpis.innerHTML = `
                <div class="card stat"><div class="ico">🤝</div><div><strong>${c.all}</strong><span>Recorded</span></div></div>
                <div class="card stat"><div class="ico">✅</div><div><strong>${c.confirmed}</strong><span>Confirmed</span><small class="up">${c.thisMonth} this month</small></div></div>
                <div class="card stat"><div class="ico">⏳</div><div><strong>${c.pending}</strong><span>Waiting for confirmation</span></div></div>
                <div class="card stat"><div class="ico">🚫</div><div><strong>${c.rejected}</strong><span>Rejected</span></div></div>`;
        };

        const renderTabs = (counts) => {
            tabsEl.innerHTML = TABS.map(([key, name]) =>
                `<button class="tab ${state.status === key ? "active" : ""}" data-tab="${key}">${name}<b>${counts[key] ?? 0}</b></button>`
            ).join("");
        };

        const renderRows = () => {
            if (!items.length) {
                bodyEl.innerHTML = `<tr><td colspan="8" class="muted-empty">No records found.</td></tr>`;
                return;
            }
            bodyEl.innerHTML = items.map((x, i) => `
                <tr>
                    <td>#${esc(x.exchange_id)}</td>
                    <td><strong>${esc(x.donor_name)}</strong><br><span class="sub">@${esc(x.donor_username)}</span></td>
                    <td><strong>${esc(x.recipient_name)}</strong><br><span class="sub">@${esc(x.recipient_username)}</span></td>
                    <td><span class="blood-tag">${esc(x.blood_group)}</span></td>
                    <td>${esc(x.donated_on)}</td>
                    <td>${ui.fmtDate(x.created_at)}</td>
                    <td>${ui.pill(x.status)}</td>
                    <td class="actions">${canModerate() && x.status !== "Rejected" ? `<button class="btn-sm danger" data-i="${i}">Void</button>` : ""}</td>
                </tr>`).join("");
        };

        async function load() {
            bodyEl.innerHTML = `<tr><td colspan="8" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({ status: state.status, search: state.search, page: state.page, limit: 10 });
                const res = await Admin.api(`/exchanges?${qs}`);
                items = res.items;
                renderKpis(res.counts);
                renderTabs(res.counts);
                renderRows();
                ui.pager(pagerEl, res.pagination, (p) => { state.page = p; load(); });
            } catch (err) {
                bodyEl.innerHTML = `<tr><td colspan="8" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        tabsEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-tab]");
            if (!btn) return;
            state.status = btn.dataset.tab;
            state.page = 1;
            load();
        });
        box.querySelector("#xSearch").addEventListener("input", ui.debounce((e) => {
            state.search = e.target.value.trim();
            state.page = 1;
            load();
        }));
        bodyEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-i]");
            if (!btn) return;
            const x = items[Number(btn.dataset.i)];
            if (!x) return;
            ui.reasonDialog({
                title: "Void donation record",
                message: `Void donation <strong>#${esc(x.exchange_id)}</strong> (${esc(x.donor_name)} → ${esc(x.recipient_name)})? It is marked <strong>Rejected</strong>, any reviews attached to it are removed, it stops counting on the leaderboard, and both members are emailed.`,
                confirmLabel: "Void record", danger: true, askReason: true,
                onConfirm: async (reason) => {
                    const r = await Admin.api(`/exchanges/${x.exchange_id}/reject`, { method: "POST", body: { reason } });
                    Admin.toast(r.emailSent ? r.message : `${r.message} (emails could not be sent)`, "success");
                    load();
                }
            });
        });

        return load();
    }
    /* ---------------- Page ---------------- */
    AdminShell.register("donations", async (el) => {
        el.innerHTML = `
            <div class="page-head"><h1>Donations & Stock</h1><p>Donation records and national blood availability.</p></div>
            <div class="seg" id="dSeg">
                <button data-s="donations" class="active">Donations</button>
                <button data-s="exchanges">Peer donations</button>
                <button data-s="stock">Blood stock</button>
            </div>
            <div id="dSection"></div>`;

        const box = el.querySelector("#dSection");
        const seg = el.querySelector("#dSeg");

            const show = (name) => {
            seg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.s === name));
            if (name === "stock") return stockSection(box);
            if (name === "exchanges") return exchangesSection(box);
            return donationsSection(box);
        };

        seg.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-s]");
            if (btn) show(btn.dataset.s);
        });

        await show("donations");
    });
})();