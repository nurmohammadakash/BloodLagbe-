(() => {
    if (!window.BankShell) return;

    const esc = Bank.escape;
    const ui = BankUI;

    const TABS = [
        ["pending", "Pending"], ["approved", "Approved"], ["reserved", "Reserved"],
        ["issued", "Issued"], ["closed", "Closed"], ["all", "All"]
    ];

    const css = document.createElement("style");
    css.textContent = `
        .rq-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
        .rq-filters input,.rq-filters select{height:40px;border-radius:10px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);padding:0 12px;font:inherit;outline:0}
        .rq-filters input{flex:1;min-width:200px}
        .rq-filters input:focus,.rq-filters select:focus{border-color:var(--red)}
        .rq-card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:14px}
        .rq-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start}
        .rq-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .rq-title h3{margin:0;font-size:17px}
        .rq-pills{display:flex;gap:6px;flex-wrap:wrap}
        .rq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px 22px;margin:14px 0}
        .rq-grid small{display:block;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-muted);margin-bottom:2px}
        .rq-grid div{font-size:14px}
        .rq-stock{font-size:13px;padding:9px 12px;border-radius:10px;background:var(--bg-secondary);border:1px solid var(--border);margin-bottom:12px}
        .rq-stock.ok{border-color:rgba(34,197,94,.4)}
        .rq-stock.short{border-color:rgba(245,158,11,.5)}
        .rq-note{font-size:13px;color:var(--text-secondary);margin-bottom:12px}
        .rq-actions{display:flex;gap:8px;flex-wrap:wrap}
        .rq-actions .btn{padding:9px 16px}
        .rq-late{color:var(--red-bright);font-weight:700}
        .pill.s-reserved{background:rgba(168,85,247,.15);color:#a855f7}
    `;
    document.head.appendChild(css);

    const LABEL = (r) => {
        if (r.status === "Accepted") return r.reserved_units > 0 ? "Reserved" : "Approved";
        if (r.status === "Completed") return "Issued";
        return r.status;
    };
    const STATUS_CLASS = { Pending: "s-pending", Approved: "s-accepted", Reserved: "s-reserved", Issued: "s-completed", Rejected: "s-rejected", Cancelled: "s-cancelled", Expired: "s-expired" };
    const statusPill = (r) => { const l = LABEL(r); return `<span class="pill ${STATUS_CLASS[l] || ""}">${esc(l)}</span>`; };
    const urgencyPill = (u) => `<span class="pill ${esc(String(u).toLowerCase())}">${esc(u)}</span>`;
    const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

    BankShell.register("requests", async (el) => {
        const state = { tab: "pending", urgency: "", search: "", page: 1 };
        let items = [];
        let counts = {};

        el.innerHTML = `
            <div class="page-head"><h1>Blood Requests</h1><p>Requests sent to your blood bank. Approve a request, reserve stock for it, then issue the blood when it is collected.</p></div>
            <div class="tabs" id="rqTabs"></div>
            <div class="rq-filters">
                <input id="rqSearch" placeholder="Search patient, hospital, contact or requester" autocomplete="off">
                <select id="rqUrgency"><option value="">All urgency</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
            </div>
            <div id="rqList"></div>
            <div class="pager" id="rqPager"></div>`;

        const q = (s) => el.querySelector(s);
        const listEl = q("#rqList");

        const renderTabs = () => {
            q("#rqTabs").innerHTML = TABS.map(([key, label]) =>
                `<button class="tab ${state.tab === key ? "active" : ""}" data-tab="${key}">${label}<b>${counts[key] ?? 0}</b></button>`).join("");
        };

        const actionsFor = (r, i) => {
            if (r.status === "Pending") {
                return `<button class="btn btn-primary" data-act="approve" data-i="${i}">Approve</button>
                        <button class="btn btn-ghost" data-act="reject" data-i="${i}">Reject</button>`;
            }
            if (r.status === "Accepted" && r.reserved_units === 0) {
                return `<button class="btn btn-primary" data-act="reserve" data-i="${i}">Reserve stock</button>
                        <button class="btn btn-ghost" data-act="issue" data-i="${i}">Issue now</button>
                        <button class="btn btn-ghost" data-act="reject" data-i="${i}">Reject</button>`;
            }
            if (r.status === "Accepted") {
                return `<button class="btn btn-primary" data-act="issue" data-i="${i}">Issue blood</button>
                        <button class="btn btn-ghost" data-act="release" data-i="${i}">Release reservation</button>
                        <button class="btn btn-ghost" data-act="reject" data-i="${i}">Reject</button>`;
            }
            return "";
        };

        const stockLine = (r) => {
            if (!["Pending", "Accepted"].includes(r.status)) return "";
            if (r.reserved_units > 0) {
                return `<div class="rq-stock ok">🔒 ${esc(plural(r.reserved_units, "unit"))} of ${esc(r.blood_group)} reserved for this request.</div>`;
            }
            const enough = r.in_stock >= r.units_required;
            return `<div class="rq-stock ${enough ? "ok" : "short"}">In stock: <strong>${esc(r.in_stock)}</strong> × ${esc(r.blood_group)} · needs ${esc(r.units_required)}${enough ? "" : " — not enough to fulfil this request yet"}</div>`;
        };

        const card = (r, i) => `
            <article class="rq-card">
                <div class="rq-head">
                    <div class="rq-title">
                        <span class="blood-tag">${esc(r.blood_group)}</span>
                        <h3>${esc(plural(r.units_required, "unit"))} · ${esc(r.patient_name)}${r.patient_age !== null && r.patient_age !== undefined ? `, ${esc(r.patient_age)}` : ""}</h3>
                    </div>
                    <div class="rq-pills">${urgencyPill(r.urgency_level)}${statusPill(r)}</div>
                </div>
                <div class="rq-grid">
                    <div><small>Hospital</small>${esc(r.hospital_name)}<br><span class="sub">${esc(r.hospital_address)}</span></div>
                    <div><small>Needed by</small>${esc(r.needed_by)}${r.overdue ? ` <span class="rq-late">· overdue</span>` : ""}</div>
                    <div><small>Contact</small>${esc(r.contact_person)}<br><a href="tel:${esc(r.contact_number)}">${esc(r.contact_number)}</a></div>
                    <div><small>Requested by</small>${esc(r.requester_name)} <span class="sub">@${esc(r.requester_username)}</span><br><span class="sub">#${esc(r.request_id)} · ${esc(new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }))}</span></div>
                </div>
                ${r.note ? `<div class="rq-note"><strong>Note:</strong> ${esc(r.note)}</div>` : ""}
                ${r.bank_note ? `<div class="rq-note"><strong>Your message:</strong> ${esc(r.bank_note)}</div>` : ""}
                ${r.status_reason && !["Pending", "Accepted"].includes(r.status) ? `<div class="rq-note"><strong>Reason:</strong> ${esc(r.status_reason)}</div>` : ""}
                ${stockLine(r)}
                <div class="rq-actions">${actionsFor(r, i)}</div>
            </article>`;

        async function load() {
            try {
                const qs = new URLSearchParams({ tab: state.tab, page: state.page });
                if (state.urgency) qs.set("urgency", state.urgency);
                if (state.search) qs.set("search", state.search);
                const res = await Bank.api(`/requests?${qs}`);
                items = res.items;
                counts = res.counts;
                BankShell.setBadge("requests", counts.pending || 0);
                renderTabs();
                listEl.innerHTML = items.length
                    ? items.map(card).join("")
                    : `<div class="card empty"><h3>No ${state.tab === "all" ? "" : esc(state.tab) + " "}requests</h3><p>${state.tab === "pending" ? "New requests from users will appear here." : "Nothing to show here."}</p></div>`;
                ui.pager(q("#rqPager"), res.pagination, (p) => { state.page = p; load(); });
            } catch (err) {
                listEl.innerHTML = `<div class="card empty"><h3>Could not load requests</h3><p>${esc(err.message)}</p></div>`;
            }
        }

        const summary = (r) => `<strong>${esc(plural(r.units_required, "unit"))} of ${esc(r.blood_group)}</strong> for ${esc(r.patient_name)} at ${esc(r.hospital_name)}`;

        const confirm = ({ title, message, label, path, danger = false }) =>
            ui.reasonDialog({
                title, message, confirmLabel: label, danger, askReason: false,
                onConfirm: async () => {
                    const r = await Bank.api(path, { method: "POST" });
                    Bank.toast(r.message, "success");
                    load();
                }
            });

        const act = {
            approve(r) {
                const m = ui.modal({
                    title: "Approve this request?",
                    body: `<p class="modal-text">${summary(r)}.<br>The requester will be notified. You can reserve stock next.</p>
                           <div class="field"><label for="rqNote">Message to the requester (optional)</label>
                           <input id="rqNote" maxlength="255" placeholder="e.g. Please bring a donor card and the hospital slip"></div>
                           <div class="form-msg error" id="rqErr"></div>`,
                    actions: [
                        { label: "Cancel" },
                        {
                            label: "Approve", className: "btn-primary",
                            onClick: async ({ close, button }) => {
                                button.disabled = true;
                                try {
                                    const res = await Bank.api(`/requests/${r.request_id}/approve`, { method: "POST", body: { note: m.overlay.querySelector("#rqNote").value } });
                                    Bank.toast(res.message, "success");
                                    close();
                                    load();
                                } catch (err) {
                                    m.overlay.querySelector("#rqErr").textContent = err.message;
                                    button.disabled = false;
                                }
                            }
                        }
                    ]
                });
            },
            reserve: (r) => confirm({
                title: "Reserve stock?", label: "Reserve",
                message: `${summary(r)}.<br>${esc(plural(r.units_required, "unit"))} will be set aside (oldest batch first) and removed from the stock other people see.`,
                path: `/requests/${r.request_id}/reserve`
            }),
            release: (r) => confirm({
                title: "Release the reservation?", label: "Release",
                message: `${summary(r)}.<br>The reserved units go back into stock. The request stays approved.`,
                path: `/requests/${r.request_id}/release`
            }),
            issue: (r) => confirm({
                title: "Issue this blood?", label: "Issue blood",
                message: `${summary(r)}.<br>${r.reserved_units > 0 ? "The reserved units" : "Units from the oldest batch"} will be handed over and the request marked as issued. This cannot be undone.`,
                path: `/requests/${r.request_id}/issue`
            }),
            reject: (r) => ui.reasonDialog({
                title: "Reject this request?", confirmLabel: "Reject", danger: true,
                message: `${summary(r)}.${r.reserved_units > 0 ? "<br>Reserved units will go back into stock." : ""}`,
                placeholder: "Tell the requester why (e.g. this blood group is out of stock)",
                onConfirm: async (reason) => {
                    const res = await Bank.api(`/requests/${r.request_id}/reject`, { method: "POST", body: { reason } });
                    Bank.toast(res.message, "success");
                    load();
                }
            })
        };

        q("#rqTabs").addEventListener("click", (e) => {
            const b = e.target.closest("[data-tab]");
            if (!b) return;
            state.tab = b.dataset.tab;
            state.page = 1;
            load();
        });
        q("#rqUrgency").addEventListener("change", (e) => { state.urgency = e.target.value; state.page = 1; load(); });
        q("#rqSearch").addEventListener("input", ui.debounce((e) => { state.search = e.target.value.trim(); state.page = 1; load(); }));
        listEl.addEventListener("click", (e) => {
            const b = e.target.closest("[data-act]");
            if (!b) return;
            const r = items[Number(b.dataset.i)];
            if (r && act[b.dataset.act]) act[b.dataset.act](r);
        });

        await load();

        // Refresh quietly while this page is open and no dialog is showing
        const timer = setInterval(() => {
            if (!document.body.contains(listEl)) { clearInterval(timer); return; }
            if (!document.querySelector(".modal-overlay")) load();
        }, 45000);
    });
})();