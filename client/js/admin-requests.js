(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const ui = AdminUI;
    const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const TABS = [
        ["open", "Open"], ["pending", "Pending"], ["accepted", "Accepted"],
        ["completed", "Completed"], ["cancelled", "Cancelled"], ["expired", "Expired"], ["all", "All"]
    ];

    const canManage = () => ["Super Admin", "Admin", "Moderator"].includes((Admin.admin() || {}).role_level);
    const isOpen = (s) => s === "Pending" || s === "Accepted";
    const urgencyPill = (u) => `<span class="pill ${esc(String(u).toLowerCase())}">${esc(u)}</span>`;

    function cancelRequest(r, done) {
        ui.reasonDialog({
            title: "Cancel blood request",
            message: `Cancel the <strong>${esc(r.blood_group)}</strong> request for <strong>${esc(r.patient_name)}</strong>? The requester will be notified by email.`,
            confirmLabel: "Cancel request",
            danger: true,
            askReason: true,
            onConfirm: async (reason) => {
                const res = await Admin.api(`/requests/${r.request_id}/cancel`, { method: "POST", body: { reason } });
                Admin.toast(res.emailSent ? res.message : `${res.message} (email could not be sent)`, "success");
                done();
            }
        });
    }

    function expireOverdue(count, done) {
        ui.reasonDialog({
            title: "Expire overdue requests",
            message: `Mark all <strong>${count}</strong> overdue open request(s) as <strong>Expired</strong>? Requests with an active donation are skipped.`,
            confirmLabel: "Expire overdue",
            danger: true,
            askReason: false,
            onConfirm: async () => {
                const res = await Admin.api("/requests/expire-overdue", { method: "POST" });
                Admin.toast(res.message, "success");
                done();
            }
        });
    }

    function detailHtml({ request: r, requester, history, donation }) {
        return `
            <div class="detail-head">
                <span class="blood-tag" style="font-size:20px;padding:10px 14px">${esc(r.blood_group)}</span>
                <div><h2>${esc(r.patient_name)}</h2>${urgencyPill(r.urgency_level)} ${ui.pill(r.status)}</div>
            </div>
            ${r.status_reason ? `<div class="note-box"><strong>Reason:</strong> ${esc(r.status_reason)}</div>` : ""}
            <div class="kv-grid">
                <div class="kv"><span>Units required</span><strong>${esc(r.units_required)}</strong></div>
                <div class="kv"><span>Needed by</span><strong>${esc(r.needed_by)} ${r.overdue ? '<span class="overdue">OVERDUE</span>' : ""}</strong></div>
                <div class="kv"><span>Patient age</span><strong>${esc(r.patient_age ?? "—")}</strong></div>
                <div class="kv"><span>Assigned blood bank</span><strong>${r.bloodbank_name ? `${esc(r.bloodbank_name)} (${esc(r.bloodbank_district)})` : "Not assigned"}</strong></div>
                <div class="kv"><span>Hospital</span><strong>${esc(r.hospital_name)}</strong></div>
                <div class="kv"><span>Contact</span><strong>${esc(r.contact_person)} · ${esc(r.contact_number)}</strong></div>
                <div class="kv" style="grid-column:1/-1"><span>Hospital address</span><strong>${esc(r.hospital_address)}</strong></div>
                ${r.note ? `<div class="kv" style="grid-column:1/-1"><span>Note</span><strong>${esc(r.note)}</strong></div>` : ""}
                <div class="kv"><span>Created</span><strong>${ui.fmtDate(r.created_at)}</strong></div>
                <div class="kv"><span>Last updated</span><strong>${ui.fmtDate(r.updated_at)}</strong></div>
            </div>

            <div class="section-label">Requester</div>
            <div class="kv-grid">
                <div class="kv"><span>Name</span><strong>${esc(requester.full_name)} <span class="sub">@${esc(requester.username)}</span></strong></div>
                <div class="kv"><span>Account</span><strong>${ui.pill(requester.account_status)}</strong></div>
                <div class="kv"><span>Email</span><strong>${esc(requester.email)}</strong></div>
                <div class="kv"><span>Phone</span><strong>${esc(requester.phone)}</strong></div>
                <div class="kv" style="grid-column:1/-1"><span>Request history</span>
                    <strong>${history.total} total · ${history.cancelled} cancelled · ${history.expired} expired</strong></div>
            </div>

            ${donation ? `
                <div class="section-label">Linked donation</div>
                <div class="kv-grid">
                    <div class="kv"><span>Donation</span><strong>#${esc(donation.donation_id)} ${ui.pill(donation.status)}</strong></div>
                    <div class="kv"><span>Donor</span><strong>${esc(donation.donor_name)}</strong></div>
                </div>` : ""}`;
    }

    AdminShell.register("requests", async (el) => {
        const state = { status: "open", search: "", urgency: "", blood_group: "", page: 1 };

        el.innerHTML = `
            <div class="page-head row">
                <div><h1>Blood Requests</h1><p>Monitor every request on the platform and step in when needed.</p></div>
                <div class="head-actions" id="reqHeadActions"></div>
            </div>
            <div class="tabs" id="rTabs"></div>
            <div class="toolbar">
                <input class="input" id="rSearch" type="search" placeholder="Search patient, hospital, contact, requester…">
                <select class="select" id="rUrgency">
                    <option value="">All urgency</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                </select>
                <select class="select" id="rGroup">
                    <option value="">All blood groups</option>${GROUPS.map((g) => `<option>${g}</option>`).join("")}
                </select>
            </div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>Blood</th><th>Patient</th><th>Hospital</th><th>Units</th><th>Urgency</th><th>Needed by</th><th>Requester</th><th>Status</th><th></th></tr></thead>
                <tbody id="rBody"></tbody>
            </table></div></div>
            <div class="pager" id="rPager"></div>`;

        const tabsEl = el.querySelector("#rTabs");
        const bodyEl = el.querySelector("#rBody");
        const pagerEl = el.querySelector("#rPager");
        const headActions = el.querySelector("#reqHeadActions");
        let items = [];

        const renderTabs = (counts) => {
            tabsEl.innerHTML = TABS.map(([key, name]) =>
                `<button class="tab ${state.status === key ? "active" : ""}" data-tab="${key}">${name}<b>${counts[key] ?? 0}</b></button>`
            ).join("");
        };

        const renderHead = (counts) => {
            headActions.innerHTML = canManage() && counts.overdue > 0
                ? `<button class="btn-ghost" id="expireBtn">⏰ Expire ${counts.overdue} overdue</button>`
                : "";
            const btn = headActions.querySelector("#expireBtn");
            if (btn) btn.addEventListener("click", () => expireOverdue(counts.overdue, load));
        };

        const renderRows = () => {
            if (!items.length) {
                bodyEl.innerHTML = `<tr><td colspan="9" class="muted-empty">No requests found.</td></tr>`;
                return;
            }
            bodyEl.innerHTML = items.map((r, idx) => `
                <tr>
                    <td><span class="blood-tag">${esc(r.blood_group)}</span></td>
                    <td><strong>${esc(r.patient_name)}</strong><br><span class="sub">${r.patient_age ? `${esc(r.patient_age)} yrs` : "Age n/a"}</span></td>
                    <td>${esc(r.hospital_name)}</td>
                    <td>${esc(r.units_required)}</td>
                    <td>${urgencyPill(r.urgency_level)}</td>
                    <td>${esc(r.needed_by)}${r.overdue ? '<br><span class="overdue">Overdue</span>' : ""}</td>
                    <td>${esc(r.requester_name)}<br><span class="sub">@${esc(r.requester_username)}</span></td>
                    <td>${ui.pill(r.status)}</td>
                    <td class="actions">
                        <button class="btn-sm" data-act="view" data-i="${idx}">View</button>
                        ${canManage() && isOpen(r.status) ? `<button class="btn-sm danger" data-act="cancel" data-i="${idx}">Cancel</button>` : ""}
                    </td>
                </tr>`).join("");
        };

        async function load() {
            bodyEl.innerHTML = `<tr><td colspan="9" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({
                    status: state.status, search: state.search, urgency: state.urgency,
                    blood_group: state.blood_group, page: state.page, limit: 10
                });
                const res = await Admin.api(`/requests?${qs}`);
                items = res.items;
                renderTabs(res.counts);
                renderHead(res.counts);
                renderRows();
                ui.pager(pagerEl, res.pagination, (p) => { state.page = p; load(); });
                AdminShell.setBadge("requests", res.counts.critical);
            } catch (err) {
                bodyEl.innerHTML = `<tr><td colspan="9" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        async function openDetail(id) {
            const m = ui.modal({ title: "Request details", wide: true, body: `<div class="muted-empty">Loading…</div>` });
            try {
                const data = await Admin.api(`/requests/${id}`);
                m.bodyEl.innerHTML = detailHtml(data);

                const acts = [];
                if (canManage() && isOpen(data.request.status)) {
                    acts.push({
                        label: "Cancel request",
                        className: "btn-danger",
                        onClick: ({ close }) => { close(); cancelRequest(data.request, load); }
                    });
                }
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

        el.querySelector("#rSearch").addEventListener("input", ui.debounce((e) => {
            state.search = e.target.value.trim();
            state.page = 1;
            load();
        }));
        el.querySelector("#rUrgency").addEventListener("change", (e) => { state.urgency = e.target.value; state.page = 1; load(); });
        el.querySelector("#rGroup").addEventListener("change", (e) => { state.blood_group = e.target.value; state.page = 1; load(); });

        bodyEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-act]");
            if (!btn) return;
            const r = items[Number(btn.dataset.i)];
            if (!r) return;
            if (btn.dataset.act === "view") openDetail(r.request_id);
            else cancelRequest(r, load);
        });

        await load();
    });
})();