(() => {
    if (!window.BankShell) return;

    const esc = Bank.escape;

    const css = document.createElement("style");
    css.textContent = `
        .fe{display:block;color:var(--red);font-size:12px;margin-top:4px}
        .fe:empty{display:none}
        .hint{display:block;color:var(--text-secondary);font-size:12px;margin-top:4px}
        .bs-stack{display:grid;gap:16px;max-width:900px}
        .bs-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
        .bs-full{grid-column:1/-1}
        @media(max-width:700px){.bs-grid{grid-template-columns:1fr}}
        .chk-row{display:flex;flex-wrap:wrap;gap:8px 18px}
        .chk{display:flex;gap:6px;align-items:center;font-size:14px;cursor:pointer}
        .bs-kv{display:grid;grid-template-columns:130px 1fr;gap:6px 12px;font-size:14px;margin:0}
        .bs-kv dt{color:var(--text-secondary)}
        .bs-kv dd{margin:0;word-break:break-word}
    `;
    document.head.appendChild(css);

    const field = (label, name, control, { hint = "", full = false } = {}) => `
        <div class="field ${full ? "bs-full" : ""}">
            <label for="bs_${name}">${label}</label>
            ${control}
            ${hint ? `<small class="hint">${hint}</small>` : ""}
            <small class="fe" data-err="${name}"></small>
        </div>`;

    const input = (name, value, type = "text", extra = "") =>
        `<input id="bs_${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;

    const checks = (name, options, selected) => `
        <div class="chk-row" data-group="${name}">${options.map((o) =>
            `<label class="chk"><input type="checkbox" value="${esc(o)}" ${selected.includes(o) ? "checked" : ""}> ${esc(o)}</label>`).join("")}</div>`;

    BankShell.register("settings", async (el) => {
        const data = await Bank.api("/settings");
        const b = data.bank;
        const s = data.settings;

        el.innerHTML = `
            <div class="page-head"><h1>Profile &amp; Settings</h1><p>Manage how your blood bank appears and how stock alerts work.</p></div>
            <div class="bs-stack">

                <section class="card">
                    <h3>Bank details</h3>
                    <dl class="bs-kv">
                        <dt>Name</dt><dd>${esc(b.name)}</dd>
                        <dt>License</dt><dd>${esc(b.license_number)}</dd>
                        <dt>Email</dt><dd>${esc(b.email)}</dd>
                        <dt>Location</dt><dd>${esc(b.upazila)}, ${esc(b.district)}, ${esc(b.division)}</dd>
                        <dt>Status</dt><dd>${esc(b.status)}</dd>
                        <dt>Member since</dt><dd>${esc(b.member_since)}</dd>
                    </dl>
                    <p class="hint">To change your name, license, email or location, contact the platform admin.</p>
                </section>

                <form id="bsForm" class="bs-stack" novalidate>
                    <section class="card">
                        <h3>Contact &amp; about</h3>
                        <div class="bs-grid">
                            ${field("Phone number", "phone", input("phone", b.phone, "tel", 'maxlength="20"'))}
                            ${field("Emergency phone", "emergency_phone", input("emergency_phone", s.emergency_phone, "tel", 'maxlength="20"'), { hint: "Optional" })}
                            ${field("Address", "address", input("address", b.address, "text", 'maxlength="255"'), { full: true })}
                            ${field("About your blood bank", "about", `<textarea id="bs_about" name="about" rows="3" maxlength="500">${esc(s.about)}</textarea>`, { full: true, hint: "Shown to users who look for a blood bank (up to 500 characters)" })}
                        </div>
                    </section>

                    <section class="card">
                        <h3>Working hours &amp; services</h3>
                        <label class="chk" style="margin-bottom:12px"><input type="checkbox" id="bs_24x7" ${s.is_24x7 ? "checked" : ""}> Open 24 hours, every day</label>
                        <div class="bs-grid" id="bsHours">
                            ${field("Open days", "open_days", checks("open_days", data.options.days, s.open_days), { full: true })}
                            ${field("Opening time", "opening_time", input("opening_time", s.opening_time, "time"))}
                            ${field("Closing time", "closing_time", input("closing_time", s.closing_time, "time"))}
                        </div>
                        <div class="bs-grid">
                            ${field("Services you provide", "services", checks("services", data.options.services, s.services), { full: true })}
                        </div>
                    </section>

                    <section class="card">
                        <h3>Stock alerts</h3>
                        <div class="bs-grid">
                            ${field("Low stock at or below (units)", "low_stock_threshold", input("low_stock_threshold", s.low_stock_threshold, "number", 'min="1" max="100"'), { hint: "A blood group at or below this shows as Low" })}
                            ${field("Critical at or below (units)", "critical_stock_threshold", input("critical_stock_threshold", s.critical_stock_threshold, "number", 'min="0" max="50"'), { hint: "Must be lower than the low level" })}
                            ${field("Warn before expiry (days)", "expiry_warning_days", input("expiry_warning_days", s.expiry_warning_days, "number", 'min="1" max="30"'), { hint: "Batches expiring within this many days are listed on the dashboard" })}
                        </div>
                    </section>

                    <div><button class="btn btn-primary" type="submit" id="bsSave">Save changes</button></div>
                </form>

                <section class="card">
                    <h3>Change password</h3>
                    <div class="bs-grid">
                        ${field("Current password", "currentPassword", `<input id="bs_currentPassword" type="password" autocomplete="current-password">`)}
                        <div></div>
                        ${field("New password", "newPassword", `<input id="bs_newPassword" type="password" autocomplete="new-password">`, { hint: "At least 8 characters with uppercase, lowercase, a number and a special character" })}
                        ${field("Confirm new password", "confirmPassword", `<input id="bs_confirmPassword" type="password" autocomplete="new-password">`)}
                    </div>
                    <div class="form-msg" id="pwMsg"></div>
                    <button class="btn btn-primary" type="button" id="pwSave">Update password</button>
                </section>
            </div>`;

        const q = (sel) => el.querySelector(sel);
        const val = (name) => (q(`[name="${name}"]`)?.value ?? "").trim();
        const picked = (group) => [...q(`[data-group="${group}"]`).querySelectorAll("input:checked")].map((i) => i.value);

        const syncHours = () => {
            const off = q("#bs_24x7").checked;
            q("#bsHours").querySelectorAll("input").forEach((i) => { i.disabled = off; });
        };
        q("#bs_24x7").addEventListener("change", syncHours);
        syncHours();

        const showErrors = (errors) => {
            el.querySelectorAll(".fe").forEach((e) => { e.textContent = ""; });
            Object.entries(errors).forEach(([name, message]) => {
                const slot = q(`[data-err="${name}"]`);
                if (slot) slot.textContent = message;
            });
            q(".fe:not(:empty)")?.scrollIntoView({ block: "center", behavior: "smooth" });
        };

        q("#bsForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = q("#bsSave");
            btn.disabled = true;
            btn.textContent = "Saving…";
            showErrors({});
            try {
                const res = await Bank.api("/settings", {
                    method: "PUT",
                    body: {
                        phone: val("phone"), emergency_phone: val("emergency_phone"), address: val("address"), about: val("about"),
                        is_24x7: q("#bs_24x7").checked, open_days: picked("open_days"),
                        opening_time: val("opening_time"), closing_time: val("closing_time"), services: picked("services"),
                        low_stock_threshold: val("low_stock_threshold"), critical_stock_threshold: val("critical_stock_threshold"),
                        expiry_warning_days: val("expiry_warning_days")
                    }
                });
                Bank.toast(res.message, "success");
            } catch (err) {
                if (err.data && err.data.errors) showErrors(err.data.errors);
                Bank.toast(err.message, "error");
            } finally {
                btn.disabled = false;
                btn.textContent = "Save changes";
            }
        });

        q("#pwSave").addEventListener("click", async () => {
            const msg = q("#pwMsg");
            const set = (text, type) => { msg.textContent = text; msg.className = `form-msg ${type || ""}`; };
            const currentPassword = q("#bs_currentPassword").value;
            const newPassword = q("#bs_newPassword").value;

            if (!currentPassword || !newPassword || !q("#bs_confirmPassword").value) return set("Fill in all three fields.", "error");
            if (newPassword !== q("#bs_confirmPassword").value) return set("New passwords do not match.", "error");

            const btn = q("#pwSave");
            btn.disabled = true;
            set("Saving…");
            try {
                const res = await Bank.api("/password", { method: "POST", body: { currentPassword, newPassword } });
                set(res.message, "success");
                Bank.toast(res.message, "success");
                ["#bs_currentPassword", "#bs_newPassword", "#bs_confirmPassword"].forEach((i) => { q(i).value = ""; });
            } catch (err) {
                set(err.message, "error");
            } finally {
                btn.disabled = false;
            }
        });
    });
})();