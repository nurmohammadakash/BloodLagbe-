(() => {
    if (!window.SX) return;

    const { esc, modal, toast, api } = SX;
    const GROUPS = SX.GROUPS || ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const TOKEN_KEY = "bloodLagbeToken";

    const injectCss = () => {
        if (document.getElementById("cf-css")) return;
        const style = document.createElement("style");
        style.id = "cf-css";
        style.textContent = `
            .cf-modal{max-width:600px!important;max-height:92vh;overflow-y:auto}
            .cf-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
            .cf-grid .cf-full{grid-column:1/-1}
            @media(max-width:560px){.cf-grid{grid-template-columns:1fr}}
            .cf-label{display:block;font-size:13px;font-weight:600;margin:0 0 4px;color:var(--text2)}
            .cf-hint{display:block;font-size:12px;color:var(--text2);margin:-6px 0 10px}
            .cf-err{display:block;font-size:12px;color:var(--red);margin:-8px 0 10px}
            .cf-err:empty{display:none}
            .sx-field.cf-bad{border-color:var(--red)}
            .cf-banner{font-size:13px;color:var(--text2);background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:14px}
            .cf-check{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--text2);margin:4px 0 2px}
            .cf-check input{margin-top:3px}
            .cf-result{text-align:center;padding:10px 0}
            .cf-result .cf-icon{font-size:46px;margin-bottom:8px}
            .cf-result h3{margin-bottom:8px}
            .cf-result p{color:var(--text2);font-size:14px;margin-bottom:18px}
        `;
        document.head.appendChild(style);
    };

    const post = async (path, body) => {
        const res = await fetch(`/api/social${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
            body: JSON.stringify(body)
        });
        let data = {};
        try { data = await res.json(); } catch { data = {}; }
        return { status: res.status, data };
    };

    const control = (label, name, html, { hint = "", full = false } = {}) => `
        <div class="${full ? "cf-full" : ""}">
            <label class="cf-label" for="cf_${name}">${label}</label>
            ${html}
            ${hint ? `<small class="cf-hint">${hint}</small>` : ""}
            <small class="cf-err" data-err="${name}"></small>
        </div>`;

    const text = (name, value, type = "text", extra = "") =>
        `<input class="sx-field" id="cf_${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;

    const yesNo = (name) =>
        `<select class="sx-field" id="cf_${name}" name="${name}"><option value="">Select…</option><option value="No">No</option><option value="Yes">Yes</option></select>`;

    const groupSelect = (selected) =>
        `<select class="sx-field" id="cf_blood_group" name="blood_group">${GROUPS.map((g) => `<option value="${g}" ${g === selected ? "selected" : ""}>${g}</option>`).join("")}</select>`;

    const today = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const resultScreen = (m, icon, title, message, buttons) => {
        m.el.innerHTML = `
            <div class="cf-result">
                <div class="cf-icon">${icon}</div>
                <h3>${esc(title)}</h3>
                <p>${esc(message)}</p>
                <div class="sx-modal-actions" style="justify-content:center">${buttons}</div>
            </div>`;
        m.el.querySelector("[data-close]")?.addEventListener("click", m.close);
    };

    const showErrors = (m, errors) => {
        m.el.querySelectorAll(".cf-err").forEach((e) => { e.textContent = ""; });
        m.el.querySelectorAll(".cf-bad").forEach((e) => e.classList.remove("cf-bad"));
        let first = null;
        Object.entries(errors).forEach(([name, message]) => {
            const slot = m.el.querySelector(`[data-err="${name}"]`);
            if (slot) slot.textContent = message;
            const field = m.el.querySelector(`[name="${name}"]`);
            if (field) {
                field.classList.add("cf-bad");
                if (!first) first = field;
            }
        });
        if (first) first.scrollIntoView({ block: "center", behavior: "smooth" });
    };

    const collect = (m, role, ownerId) => {
        const val = (name) => (m.el.querySelector(`[name="${name}"]`)?.value ?? "").trim();
        const body = {
            owner_id: ownerId,
            full_name: val("full_name"),
            father_name: val("father_name"),
            mother_name: val("mother_name"),
            address: val("address"),
            blood_group: val("blood_group"),
            mobile: val("mobile"),
            email: val("email"),
            nid: val("nid"),
            consent: !!m.el.querySelector('[name="consent"]')?.checked
        };
        if (role === "Donor") {
            body.last_donation_date = val("last_donation_date");
            body.previous_donations = val("previous_donations");
            body.has_blood_disease = val("has_blood_disease");
        } else {
            body.illness_reason = val("illness_reason");
            body.received_before = val("received_before");
        }
        return body;
    };

    const openConnectionForm = async (ownerId, { onDone } = {}) => {
        injectCss();

        let info;
        try {
            info = await api(`/connections/form/${ownerId}`);
        } catch (error) {
            toast(error.message);
            return;
        }

        const { role, note, owner, prefill, existing } = info;
        const m = modal("");
        m.el.classList.add("cf-modal");

        if (existing) {
            resultScreen(
                m, "ℹ️", "You already responded",
                `You have already sent your details to ${owner.full_name} (status: ${existing.status}).`,
                `<a class="sx-btn primary" href="/connection?id=${existing.connection_id}">View request</a><button class="sx-btn" data-close>Close</button>`
            );
            return;
        }

        const donor = role === "Donor";
        const profileLink = `<a class="sx-name" href="/profile?u=${encodeURIComponent(owner.username)}">${esc(owner.full_name)}</a>`;

        m.el.innerHTML = `
            <h3>${donor ? "🩸 Donate blood" : "🙏 Request blood"}</h3>
            <p style="margin-bottom:10px">${donor
                ? `${profileLink} needs <b>${esc(note.blood_group)}</b> blood.`
                : `${profileLink} has <b>${esc(note.blood_group)}</b> blood available.`}</p>
            <div class="cf-banner">Fill in this form so ${esc(owner.full_name.split(" ")[0])} can check your details before confirming. Your NID is never shown in full to other users.</div>
            <div class="cf-grid">
                ${control("Full Name", "full_name", text("full_name", prefill.full_name, "text", 'maxlength="100"'))}
                ${control("Blood Group", "blood_group", groupSelect(prefill.blood_group))}
                ${control("Father's Name", "father_name", text("father_name", "", "text", 'maxlength="100"'))}
                ${control("Mother's Name", "mother_name", text("mother_name", "", "text", 'maxlength="100"'))}
                ${control("Current Address", "address", text("address", prefill.address, "text", 'maxlength="255"'), { full: true })}
                ${control("Mobile Number", "mobile", text("mobile", prefill.mobile, "tel", 'maxlength="20"'))}
                ${control("Email Address", "email", text("email", prefill.email, "email", 'maxlength="100"'))}
                ${control("NID Number", "nid", text("nid", "", "text", 'maxlength="20" inputmode="numeric"'), { hint: "10, 13 or 17 digits", full: true })}
                ${donor ? `
                    ${control("Date of Last Donation", "last_donation_date", text("last_donation_date", "", "date", `max="${today()}"`), { hint: "Leave blank if you have never donated" })}
                    ${control("Number of Previous Donations", "previous_donations", text("previous_donations", "0", "number", 'min="0" max="500"'))}
                    ${control("Do you have any blood related disease?", "has_blood_disease", yesNo("has_blood_disease"), { full: true })}
                ` : `
                    ${control("Disease or Sickness Requiring Blood", "illness_reason", text("illness_reason", "", "text", 'maxlength="500"'), { full: true })}
                    ${control("Have you received blood before?", "received_before", yesNo("received_before"), { full: true })}
                `}
            </div>
            <label class="cf-check"><input type="checkbox" name="consent"><span>I confirm my information is true and agree to share these details with ${esc(owner.full_name)}.</span></label>
            <small class="cf-err" data-err="consent"></small>
            <div class="sx-modal-actions" style="margin-top:14px">
                <button class="sx-btn" data-close>Cancel</button>
                <button class="sx-btn primary" data-submit>Submit</button>
            </div>`;

        m.el.querySelector("[data-close]").addEventListener("click", m.close);
                // check the NID against the national records as soon as the person leaves the box
        const nidBox = m.el.querySelector('[name="nid"]');
        const nidMsg = m.el.querySelector('[data-err="nid"]');
        nidBox.addEventListener("blur", async () => {
            if (!nidBox.value.trim()) return;
            try {
                const r = await fetch(`/api/social/connections/nid-check?nid=${encodeURIComponent(nidBox.value.trim())}&name=${encodeURIComponent((m.el.querySelector('[name="full_name"]').value || '').trim())}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
                });
                const d = await r.json();
                nidMsg.textContent = d.valid ? "" : (d.message || "");
                nidBox.classList.toggle("cf-bad", !d.valid);
            } catch { /* the submit button repeats the check on the server */ }
        });
        const submitBtn = m.el.querySelector("[data-submit]");
        submitBtn.addEventListener("click", async () => {
            submitBtn.disabled = true;
            submitBtn.textContent = "Submitting…";
            try {
                const { status, data } = await post("/connections", collect(m, role, ownerId));

                if (status === 401) { SX.logout(true); return; }

                if (data.success && data.outcome === "submitted") {
                    resultScreen(m, "✅", "Request sent", data.message,
                        `<button class="sx-btn primary" data-close>Done</button>`);
                    if (onDone) onDone(data);
                } else if (data.success && data.outcome === "rejected") {
                    resultScreen(m, "🚫", "Not eligible right now", data.message,
                        `<button class="sx-btn primary" data-close>Close</button>`);
                } else if (data.errors) {
                    showErrors(m, data.errors);
                    toast(data.message || "Please fix the highlighted fields.");
                } else {
                    toast(data.message || "Something went wrong.");
                }
            } catch {
                toast("Network error. Please try again.");
            } finally {
                if (submitBtn.isConnected) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Submit";
                }
            }
        });
    };

    SX.openConnectionForm = openConnectionForm;
})();