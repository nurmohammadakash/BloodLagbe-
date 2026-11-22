(() => {
    if (!window.AdminShell) return;

    const esc = Admin.escape;

    AdminShell.register("settings", async (el) => {
        const me = Admin.admin() || {};

        el.innerHTML = `
            <div class="page-head"><h1>Settings</h1><p>Your admin account and password.</p></div>
            <div class="grid-2">
                <div class="card">
                    <h3>Profile</h3>
                    <div class="field"><label>Username</label><input type="text" value="${esc(me.username)}" disabled></div>
                    <div class="field"><label>Email</label><input type="text" value="${esc(me.email)}" disabled></div>
                    <div class="field"><label>Role</label><input type="text" value="${esc(me.role_level)}" disabled></div>
                </div>
                <div class="card">
                    <h3>Change password</h3>
                    <div class="field"><label for="pwCurrent">Current password</label><input type="password" id="pwCurrent" autocomplete="current-password"></div>
                    <div class="field"><label for="pwNew">New password</label><input type="password" id="pwNew" autocomplete="new-password"></div>
                    <div class="field"><label for="pwConfirm">Confirm new password</label><input type="password" id="pwConfirm" autocomplete="new-password"></div>
                    <div class="form-msg" id="pwMsg"></div>
                    <button class="btn btn-primary" id="pwSave">Update password</button>
                </div>
            </div>`;

        const msg = el.querySelector("#pwMsg");
        const btn = el.querySelector("#pwSave");
        const setMsg = (text, type) => { msg.textContent = text; msg.className = `form-msg ${type || ""}`; };

        btn.addEventListener("click", async () => {
            const currentPassword = el.querySelector("#pwCurrent").value;
            const newPassword = el.querySelector("#pwNew").value;
            const confirm = el.querySelector("#pwConfirm").value;

            if (!currentPassword || !newPassword || !confirm) return setMsg("Fill in all three fields.", "error");
            if (newPassword !== confirm) return setMsg("New passwords do not match.", "error");

            btn.disabled = true;
            setMsg("Saving…");
            try {
                const res = await Admin.api("/settings/change-password", {
                    method: "POST",
                    body: { currentPassword, newPassword }
                });
                setMsg(res.message, "success");
                Admin.toast(res.message, "success");
                ["#pwCurrent", "#pwNew", "#pwConfirm"].forEach((s) => { el.querySelector(s).value = ""; });
            } catch (err) {
                setMsg(err.message, "error");
            } finally {
                btn.disabled = false;
            }
        });
    });
})();