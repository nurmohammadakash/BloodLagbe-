(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;
    const ui = AdminUI;
    const ROLES = ["Super Admin", "Admin", "Moderator", "Support"];
    const ROLE_INFO = {
        "Super Admin": "Full access, including admin accounts",
        "Admin": "Manage blood banks, users, requests, announcements, audit log",
        "Moderator": "Moderate content, reviews, users and requests",
        "Support": "View-only access"
    };

    const roleOptions = (selected) =>
        ROLES.map((r) => `<option value="${r}" ${r === selected ? "selected" : ""}>${r} — ${ROLE_INFO[r]}</option>`).join("");

    AdminShell.register("admins", async (el) => {
        const me = Admin.admin() || {};

        if (me.role_level !== "Super Admin") {
            el.innerHTML = `
                <div class="card empty">
                    <div style="font-size:42px">🔒</div>
                    <h3>Super Admin only</h3>
                    <p>You do not have permission to manage admin accounts.</p>
                </div>`;
            return;
        }

        el.innerHTML = `
            <div class="page-head"><h1>Admin Accounts</h1><p>Create admins, change roles, and suspend access.</p></div>
            <div class="toolbar"><button class="btn btn-primary" id="adNew">+ New admin</button></div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>Admin</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr></thead>
                <tbody id="adBody"></tbody>
            </table></div></div>`;

        const bodyEl = el.querySelector("#adBody");
        let items = [];
        let meId = null;

        const renderRows = () => {
            if (!items.length) {
                bodyEl.innerHTML = `<tr><td colspan="5" class="muted-empty">No admins found.</td></tr>`;
                return;
            }
            bodyEl.innerHTML = items.map((a, i) => {
                const self = a.admin_id === meId;
                const suspended = a.status === "Suspended";
                return `
                <tr>
                    <td><strong>${esc(a.username)}</strong>${self ? ' <span class="sub">(you)</span>' : ""}<br><span class="sub">${esc(a.email)}</span></td>
                    <td>${ui.pill(a.role_level)}</td>
                    <td>${ui.pill(a.status)}</td>
                    <td>${ui.fmtDate(a.last_login)}</td>
                    <td class="actions">
                        ${self ? '<span class="sub">—</span>' : `
                            <button class="btn-sm" data-act="role" data-i="${i}">Change role</button>
                            <button class="btn-sm ${suspended ? "" : "danger"}" data-act="status" data-i="${i}">${suspended ? "Activate" : "Suspend"}</button>`}
                    </td>
                </tr>`;
            }).join("");
        };

        async function load() {
            bodyEl.innerHTML = `<tr><td colspan="5" class="muted-empty">Loading…</td></tr>`;
            try {
                const res = await Admin.api("/admins");
                items = res.items;
                meId = res.me;
                renderRows();
            } catch (err) {
                bodyEl.innerHTML = `<tr><td colspan="5" class="muted-empty">${esc(err.message)}</td></tr>`;
            }
        }

        function newAdmin() {
            const m = ui.modal({
                title: "New admin",
                body: `
                    <div class="field"><label for="naUser">Username</label><input id="naUser" type="text" maxlength="30" autocomplete="off"></div>
                    <div class="field"><label for="naEmail">Email</label><input id="naEmail" type="email" autocomplete="off"></div>
                    <div class="field"><label for="naPass">Temporary password</label><input id="naPass" type="password" autocomplete="new-password"></div>
                    <div class="field"><label for="naRole">Role</label><select id="naRole">${roleOptions("Moderator")}</select></div>
                    <div class="form-msg error" id="naErr"></div>`,
                actions: [
                    { label: "Cancel" },
                    {
                        label: "Create admin",
                        className: "btn-primary",
                        onClick: async ({ close, button }) => {
                            const q = (s) => m.overlay.querySelector(s);
                            const errEl = q("#naErr");
                            const body = {
                                username: q("#naUser").value.trim(),
                                email: q("#naEmail").value.trim(),
                                password: q("#naPass").value,
                                role_level: q("#naRole").value
                            };
                            if (!body.username || !body.email || !body.password) {
                                errEl.textContent = "Fill in all fields.";
                                return;
                            }
                            button.disabled = true;
                            button.textContent = "Please wait…";
                            try {
                                const r = await Admin.api("/admins", { method: "POST", body });
                                Admin.toast(r.message, "success");
                                close();
                                load();
                            } catch (err) {
                                errEl.textContent = err.message;
                                button.disabled = false;
                                button.textContent = "Create admin";
                            }
                        }
                    }
                ]
            });
        }

        function changeRole(a) {
            const m = ui.modal({
                title: `Change role: ${a.username}`,
                body: `
                    <div class="field"><label for="crRole">Role</label><select id="crRole">${roleOptions(a.role_level)}</select></div>
                    <div class="form-msg error" id="crErr"></div>`,
                actions: [
                    { label: "Cancel" },
                    {
                        label: "Save role",
                        className: "btn-primary",
                        onClick: async ({ close, button }) => {
                            const errEl = m.overlay.querySelector("#crErr");
                            button.disabled = true;
                            try {
                                const r = await Admin.api(`/admins/${a.admin_id}/role`, {
                                    method: "POST",
                                    body: { role_level: m.overlay.querySelector("#crRole").value }
                                });
                                Admin.toast(r.message, "success");
                                close();
                                load();
                            } catch (err) {
                                errEl.textContent = err.message;
                                button.disabled = false;
                            }
                        }
                    }
                ]
            });
        }

        function changeStatus(a) {
            const suspend = a.status !== "Suspended";
            ui.reasonDialog({
                title: suspend ? "Suspend admin" : "Activate admin",
                message: suspend
                    ? `Suspend <strong>${esc(a.username)}</strong>? They are locked out immediately.`
                    : `Reactivate <strong>${esc(a.username)}</strong>?`,
                confirmLabel: suspend ? "Suspend" : "Activate",
                danger: suspend,
                askReason: false,
                onConfirm: async () => {
                    const r = await Admin.api(`/admins/${a.admin_id}/status`, {
                        method: "POST",
                        body: { status: suspend ? "Suspended" : "Active" }
                    });
                    Admin.toast(r.message, "success");
                    load();
                }
            });
        }

        el.querySelector("#adNew").addEventListener("click", newAdmin);
        bodyEl.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-act]");
            if (!btn) return;
            const a = items[Number(btn.dataset.i)];
            if (!a) return;
            if (btn.dataset.act === "role") changeRole(a);
            else changeStatus(a);
        });

        await load();
    });
})();