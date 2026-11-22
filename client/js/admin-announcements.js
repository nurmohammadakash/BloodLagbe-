(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const ui = AdminUI;
    const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const isAdminRole = () => ["Super Admin", "Admin"].includes((Admin.admin() || {}).role_level);

    const audienceText = (a) => {
        const parts = [{ everyone: "Everyone", users: "Users", bloodbanks: "Blood banks" }[a.audience] || a.audience];
        if (a.blood_group) parts.push(a.blood_group);
        if (a.donors_only) parts.push("donors only");
        if (a.district) parts.push(a.district);
        else if (a.division) parts.push(a.division);
        return parts.join(" · ");
    };

    AdminShell.register("announcements", async (el) => {
        if (!isAdminRole()) {
            el.innerHTML = `<div class="card empty"><h3>Admins only</h3><p>Only Admins can send announcements.</p></div>`;
            return;
        }

        const opts = await Admin.api("/announcements/options");
        const divisions = [...new Set(opts.locations.map((l) => l.division))];

        el.innerHTML = `
            <div class="page-head"><h1>Announcements</h1><p>Send an in-app notification, and optionally an email, to your community.</p></div>

            <div class="card compose-card">
                <h3>New announcement</h3>
                <div class="field">
                    <label for="anTarget">Audience</label>
                    <select id="anTarget">
                        <option value="everyone">Everyone (users and blood banks)</option>
                        <option value="users">Users only</option>
                        <option value="bloodbanks">Blood banks only</option>
                    </select>
                </div>
                <div class="form-grid">
                    <div class="field"><label for="anGroup">Blood group (users only)</label>
                        <select id="anGroup"><option value="">Any</option>${GROUPS.map((g) => `<option>${g}</option>`).join("")}</select></div>
                    <div class="field"><label>&nbsp;</label>
                        <label class="check" style="margin-top:12px"><input type="checkbox" id="anDonors"> Donors only (users)</label></div>
                    <div class="field"><label for="anDivision">Division</label>
                        <select id="anDivision"><option value="">All divisions</option>${divisions.map((d) => `<option>${esc(d)}</option>`).join("")}</select></div>
                    <div class="field"><label for="anDistrict">District</label>
                        <select id="anDistrict"><option value="">All districts</option></select></div>
                </div>

                <div class="field"><label for="anTitle">Title</label>
                    <input id="anTitle" maxlength="120" placeholder="e.g. Urgent: O- blood needed in Chattogram"></div>
                <div class="field"><label for="anMessage">Message</label>
                    <textarea id="anMessage" rows="4" maxlength="500" placeholder="Write a clear, short message…"
                        style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font:inherit;resize:vertical"></textarea>
                    <div class="char-count"><span id="anCount">0</span>/500</div></div>
                <div class="field"><label for="anLink">Link inside the site (optional)</label>
                    <input id="anLink" maxlength="255" placeholder="/dashboard"></div>

                <label class="check"><input type="checkbox" id="anEmail"> Also send as an email (max ${opts.maxEmailRecipients} recipients)</label>
                <div class="reach" id="anReach">Calculating audience…</div>
                <div class="form-msg" id="anMsg"></div>
                <button class="btn btn-primary" id="anSend">Send announcement</button>
            </div>

            <div class="card-head"><h3>Sent announcements</h3></div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>Date</th><th>Announcement</th><th>Audience</th><th>Reach</th><th>Email</th><th>By</th></tr></thead>
                <tbody id="anBody"></tbody>
            </table></div></div>
            <div class="pager" id="anPager"></div>`;

        const $ = (id) => el.querySelector(`#${id}`);
        const state = { page: 1 };

        /* ---- form helpers ---- */
        const payload = () => ({
            target: $("anTarget").value,
            blood_group: $("anGroup").value,
            donors_only: $("anDonors").checked,
            division: $("anDivision").value,
            district: $("anDistrict").value,
            title: $("anTitle").value.trim(),
            message: $("anMessage").value.trim(),
            link: $("anLink").value.trim(),
            send_email: $("anEmail").checked
        });

        const syncFilters = () => {
            const usersOnly = $("anTarget").value === "users";
            $("anGroup").disabled = !usersOnly;
            $("anDonors").disabled = !usersOnly;
            if (!usersOnly) { $("anGroup").value = ""; $("anDonors").checked = false; }
        };

        const fillDistricts = () => {
            const div = $("anDivision").value;
            const list = opts.locations.filter((l) => !div || l.division === div).map((l) => l.district);
            $("anDistrict").innerHTML = `<option value="">All districts</option>` +
                [...new Set(list)].sort().map((d) => `<option>${esc(d)}</option>`).join("");
        };

        const refreshReach = ui.debounce(async () => {
            try {
                const r = await Admin.api("/announcements/preview", { method: "POST", body: payload() });
                $("anReach").innerHTML = r.total
                    ? `This will reach <strong>${r.total}</strong> ${r.total === 1 ? "person" : "people"} (${r.users} user${r.users === 1 ? "" : "s"}, ${r.bloodbanks} blood bank${r.bloodbanks === 1 ? "" : "s"}).`
                    : "No one matches this audience.";
            } catch (err) {
                $("anReach").textContent = err.message;
            }
        }, 300);

        $("anTarget").addEventListener("change", () => { syncFilters(); refreshReach(); });
        $("anDivision").addEventListener("change", () => { fillDistricts(); refreshReach(); });
        ["anGroup", "anDistrict"].forEach((id) => $(id).addEventListener("change", refreshReach));
        $("anDonors").addEventListener("change", refreshReach);
        $("anMessage").addEventListener("input", (e) => { $("anCount").textContent = e.target.value.length; });

        /* ---- send ---- */
        $("anSend").addEventListener("click", () => {
            const p = payload();
            const msg = $("anMsg");
            msg.textContent = "";
            msg.className = "form-msg error";

            if (p.title.length < 3 || p.message.length < 3) {
                msg.textContent = "Please enter a title and a message.";
                return;
            }

            ui.reasonDialog({
                title: "Send announcement",
                message: `Send <strong>${esc(p.title)}</strong> to this audience now? ${$("anReach").textContent} It cannot be recalled once sent.`,
                confirmLabel: "Send now", askReason: false,
                onConfirm: async () => {
                    const r = await Admin.api("/announcements", { method: "POST", body: p });
                    Admin.toast(r.message, "success");
                    $("anTitle").value = "";
                    $("anMessage").value = "";
                    $("anCount").textContent = "0";
                    state.page = 1;
                    loadHistory();
                }
            });
        });

        /* ---- history ---- */
        const emailCell = (a) => {
            if (!a.send_email) return '<span class="sub">In-app only</span>';
            if (a.sending) return '<span class="pill s-pending">Sending…</span>';
            return `${esc(a.emails_sent)} sent${a.emails_failed ? ` · <span class="overdue">${esc(a.emails_failed)} failed</span>` : ""}`;
        };

        async function loadHistory() {
            const body = $("anBody");
            body.innerHTML = `<tr><td colspan="6" class="muted-empty">Loading…</td></tr>`;
            try {
                const res = await Admin.api(`/announcements?page=${state.page}&limit=8`);
                body.innerHTML = res.items.length
                    ? res.items.map((a) => `
                        <tr>
                            <td>${ui.fmtDate(a.created_at)}</td>
                            <td><strong>${esc(a.title)}</strong><div class="snippet sub">${esc(a.message)}</div></td>
                            <td>${esc(audienceText(a))}</td>
                            <td><strong>${esc(a.recipients)}</strong></td>
                            <td>${emailCell(a)}</td>
                            <td>${esc(a.created_by_name || "—")}</td>
                        </tr>`).join("")
                    : `<tr><td colspan="6" class="muted-empty">No announcements sent yet.</td></tr>`;
                ui.pager($("anPager"), res.pagination, (p) => { state.page = p; loadHistory(); });
            } catch (err) {
                body.innerHTML = `<tr><td colspan="6" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        syncFilters();
        refreshReach();
        await loadHistory();
    });
})();