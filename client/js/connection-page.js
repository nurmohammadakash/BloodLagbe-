(async () => {
    const { $, esc, api, guard, toast, avatar, modal, timeAgo } = SX;

    const me = await SX.boot("user");
    if (!me) return;
    SX.mountNav("connections");

    const css = document.createElement("style");
    css.textContent = `
        .cn-wrap{max-width:880px;margin:22px auto 60px;padding:0 16px}
        .cn-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:6px 0 14px}
        .cn-head h1{font-size:22px;margin:0}
        .cn-back{display:inline-block;color:var(--text2);font-size:14px;margin-bottom:4px}
        .cn-sec{margin:22px 0 8px;font-size:12px;letter-spacing:.7px;text-transform:uppercase;color:var(--text2)}
        .cn-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:var(--card);margin-bottom:10px;color:inherit;text-decoration:none}
        .cn-row:hover{border-color:var(--red)}
        .cn-row-main{flex:1;min-width:0}
        .cn-row-main strong{display:block}
        .cn-row-main small{color:var(--text2)}
        .cn-pill{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:var(--card2);color:var(--text2);white-space:nowrap}
        .cn-pill.Submitted{background:rgba(245,158,11,.16);color:#f59e0b}
        .cn-pill.Pending{background:rgba(59,130,246,.16);color:#3b82f6}
        .cn-pill.Successful{background:rgba(34,197,94,.16);color:var(--green)}
        .cn-pill.Declined,.cn-pill.Closed,.cn-pill.Cancelled,.cn-pill.Rejected{background:var(--redsoft);color:var(--red)}
        .cn-steps{display:flex;gap:6px;margin:4px 0 18px}
        .cn-step{flex:1;text-align:center;font-size:12px;padding:8px 4px;border-radius:10px;background:var(--card2);color:var(--text2)}
        .cn-step.done{background:var(--redsoft);color:var(--red);font-weight:700}
        .cn-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        @media(max-width:700px){.cn-grid{grid-template-columns:1fr}}
        .cn-kv{display:grid;grid-template-columns:140px 1fr;gap:7px 12px;font-size:14px;margin:0}
        .cn-kv dt{color:var(--text2)}
        .cn-kv dd{margin:0;word-break:break-word}
        .cn-banner{padding:12px 14px;border-radius:12px;background:var(--card2);border:1px solid var(--border);margin-bottom:14px;font-size:14px}
        .cn-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
        .cn-stars{display:flex;gap:6px;margin:6px 0 10px}
        .cn-stars button{background:none;border:0;font-size:32px;line-height:1;color:var(--muted);cursor:pointer;transition:.15s}
        .cn-stars button.on{color:var(--gold)}
        .cn-review{margin:8px 0;font-size:14px}
        .cn-review .cn-star-line{color:var(--gold);letter-spacing:2px}
        .cf-err{display:block;font-size:12px;color:var(--red);margin:4px 0 8px}
        .cf-err:empty{display:none}
    `;
    document.head.appendChild(css);

    const root = $("#cnMain");
    const idParam = Number(new URLSearchParams(window.location.search).get("id"));
    const STATUS_LABEL = {
        Submitted: "Waiting for answer", Pending: "In progress", Successful: "Successful",
        Declined: "Declined", Closed: "Closed", Cancelled: "Cancelled", Rejected: "Not eligible"
    };

    const pill = (status) => `<span class="cn-pill ${esc(status)}">${esc(STATUS_LABEL[status] || status)}</span>`;
    const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
    const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
    const kv = (rows) => `<dl class="cn-kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;

    const ask = ({ title, message, label, danger = false, reason = false }) => new Promise((resolve) => {
        const m = modal(`
            <h3>${esc(title)}</h3>
            <p>${esc(message)}</p>
            ${reason ? `<textarea class="sx-field" id="cnReason" rows="3" maxlength="255" placeholder="Reason (required)"></textarea><small class="cf-err" id="cnReasonErr"></small>` : ""}
            <div class="sx-modal-actions">
                <button class="sx-btn" data-no>Back</button>
                <button class="sx-btn ${danger ? "danger" : "primary"}" data-yes>${esc(label)}</button>
            </div>`);
        m.el.querySelector("[data-no]").addEventListener("click", () => { m.close(); resolve(null); });
        m.el.querySelector("[data-yes]").addEventListener("click", () => {
            const value = reason ? m.el.querySelector("#cnReason").value.trim() : "";
            if (reason && value.length < 3) {
                m.el.querySelector("#cnReasonErr").textContent = "Please write a short reason.";
                return;
            }
            m.close();
            resolve({ reason: value });
        });
    });

    const describe = (c) => {
        const donor = c.applicant_role === "Donor";
        if (c.my_side === "owner") {
            return donor
                ? `${c.applicant_name} wants to donate ${c.note_blood_group} blood to you`
                : `${c.applicant_name} wants to receive blood from you`;
        }
        return donor ? `You offered to donate to ${c.owner_name}` : `You asked ${c.owner_name} for blood`;
    };

    const showList = async () => {
        const data = await api("/connections/mine");
        const groups = [
            ["Waiting for your answer", (c) => c.my_side === "owner" && c.status === "Submitted"],
            ["In progress", (c) => c.status === "Pending" || (c.my_side === "applicant" && c.status === "Submitted")],
            ["Completed", (c) => c.status === "Successful"],
            ["Closed", (c) => ["Declined", "Closed", "Cancelled", "Rejected"].includes(c.status)]
        ];

        const row = (c) => {
            const owner = c.my_side === "owner";
            const name = owner ? c.applicant_name : c.owner_name;
            const pic = owner ? c.applicant_picture : c.owner_picture;
            return `
                <a class="cn-row" href="/connection?id=${c.connection_id}">
                    ${avatar(name, pic, "md")}
                    <div class="cn-row-main">
                        <strong>${esc(name)}</strong>
                        <small>${esc(describe(c))} · ${timeAgo ? esc(timeAgo(c.created_at)) : ""}</small>
                    </div>
                    ${pill(c.status)}
                </a>`;
        };

        const html = groups.map(([title, test]) => {
            const items = data.connections.filter(test);
            return items.length ? `<h2 class="cn-sec">${esc(title)} (${items.length})</h2>${items.map(row).join("")}` : "";
        }).join("");

        root.innerHTML = `
            <div class="cn-head"><h1>🩸 Blood connections</h1></div>
            ${html || `<div class="sx-card sx-empty">No blood connections yet. Click someone's note on your dashboard to offer or request blood.</div>`}`;
    };

    const steps = (c, reviewStarted) => {
        const done = c.status === "Successful" ? 4 : c.status === "Pending" ? (reviewStarted ? 3 : 2) : 1;
        return `<div class="cn-steps">${["Requested", "Confirmed", "Reviews", "Successful"].map((label, i) =>
            `<div class="cn-step ${i < done ? "done" : ""}">${i + 1}. ${label}</div>`).join("")}</div>`;
    };

    const detailRows = (a, role) => {
        const rows = [
            ["Full name", esc(a.full_name)],
            ["Father's name", esc(a.father_name)],
            ["Mother's name", esc(a.mother_name)],
            ["Address", esc(a.address)],
            ["Blood group", esc(a.blood_group)],
            ["Mobile", esc(a.mobile)],
            ["Email", esc(a.email)],
            ["NID", esc(a.nid_masked)]
        ];
        if (role === "Donor") {
            rows.push(
                ["Last donation", a.last_donation_date ? esc(fmtDate(a.last_donation_date)) : "Never donated"],
                ["Previous donations", esc(a.previous_donations)],
                ["Blood related disease", esc(a.has_blood_disease)]
            );
        } else {
            rows.push(
                ["Reason for blood", esc(a.illness_reason)],
                ["Received blood before", esc(a.received_before)]
            );
        }
        return rows;
    };

    const reviewLine = (label, r) => `
        <div class="cn-review"><strong>${esc(label)}</strong><div class="cn-star-line">${stars(r.stars)}</div>${r.comment ? `<div>${esc(r.comment)}</div>` : ""}</div>`;

    const showDetail = async (id) => {
        let c;
        try {
            c = (await api(`/connections/${id}`)).connection;
        } catch (error) {
            root.innerHTML = `
                <a class="cn-back" href="/connection">← All connections</a>
                <div class="sx-card sx-empty">${esc(error.message)}</div>`;
            return;
        }

        const owner = c.my_side === "owner";
        const other = owner ? c.applicant : c.owner;
        const donor = c.applicant_role === "Donor";
        const hasDetails = c.applicant.father_name !== undefined;
        const reviewStarted = !!c.my_review || c.other_reviewed;
        const summary = owner
            ? (donor ? `${c.applicant.full_name} wants to donate ${c.note_blood_group} blood to you.` : `${c.applicant.full_name} wants to receive blood from you.`)
            : (donor ? `You offered to donate blood to ${c.owner.full_name}.` : `You asked ${c.owner.full_name} for blood.`);

        const banner = {
            Declined: owner ? "You declined this request." : "The note owner declined your request.",
            Closed: "The note owner chose another person for this note.",
            Cancelled: "This connection was cancelled.",
            Rejected: "Your application was not accepted."
        }[c.status];

        let html = `
            <a class="cn-back" href="/connection">← All connections</a>
            <div class="cn-head"><h1>Blood connection</h1>${pill(c.status)}</div>
            <p style="margin:0 0 14px;color:var(--text2)">${esc(summary)}</p>`;

        if (["Submitted", "Pending", "Successful"].includes(c.status)) html += steps(c, reviewStarted);
        if (banner) html += `<div class="cn-banner">${esc(banner)}${c.status_reason ? ` <b>Reason:</b> ${esc(c.status_reason)}` : ""}</div>`;

        html += `<div class="cn-grid">`;
        html += `<section class="sx-card"><h3>${owner ? "Applicant details" : "Your submitted details"}</h3>${
            hasDetails ? kv(detailRows(c.applicant, c.applicant_role)) : `<p class="sx-muted">These details are no longer shared.</p>`}</section>`;

        if (["Pending", "Successful"].includes(c.status)) {
            const o = owner ? c.applicant : c.owner;
            html += `<section class="sx-card"><h3>Contact ${esc(o.full_name)}</h3>${kv([
                ["Mobile", esc(owner ? c.applicant.mobile : c.owner.mobile)],
                ["Email", esc(owner ? c.applicant.email : c.owner.email)]
            ])}<p class="sx-muted" style="margin-top:10px;font-size:13px">Arrange the donation directly. After it is done, both of you review each other to complete the connection.</p></section>`;
        } else if (c.status === "Submitted") {
            html += `<section class="sx-card"><h3>${owner ? "Your answer" : "Status"}</h3><p class="sx-muted">${owner
                ? "Check the details and confirm if you want to go ahead. If you confirm, other waiting requests for your note will be closed."
                : `Waiting for ${esc(c.owner.full_name)} to respond. You will get a notification.`}</p></section>`;
        }
        html += `</div>`;

        if (c.permissions.can_respond) {
            html += `<div class="cn-actions"><button class="sx-btn green" data-act="confirm">✔ Confirm</button><button class="sx-btn danger" data-act="decline">Decline</button></div>`;
        }

        if (c.status === "Pending") {
            html += `<section class="sx-card" style="margin-top:14px"><h3>Review</h3>`;
            if (c.permissions.can_review) {
                html += `${c.other_reviewed ? `<p class="sx-muted">${esc(other.full_name)} has reviewed you. Please review them to complete the connection.</p>` : `<p class="sx-muted">After the blood donation, rate your experience with ${esc(other.full_name)}.</p>`}
                    <div class="cn-stars" id="cnStars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} star">★</button>`).join("")}</div>
                    <textarea class="sx-field" id="cnComment" rows="3" maxlength="300" placeholder="Write a short comment (optional)"></textarea>
                    <div class="cn-actions"><button class="sx-btn primary" data-act="review">Submit review</button></div>`;
            } else if (c.my_review) {
                html += reviewLine("Your review", c.my_review) + `<p class="sx-muted">Waiting for ${esc(other.full_name)} to review you. The connection completes after both reviews.</p>`;
            }
            html += `</section>`;
        }

        if (c.status === "Successful") {
            html += `<section class="sx-card" style="margin-top:14px"><h3>🎉 Connection successful</h3>
                ${c.my_review ? reviewLine("Your review", c.my_review) : ""}
                ${c.other_review ? reviewLine(`${other.full_name}'s review`, c.other_review) : ""}</section>`;
        }

        if (c.permissions.can_cancel) {
            html += `<div class="cn-actions" style="margin-top:14px"><button class="sx-btn danger sm" data-act="cancel">${c.status === "Submitted" ? "Withdraw request" : "Cancel connection"}</button></div>`;
        }

        root.innerHTML = html;

        let chosen = 0;
        const paint = () => root.querySelectorAll("[data-star]").forEach((b) => b.classList.toggle("on", Number(b.dataset.star) <= chosen));
        root.querySelectorAll("[data-star]").forEach((b) => b.addEventListener("click", () => { chosen = Number(b.dataset.star); paint(); }));

        const run = (path, body, okMessage) => guard(async () => {
            await api(`/connections/${id}/${path}`, { method: "POST", body });
            if (okMessage) toast(okMessage, "success");
            await showDetail(id);
        })();

        root.querySelectorAll("[data-act]").forEach((btn) => btn.addEventListener("click", async () => {
            const act = btn.dataset.act;
            if (act === "confirm") {
                const r = await ask({ title: "Confirm this person?", message: `You will be connected with ${c.applicant.full_name}. Other waiting requests for your note will be closed.`, label: "Confirm" });
                if (r) run("respond", { action: "confirm" }, "Connection confirmed. Contact details are now visible to both of you.");
            } else if (act === "decline") {
                const r = await ask({ title: "Decline this request?", message: `${c.applicant.full_name} will be told you declined.`, label: "Decline", danger: true });
                if (r) run("respond", { action: "decline" }, "Request declined.");
            } else if (act === "cancel") {
                const pending = c.status === "Pending";
                const r = await ask({
                    title: pending ? "Cancel this connection?" : "Withdraw your request?",
                    message: pending ? `${other.full_name} will be notified.` : "The note owner will no longer see your details.",
                    label: pending ? "Cancel connection" : "Withdraw", danger: true, reason: pending
                });
                if (r) run("cancel", { reason: r.reason }, "Connection cancelled.");
            } else if (act === "review") {
                if (!chosen) { toast("Please choose a star rating."); return; }
                run("review", { stars: chosen, comment: ($("#cnComment").value || "").trim() }, null);
            }
        }));
    };

    const load = () => (idParam ? showDetail(idParam) : showList());
    await guard(load)();

    SX.on("notification", (n) => { if (/^connection_/.test(n.type)) guard(load)(); });
})();