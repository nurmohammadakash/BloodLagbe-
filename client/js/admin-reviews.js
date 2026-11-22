(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const ui = AdminUI;
    const canModerate = () => ["Super Admin", "Admin", "Moderator"].includes((Admin.admin() || {}).role_level);
    const stars = (n) => `<span class="stars">${"★".repeat(n)}${"☆".repeat(5 - n)}</span>`;

    AdminShell.register("reviews", async (el) => {
        const state = { stars: "", text: "all", search: "", page: 1 };

        el.innerHTML = `
            <div class="page-head"><h1>Reviews</h1><p>Ratings users leave after confirmed blood donations.</p></div>
            <div class="grid-4" id="rvKpis"></div>
            <div class="toolbar">
                <input class="input" id="rvSearch" type="search" placeholder="Search review text or names…">
                <select class="select" id="rvStars">
                    <option value="">All ratings</option>
                    ${[5, 4, 3, 2, 1].map((s) => `<option value="${s}">${s} star${s > 1 ? "s" : ""}</option>`).join("")}
                </select>
                <select class="select" id="rvText">
                    <option value="all">With or without text</option>
                    <option value="with_text">With text only</option>
                    <option value="no_text">Rating only</option>
                </select>
            </div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>Rater → Rated</th><th>Rating</th><th>Review</th><th>Date</th><th></th></tr></thead>
                <tbody id="rvBody"></tbody>
            </table></div></div>
            <div class="pager" id="rvPager"></div>`;

        const kpis = el.querySelector("#rvKpis");
        const bodyEl = el.querySelector("#rvBody");
        const pagerEl = el.querySelector("#rvPager");
        let items = [];

        const renderKpis = (s) => {
            kpis.innerHTML = `
                <div class="card stat"><div class="ico">⭐</div><div><strong>${s.average ? s.average.toFixed(1) : "—"}</strong><span>Average user rating</span></div></div>
                <div class="card stat"><div class="ico">📝</div><div><strong>${s.total}</strong><span>Total reviews</span></div></div>
                <div class="card stat"><div class="ico">👎</div><div><strong>${s.low}</strong><span>Low ratings (1–2 stars)</span></div></div>
                <div class="card stat"><div class="ico">🌐</div><div><strong>${s.site.average ? s.site.average.toFixed(1) : "—"}</strong><span>Website rating</span><small>${s.site.total} rating(s)</small></div></div>`;
        };

        const renderRows = () => {
            if (!items.length) {
                bodyEl.innerHTML = `<tr><td colspan="5" class="muted-empty">No reviews found.</td></tr>`;
                return;
            }
            bodyEl.innerHTML = items.map((r, i) => `
                <tr>
                    <td><strong>${esc(r.rater_name)}</strong> <span class="sub">@${esc(r.rater_username)}</span><br>
                        <span class="sub">→ ${esc(r.rated_name)} @${esc(r.rated_username)}</span></td>
                    <td>${stars(r.stars)}</td>
                    <td><div class="snippet">${r.review ? esc(r.review) : '<span class="sub">(rating only)</span>'}</div></td>
                    <td>${ui.fmtDate(r.created_at)}</td>
                    <td class="actions">
                        ${canModerate() && r.review ? `<button class="btn-sm" data-act="clear" data-i="${i}">Remove text</button>` : ""}
                        ${canModerate() ? `<button class="btn-sm danger" data-act="delete" data-i="${i}">Delete</button>` : ""}
                    </td>
                </tr>`).join("");
        };

        async function load() {
            bodyEl.innerHTML = `<tr><td colspan="5" class="muted-empty">Loading…</td></tr>`;
            try {
                const qs = new URLSearchParams({ stars: state.stars, text: state.text, search: state.search, page: state.page, limit: 10 });
                const res = await Admin.api(`/reviews?${qs}`);
                items = res.items;
                renderKpis(res.summary);
                renderRows();
                ui.pager(pagerEl, res.pagination, (p) => { state.page = p; load(); });
            } catch (err) {
                bodyEl.innerHTML = `<tr><td colspan="5" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        function act(review, kind) {
            const isClear = kind === "clear";
            ui.reasonDialog({
                title: isClear ? "Remove review text" : "Delete review",
                message: isClear
                    ? `Remove the written text from <strong>${esc(review.rater_name)}</strong>'s review? The ${review.stars}-star rating is kept.`
                    : `Delete <strong>${esc(review.rater_name)}</strong>'s ${review.stars}-star review completely? This also removes its effect on the rating.`,
                confirmLabel: isClear ? "Remove text" : "Delete review",
                danger: true,
                askReason: true,
                onConfirm: async (reason) => {
                    const r = await Admin.api(`/reviews/${review.review_id}/${isClear ? "clear-text" : "delete"}`, {
                        method: "POST", body: { reason }
                    });
                    Admin.toast(r.emailSent ? r.message : `${r.message} (email could not be sent)`, "success");
                    load();
                }
            });
        }

        el.querySelector("#rvSearch").addEventListener("input", ui.debounce((e) => { state.search = e.target.value.trim(); state.page = 1; load(); }));
        el.querySelector("#rvStars").addEventListener("change", (e) => { state.stars = e.target.value; state.page = 1; load(); });
        el.querySelector("#rvText").addEventListener("change", (e) => { state.text = e.target.value; state.page = 1; load(); });

        bodyEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-act]");
            if (!btn) return;
            const review = items[Number(btn.dataset.i)];
            if (review) act(review, btn.dataset.act);
        });

        await load();
    });
})();