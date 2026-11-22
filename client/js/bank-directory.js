(async () => {
    const { $, $$, esc, api, guard, toast, modal, timeAgo } = SX;

    const me = await SX.boot("user");
    if (!me) return;
    SX.mountNav("banks");

    const acc = me.account;
    const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const TOKEN_KEY = "bloodLagbeToken";

    const css = document.createElement("style");
    css.textContent = `
        .bd-wrap{max-width:1000px;margin:22px auto 60px;padding:0 16px}
        .bd-title{font-size:24px;margin:0 0 4px}
        .bd-sub{color:var(--text2);font-size:14px;margin-bottom:16px}
        .bd-filters{display:grid;grid-template-columns:1fr 200px auto;gap:10px;margin-bottom:12px}
        .bd-filters .sx-field{margin:0}
        @media(max-width:700px){.bd-filters{grid-template-columns:1fr}}
        .bd-groups{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}
        .bd-g{padding:7px 14px;border-radius:20px;border:1px solid var(--border);background:var(--card2);font-weight:700;font-size:13px}
        .bd-g.on{background:var(--red);border-color:var(--red);color:#fff}
        .bd-list{display:grid;gap:14px}
        .bd-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px}
        .bd-card-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
        .bd-card-head h3{font-size:17px;margin:0 0 2px}
        .bd-meta{color:var(--text2);font-size:13px;display:flex;flex-wrap:wrap;gap:4px 14px}
        .bd-badge{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:var(--greensoft);color:var(--green)}
        .bd-stock{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin:14px 0}
        @media(max-width:640px){.bd-stock{grid-template-columns:repeat(4,1fr)}}
        .bd-unit{text-align:center;padding:8px 2px;border-radius:10px;background:var(--card2);border:1px solid var(--border)}
        .bd-unit b{display:block;font-size:13px}
        .bd-unit span{font-size:16px;font-weight:800}
        .bd-unit.Good span{color:var(--green)}
        .bd-unit.Low span{color:#f59e0b}
        .bd-unit.Critical span{color:var(--red)}
        .bd-unit.Out span{color:var(--muted)}
        .bd-unit.pick{border-color:var(--red);box-shadow:0 0 0 1px var(--red)}
        .bd-foot{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
        .bd-sec{margin:28px 0 10px;font-size:12px;letter-spacing:.7px;text-transform:uppercase;color:var(--text2)}
        .bd-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:var(--card);margin-bottom:10px}
        .bd-row-main{flex:1;min-width:0}
        .bd-row-main strong{display:block}
        .bd-row-main small{color:var(--text2)}
        .bd-pill{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:var(--card2);color:var(--text2);white-space:nowrap}
        .bd-pill.Pending{background:rgba(245,158,11,.16);color:#f59e0b}
        .bd-pill.Accepted,.bd-pill.Approved,.bd-pill.Reserved,.bd-pill.Issued,.bd-pill.Completed{background:var(--greensoft);color:var(--green)}
        .bd-pill.Cancelled,.bd-pill.Rejected,.bd-pill.Expired{background:var(--redsoft);color:var(--red)}
        .bd-modal{max-width:620px!important;max-height:92vh;overflow-y:auto}
        .bd-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
        .bd-grid .full{grid-column:1/-1}
        @media(max-width:560px){.bd-grid{grid-template-columns:1fr}}
        .bd-label{display:block;font-size:13px;font-weight:600;margin:0 0 4px;color:var(--text2)}
        .bd-err{display:block;font-size:12px;color:var(--red);margin:-8px 0 10px}
        .bd-err:empty{display:none}
        .sx-field.bad{border-color:var(--red)}
        .bd-avail{font-size:13px;padding:10px 12px;border-radius:12px;background:var(--card2);border:1px solid var(--border);margin-bottom:14px}
        .bd-avail.warn{border-color:#f59e0b}
        .bd-done{text-align:center;padding:10px 0}
        .bd-done .ico{font-size:46px;margin-bottom:8px}
    `;
    document.head.appendChild(css);

    const state = { q: "", district: "", group: "", pos: null, banks: [] };
    const root = $("#bdMain");
    root.innerHTML = `
        <h1 class="bd-title">🏥 Blood banks</h1>
        <p class="bd-sub">See live blood availability and request blood from an approved blood bank.</p>
        <div class="bd-filters">
            <input class="sx-field" id="bdSearch" placeholder="Search by name, area or address" autocomplete="off">
            <select class="sx-field" id="bdDistrict"><option value="">All districts</option></select>
            <button class="sx-btn" id="bdNear">📍 Nearest to me</button>
        </div>
        <div class="bd-groups" id="bdGroups"></div>
        <div class="bd-list" id="bdList"><div class="sx-empty">Loading…</div></div>
        <h2 class="bd-sec">Your requests to blood banks</h2>
        <div id="bdMine"></div>`;

    $("#bdGroups").innerHTML = [["", "All groups"], ...GROUPS.map((g) => [g, g])]
        .map(([v, l]) => `<button class="bd-g ${v === "" ? "on" : ""}" data-g="${v}">${l}</button>`).join("");

    const bankCard = (b) => `
        <article class="bd-card" data-bank="${b.bloodbank_id}">
            <div class="bd-card-head">
                <div>
                    <h3>${esc(b.name)}</h3>
                    <div class="bd-meta">
                        <span>📍 ${esc(b.upazila)}, ${esc(b.district)}</span>
                        ${b.distance_km !== null ? `<span>${b.distance_km} km away</span>` : ""}
                        ${b.hours ? `<span>🕘 ${esc(b.hours)}</span>` : ""}
                        ${b.phone ? `<span>📞 ${esc(b.phone)}</span>` : ""}
                    </div>
                </div>
                ${b.is_24x7 ? `<span class="bd-badge">24/7</span>` : ""}
            </div>
            <div class="bd-stock">
                ${b.groups.map((g) => `
                    <div class="bd-unit ${esc(g.level)} ${g.blood_group === state.group ? "pick" : ""}" title="${esc(g.level)}">
                        <b>${esc(g.blood_group)}</b><span>${g.units}</span>
                    </div>`).join("")}
            </div>
            <div class="bd-foot">
                <small class="sx-muted">${esc(b.address)}</small>
                <button class="sx-btn primary" data-request="${b.bloodbank_id}">Request blood</button>
            </div>
        </article>`;

    const loadBanks = guard(async () => {
        const p = new URLSearchParams();
        if (state.q) p.set("q", state.q);
        if (state.district) p.set("district", state.district);
        if (state.group) p.set("group", state.group);
        if (state.pos) { p.set("lat", state.pos.lat); p.set("lng", state.pos.lng); }
        const data = await api(`/banks?${p}`);
        state.banks = data.banks;

        const sel = $("#bdDistrict");
        if (sel.options.length === 1) {
            data.districts.forEach((d) => sel.insertAdjacentHTML("beforeend", `<option value="${esc(d)}">${esc(d)}</option>`));
        }
        $("#bdList").innerHTML = data.banks.length
            ? data.banks.map(bankCard).join("")
            : `<div class="sx-empty">${state.group ? `No blood bank currently has ${esc(state.group)} in stock for this search.` : "No blood banks found."}</div>`;
    });

    let timer;
    $("#bdSearch").addEventListener("input", (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = e.target.value.trim(); loadBanks(); }, 300);
    });
    $("#bdDistrict").addEventListener("change", (e) => { state.district = e.target.value; loadBanks(); });
    $("#bdGroups").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-g]");
        if (!btn) return;
        state.group = btn.dataset.g;
        $$(".bd-g").forEach((b) => b.classList.toggle("on", b === btn));
        loadBanks();
    });
    $("#bdNear").addEventListener("click", () => {
        if (state.pos) { state.pos = null; $("#bdNear").textContent = "📍 Nearest to me"; loadBanks(); return; }
        if (!navigator.geolocation) { toast("Location is not available in this browser."); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                state.pos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                $("#bdNear").textContent = "✕ Clear location";
                loadBanks();
            },
            () => toast("Could not get your location. Please allow location access.")
        );
    });

    // ---------------- request form ----------------
    const today = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const field = (label, name, html, full = false) => `
        <div class="${full ? "full" : ""}">
            <label class="bd-label" for="bd_${name}">${label}</label>
            ${html}
            <small class="bd-err" data-err="${name}"></small>
        </div>`;
    const input = (name, type = "text", extra = "") =>
        `<input class="sx-field" id="bd_${name}" name="${name}" type="${type}" ${extra}>`;

    const openRequestForm = (bank) => {
        const m = modal(`
            <h3>Request blood from ${esc(bank.name)}</h3>
            <p>The blood bank will review your request and reply here. Please give accurate details.</p>
            <div class="bd-avail" id="bdAvail"></div>
            <div class="bd-grid">
                ${field("Blood group needed", "blood_group", `<select class="sx-field" id="bd_blood_group" name="blood_group">${GROUPS.map((g) => `<option ${g === (state.group || acc.blood_group) ? "selected" : ""}>${g}</option>`).join("")}</select>`)}
                ${field("Units required", "units_required", input("units_required", "number", 'min="1" max="10" value="1"'))}
                ${field("Urgency", "urgency_level", `<select class="sx-field" id="bd_urgency_level" name="urgency_level"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select>`)}
                ${field("Needed by", "required_date", input("required_date", "date", `min="${today()}" value="${today()}"`))}
                ${field("Patient name", "patient_name", input("patient_name", "text", 'maxlength="100"'))}
                ${field("Patient age (optional)", "patient_age", input("patient_age", "number", 'min="0" max="120"'))}
                ${field("Hospital name", "hospital_name", input("hospital_name", "text", 'maxlength="150"'))}
                ${field("Contact person", "contact_person", input("contact_person", "text", `maxlength="100" value="${esc(acc.full_name || "")}"`))}
                ${field("Contact number", "contact_number", input("contact_number", "tel", `placeholder="01XXXXXXXXX" value="${esc(acc.phone || "")}"`))}
                ${field("Hospital address", "hospital_address", `<textarea class="sx-field" id="bd_hospital_address" name="hospital_address" rows="2" maxlength="500"></textarea>`, true)}
                ${field("Note (optional)", "note", `<textarea class="sx-field" id="bd_note" name="note" rows="2" maxlength="500" placeholder="Ward, bed number, doctor's name…"></textarea>`, true)}
            </div>
            <div class="sx-modal-actions">
                <button class="sx-btn" data-cancel>Cancel</button>
                <button class="sx-btn primary" data-send>Send request</button>
            </div>`);
        m.el.classList.add("bd-modal");

        const paintAvail = () => {
            const g = $("#bd_blood_group", m.el).value;
            const units = Number($("#bd_units_required", m.el).value) || 0;
            const have = bank.groups.find((x) => x.blood_group === g)?.units || 0;
            const box = $("#bdAvail", m.el);
            const short = have < units;
            box.classList.toggle("warn", short);
            box.textContent = have === 0
                ? `${bank.name} has no ${g} in stock right now. You can still send the request and the bank may arrange it.`
                : short
                    ? `${bank.name} has ${have} unit${have === 1 ? "" : "s"} of ${g}, fewer than the ${units} you need. You can still send the request.`
                    : `${bank.name} currently has ${have} unit${have === 1 ? "" : "s"} of ${g} available.`;
        };
        paintAvail();
        $("#bd_blood_group", m.el).addEventListener("change", paintAvail);
        $("#bd_units_required", m.el).addEventListener("input", paintAvail);

        const showErrors = (errors = {}) => {
            $$("[data-err]", m.el).forEach((el) => { el.textContent = errors[el.dataset.err] || ""; });
            $$(".sx-field", m.el).forEach((el) => el.classList.toggle("bad", !!errors[el.name]));
        };

        m.el.addEventListener("click", async (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            if (btn.hasAttribute("data-cancel")) { m.close(); return; }
            if (!btn.hasAttribute("data-send")) return;

            const body = {};
            $$("[name]", m.el).forEach((el) => { body[el.name] = el.value.trim(); });
            showErrors();
            btn.disabled = true;
            try {
                const res = await fetch(`/api/social/banks/${bank.bloodbank_id}/requests`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
                    body: JSON.stringify(body)
                });
                if (res.status === 401) { toast("Session expired. Please log in again."); return; }
                const data = await res.json().catch(() => ({}));
                if (res.status === 400 && data.errors) { showErrors(data.errors); toast(data.message); return; }
                if (!res.ok || data.success === false) { toast(data.message || "Could not send your request."); return; }

                m.el.innerHTML = `
                    <div class="bd-done">
                        <div class="ico">✅</div>
                        <h3>Request sent</h3>
                        <p class="sx-muted" style="margin:8px 0 18px">${esc(data.message)} You will be notified when ${esc(bank.name)} responds.</p>
                        <button class="sx-btn primary" data-close>Done</button>
                    </div>`;
                $("[data-close]", m.el).addEventListener("click", m.close);
                loadMine();
            } catch (error) {
                toast("Network error. Please try again.");
            } finally {
                btn.disabled = false;
            }
        });
    };

    $("#bdList").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-request]");
        if (!btn) return;
        const bank = state.banks.find((b) => b.bloodbank_id === Number(btn.dataset.request));
        if (bank) openRequestForm(bank);
    });

    // ---------------- my requests ----------------
    const statusLabel = (r) => {
    if (r.status === "Pending") return "Waiting for the bank";
    if (r.status === "Accepted") return Number(r.reserved_units) > 0 ? "Reserved for you" : "Approved";
    if (r.status === "Completed") return "Issued";
    return r.status;
};
    const loadMine = guard(async () => {
        const data = await api("/bank-requests/mine");
        $("#bdMine").innerHTML = data.requests.length
            ? data.requests.map((r) => `
                <div class="bd-row">
                    <div class="bd-row-main">
                        <strong>${r.units_required} × ${esc(r.blood_group)} · ${esc(r.bank_name)}</strong>
                        <small>For ${esc(r.patient_name)} at ${esc(r.hospital_name)} · needed by ${esc(r.required_date)} · sent ${timeAgo(r.created_at)}</small>
                                                ${r.bank_note && ["Accepted", "Completed"].includes(r.status) ? `<br><small>Message from the bank: ${esc(r.bank_note)}</small>` : ""}
                        ${r.status_reason && r.status !== "Pending" ? `<br><small>${esc(r.status_reason)}</small>` : ""}
                    </div>
                    <span class="bd-pill ${esc(r.status)}">${esc(statusLabel(r))}</span>
                    ${["Pending", "Accepted"].includes(r.status) ? `<button class="sx-btn sm danger" data-cancel="${r.request_id}">Cancel</button>` : ""}
                </div>`).join("")
            : `<div class="sx-empty">You have not requested blood from a blood bank yet.</div>`;
    });
    $("#bdMine").addEventListener("click", guard(async (e) => {
        const btn = e.target.closest("[data-cancel]");
        if (!btn) return;
        if (!window.confirm("Cancel this request?")) return;
        await api(`/bank-requests/${btn.dataset.cancel}/cancel`, { method: "POST" });
        toast("Request cancelled.", "success");
        loadMine();
    }));

    SX.on("notification", (n) => { if (/^bank_request/.test(n.type)) { loadMine(); loadBanks(); } });

    loadBanks();
    loadMine();
})();