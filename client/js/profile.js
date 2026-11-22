(async () => {
    const { $, $$, esc, api, guard, toast, avatar, renderPost, timeAgo } = SX;

    const me = await SX.boot();
    if (!me) return;

    const params = new URLSearchParams(window.location.search);
    let username = params.get("u");
    if (!username) {
        if (me.account_type === "bloodbank") {
            window.location.replace("/bloodbank/dashboard");
            return;
        }
        username = me.account.username;
    }

    SX.mountNav("");

    const PAGE = 10;
    const state = { data: null, tab: (window.location.hash || "#posts").slice(1), before: 0 };
    const fmt = (v, opts) => new Date(v).toLocaleDateString(undefined, opts || { day: "numeric", month: "short", year: "numeric" });
    const starText = (avg) => { const n = Math.round(avg || 0); return "★".repeat(n) + "☆".repeat(5 - n); };
    const noteClass = (note) => note.note_type.toLowerCase();

    const actionsHTML = () => {
        const { relation, profile: p, rateable_exchange: rateable } = state.data;
        if (relation === "self") {
            return `<button class="sx-btn primary" data-do="need">🩸 Need Blood</button>
                    <button class="sx-btn green" data-do="available">✅ Available</button>
                    ${p.note ? `<button class="sx-btn" data-do="clear-note">Remove note</button>` : ""}`;
        }
        if (relation === "bloodbank") return "";

        let friend = "";
        if (relation === "friends") friend = `<button class="sx-btn" data-do="unfriend">✓ Friends</button>`;
        else if (relation === "request_sent") friend = `<button class="sx-btn" data-do="cancel">Cancel request</button>`;
        else if (relation === "request_received") friend = `<button class="sx-btn primary" data-do="accept">Confirm request</button><button class="sx-btn" data-do="reject">Delete</button>`;
        else friend = `<button class="sx-btn primary" data-do="add">➕ Add friend</button>`;

        return `${friend}
                <button class="sx-btn" data-do="donation">🩸 Record donation</button>
                ${rateable ? `<button class="sx-btn green" data-do="rate">⭐ Rate</button>` : ""}`;
    };

    const renderHead = () => {
        const { profile: p, relation } = state.data;
        const self = relation === "self";
        document.title = `${p.full_name} | Blood-Lagbe`;

        $("#pfHead").innerHTML = `
            <div class="pf-cover" style="${p.cover_picture ? `background-image:url('${esc(p.cover_picture)}')` : ""}">
                ${self ? `<button class="sx-btn sm pf-cover-btn" data-pick="cover">📷 Edit cover</button>
                          <input type="file" hidden id="coverFile" data-upload="cover" accept="image/jpeg,image/png,image/webp,image/gif">` : ""}
            </div>
            <div class="pf-bar">
                <div class="pf-avatar-wrap">
                    ${p.note ? `<span class="sx-bubble ${noteClass(p.note)}">${esc(SX.noteLabel(p.note))}</span>` : ""}
                    ${avatar(p.full_name, p.profile_picture, "xl")}
                    ${self ? `<button class="pf-avatar-btn" data-pick="avatar" title="Change profile picture">📷</button>
                              <input type="file" hidden id="avatarFile" data-upload="avatar" accept="image/jpeg,image/png,image/webp,image/gif">` : ""}
                </div>
                <div class="pf-info">
                    <h1>${esc(p.full_name)}</h1>
                    <p>@${esc(p.username)} · <span class="sx-chip-bg">${esc(p.blood_group)}</span></p>
                    <p><a href="#friends" data-tab-link="friends"><b>${p.friend_count}</b> ${p.friend_count === 1 ? "friend" : "friends"}</a>
                       · <span class="pf-stars">${p.rating_count ? starText(p.rating_average) : ""}</span>
                       ${p.rating_count ? `<b>${p.rating_average.toFixed(1)}</b> (${p.rating_count})` : "No ratings yet"}</p>
                </div>
                <div class="pf-actions">${actionsHTML()}</div>
            </div>`;
    };

    const renderSide = () => {
        const { profile: p, relation, rateable_exchange: rateable } = state.data;
        const self = relation === "self";
        const place = [p.upazila, p.district].filter(Boolean).join(", ");

        const bio = `
            <div id="bioView">
                ${p.bio ? `<p class="pf-bio">${esc(p.bio)}</p>` : `<p class="sx-muted" style="margin-bottom:12px">${self ? "Add a short bio so people know you." : "No bio yet."}</p>`}
                ${self ? `<button class="sx-btn sm" data-bio="edit" style="width:100%">${p.bio ? "Edit bio" : "Add bio"}</button>` : ""}
            </div>
            <div id="bioEdit" class="pf-bio-edit" hidden>
                <textarea maxlength="300" id="bioInput" placeholder="Describe yourself…">${esc(p.bio || "")}</textarea>
                <div style="display:flex;gap:8px;justify-content:flex-end"><button class="sx-btn sm" data-bio="cancel">Cancel</button><button class="sx-btn primary sm" data-bio="save">Save</button></div>
            </div>`;

        const hint = !self && relation !== "bloodbank" && !rateable
            ? `<p class="pf-hint">You can rate ${esc(p.full_name.split(" ")[0])} after a blood donation between you is confirmed by both of you.</p>` : "";

        $("#pfSide").innerHTML = `
            <section class="sx-card"><h3>Intro</h3>${bio}
                <div class="pf-about">
                    ${place ? `<p><span>📍</span><span>${esc(place)}</span></p>` : ""}
                    <p><span>🩸</span><span>Blood group ${esc(p.blood_group)}</span></p>
                    ${p.eligibility_status ? `<p><span>✅</span><span>${esc(p.eligibility_status)} to donate</span></p>` : ""}
                    <p><span>🗓</span><span>Joined ${fmt(p.created_at, { month: "long", year: "numeric" })}</span></p>
                </div>
            </section>
            <section class="sx-card pf-rate-box">
                <h3>Donor record</h3>
                <div class="pf-rate-big">${p.donations_total}</div>
                <small class="sx-muted">${p.donations_total === 1 ? "confirmed donation" : "confirmed donations"} · ${p.donations_this_year} this year</small>
                ${p.rating_count ? `<div class="pf-stars">${starText(p.rating_average)}</div><small class="sx-muted">${p.rating_average.toFixed(1)} from ${p.rating_count} ${p.rating_count === 1 ? "rating" : "ratings"}</small>` : ""}
                ${hint}
            </section>`;
    };

    const loadPosts = guard(async (reset) => {
        const box = $("#pfPosts");
        if (reset) { state.before = 0; box.innerHTML = ""; }
        const data = await api(`/users/${encodeURIComponent(username)}/posts?limit=${PAGE}${state.before ? `&before=${state.before}` : ""}`);
        data.posts.forEach((p) => box.appendChild(renderPost(p)));
        if (data.posts.length) state.before = data.posts[data.posts.length - 1].post_id;
        $("#pfMore").hidden = data.posts.length < PAGE;
        $("#pfEmpty").hidden = box.children.length > 0;
    });

    const showTab = guard(async (name) => {
        state.tab = name;
        $$(".pf-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
        const main = $("#pfMain");

        if (name === "friends") {
            const data = await api(`/users/${encodeURIComponent(username)}/friends`);
            main.innerHTML = data.friends.length
                ? `<div class="pf-friends">${data.friends.map((f) => `
                    <a class="pf-friend" href="/profile?u=${encodeURIComponent(f.username)}">${avatar(f.full_name, f.profile_picture, "md")}
                    <div><strong>${esc(f.full_name)}</strong><small>${esc(f.blood_group)} · @${esc(f.username)}</small></div></a>`).join("")}</div>`
                : `<div class="sx-card sx-empty">No friends to show yet.</div>`;
        } else if (name === "reviews") {
            const data = await api(`/users/${encodeURIComponent(username)}/reviews`);
            main.innerHTML = `<div class="sx-card">${data.reviews.length ? data.reviews.map((r) => `
                <div class="pf-review"><a href="/profile?u=${encodeURIComponent(r.rater_username)}">${avatar(r.rater_name, r.rater_picture, "sm")}</a>
                <div><a class="sx-name" href="/profile?u=${encodeURIComponent(r.rater_username)}">${esc(r.rater_name)}</a>
                <div class="pf-stars">${starText(r.stars)}</div>
                ${r.review ? `<p>${esc(r.review)}</p>` : ""}<small class="sx-muted">${timeAgo(r.created_at)}</small></div></div>`).join("")
                : `<div class="sx-empty">No reviews yet. Reviews appear after a confirmed blood donation.</div>`}</div>`;
        } else {
            main.innerHTML = `<div id="pfPosts"></div>
                <div class="sx-card sx-empty" id="pfEmpty" hidden>No posts yet.</div>
                <button class="sx-btn dash-more" id="pfMore" hidden style="display:block;margin:6px auto">Load more</button>`;
            $("#pfMore").addEventListener("click", () => loadPosts(false));
            await loadPosts(true);
        }
    });

    const load = async () => {
        try {
            state.data = await api(`/users/${encodeURIComponent(username)}`);
        } catch (error) {
            $("#pfHead").innerHTML = `<div class="pf-notfound"><h2>Profile not found</h2><p class="sx-muted">${esc(error.message)}</p><a class="sx-btn primary" style="margin-top:16px" href="/dashboard">Back to home</a></div>`;
            return;
        }
        renderHead();
        renderSide();
        $("#pfBody").hidden = false;
        await showTab(["posts", "friends", "reviews"].includes(state.tab) ? state.tab : "posts");
    };

    const openDonationModal = () => {
        const p = state.data.profile;
        const first = esc(p.full_name.split(" ")[0]);
        const today = new Date();
        const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const yearAgo = new Date(today); yearAgo.setFullYear(yearAgo.getFullYear() - 1);

        const m = SX.modal(`
            <h3>🩸 Record a blood donation</h3>
            <p>It only counts for the leaderboard and ratings after ${first} confirms it.</p>
            <label class="sx-radio"><input type="radio" name="dir" value="donated" checked> I donated blood to ${first}</label>
            <label class="sx-radio"><input type="radio" name="dir" value="received"> ${first} donated blood to me</label>
            <label class="sx-muted sx-small">Date of donation</label>
            <input type="date" class="sx-field" id="donDate" value="${iso(today)}" min="${iso(yearAgo)}" max="${iso(today)}">
            <div class="sx-modal-actions"><button class="sx-btn" data-cancel>Cancel</button><button class="sx-btn primary" data-save>Send for confirmation</button></div>`);

        m.el.addEventListener("click", guard(async (e) => {
            const b = e.target.closest("button");
            if (!b) return;
            if (b.hasAttribute("data-cancel")) m.close();
            if (b.hasAttribute("data-save")) {
                const direction = m.el.querySelector('input[name="dir"]:checked').value;
                const donated_on = m.el.querySelector("#donDate").value;
                await api("/exchanges", { method: "POST", body: { username: p.username, direction, donated_on } });
                m.close();
                toast(`Sent. It counts once ${p.full_name.split(" ")[0]} confirms.`, "success");
            }
        }));
    };

    const openRateModal = () => {
        const { profile: p, rateable_exchange: x } = state.data;
        let stars = 0;
        const m = SX.modal(`
            <h3>⭐ Rate ${esc(p.full_name)}</h3>
            <p>For the ${esc(x.blood_group)} blood donation on ${fmt(x.donated_on)}. You can rate each donation once.</p>
            <div class="sx-stars">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" aria-label="${n} stars">★</button>`).join("")}</div>
            <textarea class="sx-field" id="rateText" maxlength="300" rows="3" placeholder="Share your experience (optional)"></textarea>
            <div class="sx-modal-actions"><button class="sx-btn" data-cancel>Cancel</button><button class="sx-btn primary" data-save>Submit rating</button></div>`);

        m.el.addEventListener("click", guard(async (e) => {
            const b = e.target.closest("button");
            if (!b) return;
            if (b.dataset.star) {
                stars = Number(b.dataset.star);
                m.el.querySelectorAll("[data-star]").forEach((s) => s.classList.toggle("on", Number(s.dataset.star) <= stars));
            } else if (b.hasAttribute("data-cancel")) {
                m.close();
            } else if (b.hasAttribute("data-save")) {
                if (!stars) { toast("Please choose 1 to 5 stars."); return; }
                await api("/reviews", { method: "POST", body: { exchange_id: x.exchange_id, stars, review: m.el.querySelector("#rateText").value } });
                m.close();
                toast("Thank you for your rating.", "success");
                await load();
            }
        }));
    };

    $("#pfHead").addEventListener("click", guard(async (e) => {
        const pick = e.target.closest("[data-pick]");
        if (pick) { $(pick.dataset.pick === "avatar" ? "#avatarFile" : "#coverFile").click(); return; }
        const link = e.target.closest("[data-tab-link]");
        if (link) { e.preventDefault(); await showTab(link.dataset.tabLink); return; }

        const btn = e.target.closest("[data-do]");
        if (!btn) return;
        const p = state.data.profile;
        const act = btn.dataset.do;

        if (act === "need" || act === "available") {
            SX.openNoteModal({ fixedType: act === "need" ? "Need" : "Available", current: p.note, onDone: load });
            return;
        }
        if (act === "donation") { openDonationModal(); return; }
        if (act === "rate") { openRateModal(); return; }

        if (act === "add") {
            await api(`/friends/request/${p.user_id}`, { method: "POST" });
            toast("Friend request sent.", "success");
        } else if (act === "cancel") {
            await api(`/friends/${p.user_id}`, { method: "DELETE" });
        } else if (act === "unfriend") {
            if (!window.confirm(`Remove ${p.full_name} from your friends?`)) return;
            await api(`/friends/${p.user_id}`, { method: "DELETE" });
            toast("Friend removed.", "success");
        } else if (act === "accept" || act === "reject") {
            await api(`/friends/respond/${state.data.friendship_id}`, { method: "POST", body: { action: act } });
            if (act === "accept") toast("You are now friends.", "success");
        } else if (act === "clear-note") {
            await api("/notes", { method: "DELETE" });
            toast("Note removed.", "success");
        }
        await load();
    }));

    $("#pfHead").addEventListener("change", guard(async (e) => {
        const input = e.target;
        if (!input.matches("[data-upload]")) return;
        const file = input.files[0];
        if (!file) return;
        const kind = input.dataset.upload;
        const max = kind === "avatar" ? 3 : 5;
        if (file.size > max * 1024 * 1024) { toast(`Image must be under ${max} MB.`); input.value = ""; return; }
        const form = new FormData();
        form.append(kind, file);
        const res = await api(`/profile/${kind}`, { method: "POST", form });
        toast(kind === "avatar" ? "Profile picture updated." : "Cover photo updated.", "success");
        if (kind === "avatar") $("#sxMenuBtn").innerHTML = avatar(state.data.profile.full_name, res.url, "sm");
        await load();
    }));

    $("#pfSide").addEventListener("click", guard(async (e) => {
        const b = e.target.closest("[data-bio]");
        if (!b) return;
        const act = b.dataset.bio;
        if (act === "edit" || act === "cancel") {
            $("#bioView").hidden = act === "edit";
            $("#bioEdit").hidden = act === "cancel";
        } else if (act === "save") {
            await api("/profile/bio", { method: "PUT", body: { bio: $("#bioInput").value } });
            toast("Bio updated.", "success");
            await load();
        }
    }));

    $$(".pf-tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

    await load();
})();