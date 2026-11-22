(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const ui = AdminUI;

    const role = () => (Admin.admin() || {}).role_level;
    const canModerate = () => ["Super Admin", "Admin", "Moderator"].includes(role());
    const isAdminRole = () => ["Super Admin", "Admin"].includes(role());
    const typeIcon = (t) => (t === "post" ? "📝" : "💬");

    /* ---------- actions ---------- */
    const CONTENT_ACTIONS = {
        hide: {
            title: "Hide content", verb: "Hide", danger: false, askReason: true,
            text: "Hide this content from the platform? It can be restored later. The author is notified by email."
        },
        delete: {
            title: "Delete permanently", verb: "Delete", danger: true, askReason: true,
            text: "Permanently delete this content? This cannot be undone. The author is notified by email."
        },
        restore: {
            title: "Restore content", verb: "Restore", danger: false, askReason: false,
            text: "Make this content visible again?"
        }
    };

    function contentAction(type, id, action, done) {
        const c = CONTENT_ACTIONS[action];
        ui.reasonDialog({
            title: c.title, message: c.text, confirmLabel: c.verb, danger: c.danger, askReason: c.askReason,
            onConfirm: async (reason) => {
                const r = await Admin.api(`/moderation/item/${type}/${id}/${action}`, { method: "POST", body: { reason } });
                Admin.toast(r.emailSent === false && action !== "restore" ? `${r.message} (email could not be sent)` : r.message, "success");
                done();
            }
        });
    }

    function dismissReports(type, id, done) {
        ui.reasonDialog({
            title: "Dismiss reports",
            message: "No violation found? The open reports on this content will be closed as dismissed.",
            confirmLabel: "Dismiss", askReason: false,
            onConfirm: async () => {
                const r = await Admin.api("/moderation/reports/resolve", {
                    method: "POST", body: { target_type: type, target_id: id, action: "dismiss" }
                });
                Admin.toast(r.message, "success");
                done();
            }
        });
    }

    function warnAuthor(t, done) {
        ui.reasonDialog({
            title: "Warn author",
            message: `Send a warning email to <strong>${esc(t.author_name)}</strong>? Their account stays active.`,
            confirmLabel: "Send warning", askReason: true, reasonLabel: "Warning message",
            placeholder: "What should they change?",
            onConfirm: async (message) => {
                const r = await Admin.api("/moderation/warn", {
                    method: "POST", body: { author_type: t.author_type, author_id: t.author_id, message }
                });
                Admin.toast(r.message, "success");
                done();
            }
        });
    }

    function suspendAuthor(t, done) {
        ui.reasonDialog({
            title: "Suspend author",
            message: `Suspend <strong>${esc(t.author_name)}</strong>? They will be locked out immediately and notified by email.`,
            confirmLabel: "Suspend", danger: true, askReason: true,
            onConfirm: async (reason) => {
                const r = t.author_type === "user"
                    ? await Admin.api(`/users/${t.author_id}/status`, { method: "POST", body: { status: "Suspended", reason } })
                    : await Admin.api(`/bloodbanks/${t.author_id}/status`, { method: "POST", body: { action: "suspend", reason } });
                Admin.toast(r.message, "success");
                done();
            }
        });
    }

    /* ---------- detail modal ---------- */
    function itemHtml(type, t, reports, parent) {
        const bank = t.author_type === "bloodbank";
        return `
            <div class="detail-head">
                <span class="avatar-sm" style="width:52px;height:52px;font-size:16px">${esc(ui.initials(t.author_name))}</span>
                <div><h2>${esc(t.author_name)}</h2>
                    <span class="sub">${bank ? "🏥 Blood bank" : `@${esc(t.author_username)}`}</span> ${ui.pill(t.author_status)}</div>
            </div>
            ${t.is_hidden ? `<div class="note-box"><strong>Hidden:</strong> ${esc(t.hidden_reason || "")}</div>` : ""}
            ${parent ? `<div class="section-label">In reply to post</div><div class="content-box">${esc(parent)}</div>` : ""}
            <div class="section-label">${typeIcon(type)} ${type} · posted ${ui.fmtDate(t.created_at)}${t.is_urgent ? " · URGENT" : ""}</div>
            <div class="content-box">${t.content ? esc(t.content) : '<span class="sub">(no text)</span>'}${t.media_url ? `<img src="${esc(t.media_url)}" alt="Attached image">` : ""}</div>
            <div class="section-label">Reports (${reports.length})</div>
            <div class="report-list">
                ${reports.length ? reports.map((r) => `
                    <div class="report-item">
                        <b>${esc(r.reason)}</b> · ${esc(r.reporter_name || "Unknown")} · ${ui.fmtDate(r.created_at)} · ${ui.pill(r.status)}
                        ${r.details ? `<div>${esc(r.details)}</div>` : ""}
                        ${r.resolution_note ? `<div class="sub">Note: ${esc(r.resolution_note)}</div>` : ""}
                    </div>`).join("") : '<div class="sub">No reports on this content.</div>'}
            </div>`;
    }

    function buildActions(type, t, openCount, done) {
        const acts = [{ label: "Close" }];
        if (!canModerate()) return acts;

        acts.push({ label: "Warn author", onClick: ({ close }) => { close(); warnAuthor(t, done); } });

        const canSuspend =
            (t.author_type === "user" && t.author_status === "Active") ||
            (t.author_type === "bloodbank" && t.author_status === "Approved" && isAdminRole());
        if (canSuspend) {
            acts.push({ label: "Suspend author", className: "btn-danger", onClick: ({ close }) => { close(); suspendAuthor(t, done); } });
        }
        if (openCount) {
            acts.push({ label: "Dismiss reports", onClick: ({ close }) => { close(); dismissReports(type, t.id, done); } });
        }
        acts.push(t.is_hidden
            ? { label: "Restore", className: "btn-primary", onClick: ({ close }) => { close(); contentAction(type, t.id, "restore", done); } }
            : { label: "Hide", onClick: ({ close }) => { close(); contentAction(type, t.id, "hide", done); } });
        acts.push({ label: "Delete", className: "btn-danger", onClick: ({ close }) => { close(); contentAction(type, t.id, "delete", done); } });
        return acts;
    }

    async function openItem(type, id, done) {
        const m = ui.modal({ title: type === "post" ? "Post details" : "Comment details", wide: true, body: `<div class="muted-empty">Loading…</div>` });
        try {
            const { target, reports, parent } = await Admin.api(`/moderation/item/${type}/${id}`);
            m.bodyEl.innerHTML = itemHtml(type, target, reports, parent);
            m.setActions(buildActions(type, target, reports.filter((r) => r.status === "Open").length, done));
        } catch (err) {
            m.bodyEl.innerHTML = `<div class="muted-empty">${esc(err.message)}</div>`;
        }
    }

    /* ---------- Reports section ---------- */
    function reportsSection(box) {
        const state = { status: "open", page: 1 };
        const TABS = [["open", "Open"], ["resolved", "Resolved"], ["dismissed", "Dismissed"]];

        box.innerHTML = `
            <div class="tabs" id="mTabs"></div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>Reported content</th><th>Reasons</th><th>Reports</th><th>Last reported</th><th>Status</th><th></th></tr></thead>
                <tbody id="mBody"></tbody>
            </table></div></div>
            <div class="pager" id="mPager"></div>`;

        const tabsEl = box.querySelector("#mTabs");
        const bodyEl = box.querySelector("#mBody");
        const pagerEl = box.querySelector("#mPager");
        let items = [];

        const renderTabs = (counts) => {
            tabsEl.innerHTML = TABS.map(([key, name]) =>
                `<button class="tab ${state.status === key ? "active" : ""}" data-tab="${key}">${name}<b>${counts[key] ?? 0}</b></button>`
            ).join("");
        };

        const renderRows = () => {
            if (!items.length) {
                bodyEl.innerHTML = `<tr><td colspan="6" class="muted-empty">${state.status === "open" ? "No open reports. 🎉" : "Nothing here."}</td></tr>`;
                return;
            }
            bodyEl.innerHTML = items.map((r, i) => {
                const exists = r.is_hidden !== null;
                const label = !exists ? "Deleted" : r.is_hidden ? "Hidden" : "Visible";
                return `
                <tr>
                    <td><div class="snippet">${typeIcon(r.target_type)} ${r.snippet ? esc(r.snippet) : '<span class="sub">(no text)</span>'}</div></td>
                    <td>${esc(r.reasons)}</td>
                    <td><strong>${esc(r.report_count)}</strong></td>
                    <td>${ui.fmtDate(r.last_reported)}</td>
                    <td>${ui.pill(label)}</td>
                    <td class="actions">${exists ? `<button class="btn-sm" data-i="${i}">Review</button>` : ""}</td>
                </tr>`;
            }).join("");
        };

        async function load() {
            bodyEl.innerHTML = `<tr><td colspan="6" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({ status: state.status, page: state.page, limit: 10 });
                const res = await Admin.api(`/moderation/reports?${qs}`);
                items = res.items;
                renderTabs(res.counts);
                renderRows();
                ui.pager(pagerEl, res.pagination, (p) => { state.page = p; load(); });
                AdminShell.setBadge("moderation", res.counts.open);
            } catch (err) {
                bodyEl.innerHTML = `<tr><td colspan="6" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        tabsEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-tab]");
            if (!btn) return;
            state.status = btn.dataset.tab;
            state.page = 1;
            load();
        });
        bodyEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-i]");
            if (!btn) return;
            const r = items[Number(btn.dataset.i)];
            if (r) openItem(r.target_type, r.target_id, load);
        });

        return load();
    }

    /* ---------- Posts / Comments section ---------- */
    function contentSection(box, type) {
        const state = { status: "all", search: "", page: 1 };
        const isPost = type === "post";
        const TABS = [["all", "All"], ["visible", "Visible"], ["hidden", "Hidden"], ["reported", "Reported"]];
        const cols = isPost ? 7 : 7;

        box.innerHTML = `
            <div class="tabs" id="cTabs"></div>
            <div class="toolbar">
                <input class="input" id="cSearch" type="search" placeholder="Search ${isPost ? "posts" : "comments"} or authors…">
            </div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>Content</th><th>Author</th><th>${isPost ? "Activity" : "On post"}</th><th>Open reports</th><th>Posted</th><th>Status</th><th></th></tr></thead>
                <tbody id="cBody"></tbody>
            </table></div></div>
            <div class="pager" id="cPager"></div>`;

        const tabsEl = box.querySelector("#cTabs");
        const bodyEl = box.querySelector("#cBody");
        const pagerEl = box.querySelector("#cPager");
        let items = [];

        const renderTabs = (counts) => {
            tabsEl.innerHTML = TABS.map(([key, name]) =>
                `<button class="tab ${state.status === key ? "active" : ""}" data-tab="${key}">${name}<b>${counts[key] ?? 0}</b></button>`
            ).join("");
        };

        const renderRows = () => {
            if (!items.length) {
                bodyEl.innerHTML = `<tr><td colspan="${cols}" class="muted-empty">Nothing found.</td></tr>`;
                return;
            }
            bodyEl.innerHTML = items.map((c, i) => `
                <tr>
                    <td><div class="snippet">${c.is_urgent ? "⚡ " : ""}${c.media_url ? "🖼 " : ""}${c.snippet ? esc(c.snippet) : '<span class="sub">(no text)</span>'}</div></td>
                    <td><strong>${esc(c.author_name || "Unknown")}</strong><br><span class="sub">${c.author_type === "bloodbank" ? "🏥 Blood bank" : `@${esc(c.author_username)}`}</span></td>
                    <td>${isPost ? `❤ ${esc(c.likes)} · 💬 ${esc(c.comments)}` : `#${esc(c.post_id)}`}</td>
                    <td>${c.open_reports ? `<span class="pill s-open">${esc(c.open_reports)}</span>` : "—"}</td>
                    <td>${ui.fmtDate(c.created_at)}</td>
                    <td>${ui.pill(c.is_hidden ? "Hidden" : "Visible")}</td>
                    <td class="actions"><button class="btn-sm" data-i="${i}">View</button></td>
                </tr>`).join("");
        };

        async function load() {
            bodyEl.innerHTML = `<tr><td colspan="${cols}" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({ status: state.status, search: state.search, page: state.page, limit: 10 });
                const res = await Admin.api(`/moderation/${isPost ? "posts" : "comments"}?${qs}`);
                items = res.items;
                renderTabs(res.counts);
                renderRows();
                ui.pager(pagerEl, res.pagination, (p) => { state.page = p; load(); });
            } catch (err) {
                bodyEl.innerHTML = `<tr><td colspan="${cols}" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        tabsEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-tab]");
            if (!btn) return;
            state.status = btn.dataset.tab;
            state.page = 1;
            load();
        });
        box.querySelector("#cSearch").addEventListener("input", ui.debounce((e) => {
            state.search = e.target.value.trim();
            state.page = 1;
            load();
        }));
        bodyEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-i]");
            if (!btn) return;
            const c = items[Number(btn.dataset.i)];
            if (c) openItem(type, c.id, load);
        });

        return load();
    }

    /* ---------- Page ---------- */
    AdminShell.register("moderation", async (el) => {
        el.innerHTML = `
            <div class="page-head"><h1>Moderation</h1><p>Review reported content and keep the community safe.</p></div>
            <div class="seg" id="mSeg">
                <button data-s="reports" class="active">Reports</button>
                <button data-s="posts">Posts</button>
                <button data-s="comments">Comments</button>
            </div>
            <div id="mSection"></div>`;

        const box = el.querySelector("#mSection");
        const seg = el.querySelector("#mSeg");

        const show = (name) => {
            seg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.s === name));
            if (name === "posts") return contentSection(box, "post");
            if (name === "comments") return contentSection(box, "comment");
            return reportsSection(box);
        };

        seg.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-s]");
            if (btn) show(btn.dataset.s);
        });

        await show("reports");
    });
})();