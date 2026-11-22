(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const ui = AdminUI;
    const TABS = [["pending", "Pending"], ["successful", "Successful"], ["waiting", "Waiting"], ["rejected", "Rejected"], ["other", "Other"], ["all", "All"]];
    const PILL = {
        Submitted: ["open", "Waiting"], Pending: ["pending", "Pending"], Successful: ["completed", "Successful"],
        Declined: ["cancelled", "Declined"], Closed: ["cancelled", "Closed"], Cancelled: ["cancelled", "Cancelled"], Rejected: ["rejected", "Rejected"]
    };

    const pill = (status) => {
        const [cls, label] = PILL[status] || ["pending", status];
        return `<span class="pill s-${cls}">${esc(label)}</span>`;
    };
    const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
    const parties = (c) => (c.applicant_role === "Donor"
        ? { donor: c.applicant_name, receiver: c.owner_name }
        : { donor: c.owner_name, receiver: c.applicant_name });
    const kv = (rows) => `<div style="display:grid;grid-template-columns:150px 1fr;gap:6px 12px;font-size:14px">${rows.map(([k, v]) =>
        `<span style="color:var(--text-secondary)">${esc(k)}</span><span style="word-break:break-word">${v}</span>`).join("")}</div>`;

    AdminShell.register("connections", async (el) => {
        const state = { status: "pending", search: "", page: 1 };
        const canAct = ["Super Admin", "Admin", "Moderator"].includes((Admin.admin() || {}).role_level);

        el.innerHTML = `
            <div class="page-head"><h1>Blood Connections</h1><p>Blood connections that users made through their notes. Pending means the note owner confirmed and the donation is not yet reviewed by both sides.</p></div>
            <div class="grid-4" id="cKpis"></div>
            <div class="tabs" id="cTabs"></div>
            <div class="toolbar"><input class="input" id="cSearch" type="search" placeholder="Search by name, username or mobile…"></div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>#</th><th>Donor → Receiver</th><th>Note</th><th>Requested</th><th>Confirmed</th><th>Reviews</th><th>Status</th><th></th></tr></thead>
                <tbody id="cBody"></tbody>
            </table></div></div>
            <div class="pager" id="cPager"></div>`;

        const q = (s) => el.querySelector(s);
        let items = [];

        const renderKpis = (c) => {
            q("#cKpis").innerHTML = `
                <div class="card stat"><div class="ico">🤝</div><div><strong>${c.pending}</strong><span>Pending connections</span></div></div>
                <div class="card stat"><div class="ico">✅</div><div><strong>${c.successful}</strong><span>Successful</span><small class="up">${c.thisMonth} this month</small></div></div>
                <div class="card stat"><div class="ico">⏳</div><div><strong>${c.waiting}</strong><span>Waiting for owner</span></div></div>
                <div class="card stat"><div class="ico">🚫</div><div><strong>${c.rejected + c.other}</strong><span>Rejected or closed</span><small>${c.rejected} not eligible</small></div></div>`;
        };

        const renderTabs = (counts) => {
            q("#cTabs").innerHTML = TABS.map(([key, name]) =>
                `<button class="tab ${state.status === key ? "active" : ""}" data-tab="${key}">${name}<b>${counts[key === "all" ? "all" : key] ?? 0}</b></button>`).join("");
        };

        const renderRows = () => {
            if (!items.length) {
                q("#cBody").innerHTML = `<tr><td colspan="8" class="muted-empty">No blood connections here.</td></tr>`;
                return;
            }
            q("#cBody").innerHTML = items.map((c, i) => {
                const p = parties(c);
                return `
                <tr>
                    <td>#${esc(c.connection_id)}</td>
                    <td><strong>${esc(p.donor)}</strong> → ${esc(p.receiver)}<br><span class="sub">@${esc(c.applicant_username)} applied to @${esc(c.owner_username)}</span></td>
                    <td>${esc(c.note_type)} ${esc(c.note_blood_group)}</td>
                    <td>${esc(c.requested_on)}</td>
                    <td>${esc(c.confirmed_on || "—")}</td>
                    <td>${esc(c.review_count)}/2</td>
                    <td>${pill(c.status)}</td>
                    <td class="actions"><button class="btn-sm" data-view="${i}">View</button></td>
                </tr>`;
            }).join("");
        };

        async function load() {
            q("#cBody").innerHTML = `<tr><td colspan="8" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({ status: state.status, search: state.search, page: state.page, limit: 10 });
                const res = await Admin.api(`/connections?${qs}`);
                items = res.items;
                renderKpis(res.counts);
                renderTabs(res.counts);
                renderRows();
                ui.pager(q("#cPager"), res.pagination, (p) => { state.page = p; load(); });
            } catch (err) {
                q("#cBody").innerHTML = `<tr><td colspan="8" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        async function view(id) {
            let c;
            try {
                c = (await Admin.api(`/connections/${id}`)).connection;
            } catch (err) {
                Admin.toast(err.message, "error");
                return;
            }

            const a = c.applicant;
            const o = c.owner;
            const donorSide = c.applicant_role === "Donor";
            const t = c.timeline;
            const applicantRows = [
                ["Full name", `${esc(a.full_name)} <span class="sub">@${esc(a.username)}</span>`],
                ["Father's name", esc(a.father_name)], ["Mother's name", esc(a.mother_name)],
                ["Address", esc(a.address)], ["Blood group", esc(a.blood_group)],
                ["Mobile", esc(a.mobile)], ["Email", esc(a.email)], ["NID", `<code>${esc(a.nid)}</code>`],
                ...(donorSide
                    ? [["Last donation", esc(a.last_donation || "Never donated")], ["Previous donations", esc(a.previous_donations)], ["Blood related disease", esc(a.has_blood_disease)]]
                    : [["Reason for blood", esc(a.illness_reason)], ["Received blood before", esc(a.received_before)]])
            ];
            const ownerRows = [
                ["Full name", `${esc(o.full_name)} <span class="sub">@${esc(o.username)}</span>`],
                ["Blood group", esc(o.blood_group)], ["District", esc(o.district)],
                ["Mobile", esc(o.phone)], ["Email", esc(o.email)], ["Account", esc(o.account_status)]
            ];
            const timeline = [
                ["Requested", t.requested], ["Confirmed", t.confirmed], ["Completed", t.completed],
                ["Cancelled", t.cancelled ? `${t.cancelled}${c.cancelled_by ? ` by ${c.cancelled_by}` : ""}` : null]
            ].filter(([, v]) => v);

            const body = `
                <p style="margin:0 0 12px">${pill(c.status)} <strong>${esc(c.note_type)} ${esc(c.note_blood_group)}</strong> note · applicant is the <strong>${esc(c.applicant_role.toLowerCase())}</strong></p>
                ${c.status_reason ? `<p class="modal-text"><b>Reason:</b> ${esc(c.status_reason)}</p>` : ""}
                <h4 style="margin:14px 0 8px">Timeline</h4>${kv(timeline.map(([k, v]) => [k, esc(v)]))}
                <h4 style="margin:16px 0 8px">Applicant (${esc(c.applicant_role.toLowerCase())})</h4>${kv(applicantRows)}
                <h4 style="margin:16px 0 8px">Note owner (${donorSide ? "receiver" : "donor"})</h4>${kv(ownerRows)}
                <h4 style="margin:16px 0 8px">Reviews</h4>
                ${c.reviews.length ? c.reviews.map((r) => `<p style="margin:6px 0"><strong>${esc(r.rater_name)}</strong> rated ${esc(r.rated_name)} <span style="color:#f5b301">${stars(r.stars)}</span>${r.comment ? `<br><span class="sub">${esc(r.comment)}</span>` : ""}</p>`).join("") : `<p class="sub">No reviews yet.</p>`}`;

            const actions = [{ label: "Close" }];
            if (canAct && ["Submitted", "Pending"].includes(c.status)) {
                actions.push({
                    label: "Cancel connection", className: "btn-danger",
                    onClick: ({ close }) => ui.reasonDialog({
                        title: "Cancel this connection?",
                        message: "Both users will be notified. Enter the reason.",
                        confirmLabel: "Cancel connection", danger: true,
                        placeholder: "Why is this connection being cancelled?",
                        onConfirm: async (reason) => {
                            const r = await Admin.api(`/connections/${id}/cancel`, { method: "POST", body: { reason } });
                            Admin.toast(r.message, "success");
                            close();
                            load();
                        }
                    })
                });
            }
            ui.modal({ title: `Blood connection #${c.connection_id}`, body, wide: true, actions });
        }

        q("#cTabs").addEventListener("click", (e) => {
            const b = e.target.closest("[data-tab]");
            if (!b) return;
            state.status = b.dataset.tab;
            state.page = 1;
            load();
        });
        q("#cSearch").addEventListener("input", ui.debounce((e) => { state.search = e.target.value.trim(); state.page = 1; load(); }));
        q("#cBody").addEventListener("click", (e) => {
            const b = e.target.closest("[data-view]");
            if (b) view(items[Number(b.dataset.view)].connection_id);
        });

        await load();
    });
})();