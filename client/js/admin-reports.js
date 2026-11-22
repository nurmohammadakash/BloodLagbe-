(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const TYPES = [
        ["users", "Users"],
        ["requests", "Blood requests"],
        ["donations", "Donations"],
        ["connections", "Blood connections"],
        ["bloodbanks", "Blood banks"]
    ];

    AdminShell.register("reports", async (el) => {
        const role = (Admin.admin() || {}).role_level;

        if (!["Super Admin", "Admin"].includes(role)) {
            el.innerHTML = `
                <div class="card empty">
                    <div style="font-size:42px">🔒</div>
                    <h3>Admin access only</h3>
                    <p>Reports contain personal data and are limited to Admin and Super Admin.</p>
                </div>`;
            return;
        }

        el.innerHTML = `
            <div class="page-head"><h1>Reports</h1><p>Preview data for a date range and download it as CSV (opens in Excel).</p></div>
            <div class="toolbar">
                <select class="select" id="rpType">${TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
                <label class="sub">From <input class="input" type="date" id="rpFrom" style="min-width:150px"></label>
                <label class="sub">To <input class="input" type="date" id="rpTo" style="min-width:150px"></label>
                <button class="btn btn-ghost" id="rpClear">Clear dates</button>
                <button class="btn btn-primary" id="rpCsv">⬇ Download CSV</button>
            </div>
            <div id="rpSummary"></div>
            <div id="rpBreakdowns" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:16px"></div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead id="rpHead"></thead>
                <tbody id="rpBody"></tbody>
            </table></div></div>`;

        const q = (s) => el.querySelector(s);
        const params = () => {
            const p = new URLSearchParams();
            if (q("#rpFrom").value) p.set("from", q("#rpFrom").value);
            if (q("#rpTo").value) p.set("to", q("#rpTo").value);
            return p;
        };

        async function preview() {
            q("#rpBody").innerHTML = `<tr><td class="muted-empty">Loading…</td></tr>`;
            q("#rpHead").innerHTML = "";
            q("#rpBreakdowns").innerHTML = "";
            try {
                const res = await Admin.api(`/reports/${q("#rpType").value}?${params()}`);

                q("#rpSummary").innerHTML = `<p class="sub" style="margin:0 0 12px"><strong>${res.total}</strong> ${esc(res.title.toLowerCase())} in this range${res.total > res.previewLimit ? ` — showing the first ${res.previewLimit}. The CSV contains all rows.` : "."}</p>`;

                q("#rpBreakdowns").innerHTML = res.breakdowns.map((b) => `
                    <div class="card">
                        <h3>${esc(b.title)}</h3>
                        ${b.rows.length ? b.rows.map((r) => `<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${esc(r.label)}</span><strong>${r.count}</strong></div>`).join("") : '<span class="sub">No data</span>'}
                    </div>`).join("");

                q("#rpHead").innerHTML = `<tr>${res.columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr>`;
                q("#rpBody").innerHTML = res.rows.length
                    ? res.rows.map((r) => `<tr>${res.columns.map((c) => `<td>${esc(r[c.key])}</td>`).join("")}</tr>`).join("")
                    : `<tr><td class="muted-empty" colspan="${res.columns.length}">No data for this range.</td></tr>`;
            } catch (err) {
                q("#rpSummary").innerHTML = "";
                q("#rpBody").innerHTML = `<tr><td class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        async function download() {
            const btn = q("#rpCsv");
            btn.disabled = true;
            btn.textContent = "Preparing…";
            try {
                const p = params();
                p.set("format", "csv");
                const res = await fetch(`/api/admin/reports/${q("#rpType").value}?${p}`, {
                    headers: { Authorization: `Bearer ${Admin.token()}` }
                });
                if (res.status === 401) { Admin.logout(); return; }
                if (!res.ok) {
                    let msg = "Download failed.";
                    try { msg = (await res.json()).message || msg; } catch { /* not JSON */ }
                    throw new Error(msg);
                }
                const blob = await res.blob();
                const match = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = match ? match[1] : "report.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(a.href);
                Admin.toast("CSV downloaded.", "success");
            } catch (err) {
                Admin.toast(err.message, "error");
            } finally {
                btn.disabled = false;
                btn.textContent = "⬇ Download CSV";
            }
        }

        q("#rpType").addEventListener("change", preview);
        q("#rpFrom").addEventListener("change", preview);
        q("#rpTo").addEventListener("change", preview);
        q("#rpClear").addEventListener("click", () => { q("#rpFrom").value = ""; q("#rpTo").value = ""; preview(); });
        q("#rpCsv").addEventListener("click", download);

        await preview();
    });
})();