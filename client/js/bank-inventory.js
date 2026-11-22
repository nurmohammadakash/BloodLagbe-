(() => {
    if (!window.BankShell) return;

    const esc = Bank.escape;
    const ui = BankUI;
    const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const SOURCES = ["Donation", "Camp", "Transfer", "Other"];
    const TABS = ["Available", "Expired", "Depleted", "Discarded", "Activity"];
    const STATUS_PILL = { Available: "confirmed", Depleted: "completed", Expired: "expired", Discarded: "cancelled" };
    const ACTION_PILL = { Received: "confirmed", Issued: "completed", Expired: "expired", Discarded: "cancelled", Adjusted: "pending" };

    if (!document.getElementById("bank-fe-css")) {
        const css = document.createElement("style");
        css.id = "bank-fe-css";
        css.textContent = `
            .fe{display:block;color:var(--red);font-size:12px;margin-top:4px}
            .fe:empty{display:none}
            .hint{display:block;color:var(--text-secondary);font-size:12px;margin-top:4px}
        `;
        document.head.appendChild(css);
    }
    const inv = document.createElement("style");
    inv.textContent = `
        .stock-card.pick{cursor:pointer}
        .stock-card.sel{outline:2px solid var(--red)}
        .stock-card .meta{font-size:11px;color:var(--text-secondary);margin-top:4px}
        .days-chip{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:12px;font-size:11px;font-weight:700;background:var(--bg-secondary);color:var(--text-secondary)}
        .days-chip.warn{background:rgba(245,158,11,.16);color:var(--amber)}
        .days-chip.bad{background:rgba(220,38,38,.14);color:var(--red)}
        .chg-pos{color:var(--green);font-weight:700}
        .chg-neg{color:var(--red);font-weight:700}
    `;
    document.head.appendChild(inv);

    const pad = (n) => String(n).padStart(2, "0");
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const todayStr = () => ymd(new Date());
    const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
    const pill = (map, key) => `<span class="pill s-${map[key] || "pending"}">${esc(key)}</span>`;
    const field = (label, id, control, err, hint = "") => `
        <div class="field"><label for="${id}">${label}</label>${control}${hint ? `<small class="hint">${hint}</small>` : ""}<small class="fe" data-err="${err}"></small></div>`;

    BankShell.register("inventory", async (el) => {
        const state = { tab: "Available", group: "", page: 1 };
        let summary = null;
        let counts = { Available: 0, Expired: 0, Depleted: 0, Discarded: 0 };
        let items = [];

        el.innerHTML = `
            <div class="page-head"><h1>Inventory</h1><p>Blood is tracked in batches with expiry dates. Issuing always uses the batch that expires first.</p></div>
            <div class="toolbar">
                <button class="btn btn-primary" id="invAdd">+ Add batch</button>
                <button class="btn btn-ghost" id="invIssue">Issue units</button>
            </div>
            <div id="invNotice"></div>
            <div class="card"><div class="card-head"><h3>Stock by group</h3><span class="sub" id="invTotal"></span></div><div class="stock-grid" id="invGrid"></div></div>
            <div class="tabs" id="invTabs" style="margin-top:16px"></div>
            <div class="card table-card"><div class="table-wrap"><table class="table"><thead id="invHead"></thead><tbody id="invBody"></tbody></table></div></div>
            <div class="pager" id="invPager"></div>`;

        const q = (s) => el.querySelector(s);

        const renderSummary = () => {
            q("#invTotal").textContent = `${summary.totalUnits} usable unit${summary.totalUnits === 1 ? "" : "s"}`;
            q("#invNotice").innerHTML = summary.untrackedUnits
                ? `<div class="info-banner"><strong>${esc(summary.untrackedUnits)} unit${summary.untrackedUnits === 1 ? "" : "s"}</strong> in your stock are counted but not tracked in batches yet, so they have no expiry date. Ask your admin or developer to run the opening balance script, or add them as batches.</div>`
                : "";
            const maxUnits = Math.max(20, ...summary.groups.map((g) => g.units));
            q("#invGrid").innerHTML = summary.groups.map((g) => `
                <div class="stock-card pick ${esc(g.level)} ${state.group === g.blood_group ? "sel" : ""}" data-group="${esc(g.blood_group)}">
                    <div class="grp">${esc(g.blood_group)}</div>
                    <div class="units">${esc(g.units)}</div>
                    <div class="bar"><i style="width:${Math.min(100, Math.round((g.units / maxUnits) * 100))}%"></i></div>
                    <div class="lvl">${esc(g.level === "Good" ? "Healthy" : g.level)}</div>
                    <div class="meta">${g.batches ? `${esc(g.batches)} batch${g.batches === 1 ? "" : "es"} · next expiry ${esc(g.next_expiry)}` : "No batches"}</div>
                </div>`).join("");
        };

        const renderTabs = () => {
            q("#invTabs").innerHTML = TABS.map((t) =>
                `<button class="tab ${state.tab === t ? "active" : ""}" data-tab="${t}">${t}${t === "Activity" ? "" : `<b>${counts[t] ?? 0}</b>`}</button>`).join("");
        };

        const daysChip = (b) => {
            if (b.status !== "Available") return "";
            const cls = b.days_left <= 0 ? "bad" : b.days_left <= summary.thresholds.expiryDays ? "warn" : "";
            return `<span class="days-chip ${cls}">${b.days_left <= 0 ? "expires today" : `${esc(b.days_left)}d left`}</span>`;
        };

        const renderBatches = () => {
            q("#invHead").innerHTML = `<tr><th>#</th><th>Group</th><th>Units</th><th>Collected</th><th>Expires</th><th>Source</th><th>Status</th><th></th></tr>`;
            q("#invBody").innerHTML = items.length ? items.map((b, i) => `
                <tr>
                    <td>#${esc(b.batch_id)}</td>
                    <td><strong>${esc(b.blood_group)}</strong></td>
                    <td>${esc(b.units_left)} <span class="sub">/ ${esc(b.units_received)}</span></td>
                    <td>${esc(b.collected_on)}</td>
                    <td>${esc(b.expires_on)}${daysChip(b)}</td>
                    <td>${esc(b.source)}${b.note ? `<br><span class="sub">${esc(b.note)}</span>` : ""}</td>
                    <td>${pill(STATUS_PILL, b.status)}</td>
                    <td class="actions">${b.status === "Available" ? `<button class="btn-sm danger" data-discard="${i}">Discard</button>` : ""}</td>
                </tr>`).join("") : `<tr><td colspan="8" class="muted-empty">No ${esc(state.tab.toLowerCase())} batches${state.group ? ` for ${esc(state.group)}` : ""}.</td></tr>`;
        };

        const renderLog = () => {
            q("#invHead").innerHTML = `<tr><th>When</th><th>Action</th><th>Group</th><th>Units</th><th>Batch</th><th>Reason</th></tr>`;
            q("#invBody").innerHTML = items.length ? items.map((l) => `
                <tr>
                    <td>${esc(l.at)}</td>
                    <td>${pill(ACTION_PILL, l.action)}</td>
                    <td><strong>${esc(l.blood_group)}</strong></td>
                    <td class="${l.change_units > 0 ? "chg-pos" : "chg-neg"}">${l.change_units > 0 ? "+" : ""}${esc(l.change_units)}</td>
                    <td>${l.batch_id ? `#${esc(l.batch_id)}` : "—"}</td>
                    <td>${esc(l.reason || "—")}</td>
                </tr>`).join("") : `<tr><td colspan="6" class="muted-empty">No activity yet.</td></tr>`;
        };

        async function load() {
            q("#invBody").innerHTML = `<tr><td colspan="8" class="muted-empty">Loading…</td></tr>`;
            try {
                summary = await Bank.api("/inventory/summary");
                let res;
                if (state.tab === "Activity") {
                    res = await Bank.api(`/inventory/log?page=${state.page}`);
                } else {
                    const qs = new URLSearchParams({ status: state.tab, page: state.page });
                    if (state.group) qs.set("group", state.group);
                    res = await Bank.api(`/inventory/batches?${qs}`);
                    counts = res.counts;
                }
                items = res.items;
                renderSummary();
                renderTabs();
                if (state.tab === "Activity") renderLog(); else renderBatches();
                ui.pager(q("#invPager"), res.pagination, (p) => { state.page = p; load(); });
            } catch (err) {
                q("#invBody").innerHTML = `<tr><td colspan="8" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        const showErrors = (m, errors) => {
            m.overlay.querySelectorAll(".fe").forEach((e) => { e.textContent = ""; });
            Object.entries(errors).forEach(([name, message]) => {
                const slot = m.overlay.querySelector(`[data-err="${name}"]`);
                if (slot) slot.textContent = message;
            });
        };

        function addBatch() {
            const m = ui.modal({
                title: "Add blood batch",
                body: `
                    ${field("Blood group", "ab_blood_group", `<select id="ab_blood_group">${GROUPS.map((g) => `<option value="${g}" ${g === state.group ? "selected" : ""}>${g}</option>`).join("")}</select>`, "blood_group")}
                    ${field("Units (bags)", "ab_units", `<input id="ab_units" type="number" min="1" max="500" value="1">`, "units")}
                    ${field("Collected on", "ab_collected_on", `<input id="ab_collected_on" type="date" max="${todayStr()}" value="${todayStr()}">`, "collected_on")}
                    ${field("Expires on", "ab_expires_on", `<input id="ab_expires_on" type="date" value="${plusDays(35)}">`, "expires_on", "Whole blood usually lasts 35 days. Use the expiry on your own bag label.")}
                    ${field("Source", "ab_source", `<select id="ab_source">${SOURCES.map((s) => `<option>${s}</option>`).join("")}</select>`, "source")}
                    ${field("Note (optional)", "ab_note", `<input id="ab_note" maxlength="255" placeholder="e.g. college camp, donor name">`, "note")}`,
                actions: [
                    { label: "Cancel" },
                    {
                        label: "Add batch", className: "btn-primary",
                        onClick: async ({ close, button }) => {
                            const v = (id) => m.overlay.querySelector(`#ab_${id}`).value;
                            button.disabled = true;
                            try {
                                const r = await Bank.api("/inventory/batches", {
                                    method: "POST",
                                    body: { blood_group: v("blood_group"), units: v("units"), collected_on: v("collected_on"), expires_on: v("expires_on"), source: v("source"), note: v("note") }
                                });
                                Bank.toast(r.message, "success");
                                close();
                                load();
                            } catch (err) {
                                if (err.data && err.data.errors) showErrors(m, err.data.errors);
                                else Bank.toast(err.message, "error");
                                button.disabled = false;
                            }
                        }
                    }
                ]
            });
        }

        function issueUnits() {
            const m = ui.modal({
                title: "Issue blood units",
                body: `
                    ${field("Blood group", "is_blood_group", `<select id="is_blood_group">${summary.groups.map((g) => `<option value="${g.blood_group}" ${g.blood_group === state.group ? "selected" : ""}>${g.blood_group} (${g.units} available)</option>`).join("")}</select>`, "blood_group", "Units are taken from the batch that expires first.")}
                    ${field("Units", "is_units", `<input id="is_units" type="number" min="1" max="500" value="1">`, "units")}
                    ${field("Issued to", "is_reason", `<input id="is_reason" maxlength="255" placeholder="Hospital, patient or reason">`, "reason")}
                    <div class="form-msg error" id="isMsg"></div>`,
                actions: [
                    { label: "Cancel" },
                    {
                        label: "Issue", className: "btn-primary",
                        onClick: async ({ close, button }) => {
                            const msg = m.overlay.querySelector("#isMsg");
                            msg.textContent = "";
                            button.disabled = true;
                            try {
                                const r = await Bank.api("/inventory/issue", {
                                    method: "POST",
                                    body: { blood_group: m.overlay.querySelector("#is_blood_group").value, units: m.overlay.querySelector("#is_units").value, reason: m.overlay.querySelector("#is_reason").value }
                                });
                                Bank.toast(r.message, "success");
                                close();
                                load();
                            } catch (err) {
                                msg.textContent = err.message;
                                button.disabled = false;
                            }
                        }
                    }
                ]
            });
        }

        function discard(batch) {
            ui.reasonDialog({
                title: "Discard this batch?",
                message: `The ${batch.units_left} remaining unit${batch.units_left === 1 ? "" : "s"} of ${batch.blood_group} (batch #${batch.batch_id}) will be removed from stock.`,
                confirmLabel: "Discard", danger: true, placeholder: "Why is it discarded? (e.g. damaged bag, failed test)",
                onConfirm: async (reason) => {
                    const r = await Bank.api(`/inventory/batches/${batch.batch_id}/discard`, { method: "POST", body: { reason } });
                    Bank.toast(r.message, "success");
                    load();
                }
            });
        }

        q("#invAdd").addEventListener("click", addBatch);
        q("#invIssue").addEventListener("click", () => { if (summary) issueUnits(); });
        q("#invTabs").addEventListener("click", (e) => {
            const b = e.target.closest("[data-tab]");
            if (!b) return;
            state.tab = b.dataset.tab;
            state.page = 1;
            load();
        });
        q("#invGrid").addEventListener("click", (e) => {
            const c = e.target.closest("[data-group]");
            if (!c) return;
            state.group = state.group === c.dataset.group ? "" : c.dataset.group;
            if (state.tab === "Activity") state.tab = "Available";
            state.page = 1;
            load();
        });
        q("#invBody").addEventListener("click", (e) => {
            const b = e.target.closest("[data-discard]");
            if (b) discard(items[Number(b.dataset.discard)]);
        });

        await load();
    });
})();