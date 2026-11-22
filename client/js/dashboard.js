(async () => {
    const { $, esc, api, guard, toast, avatar, renderPost } = SX;

    const me = await SX.boot("user");
    if (!me) return;

    const acc = me.account;
    const state = { before: 0, done: false, friends: me.friend_count };
    const PAGE = 10;

    SX.mountNav("home");

    const paintLeft = () => {
        $("#dashLeft").innerHTML = `
            <section class="sx-card dash-profile">
                <div class="dash-cover"></div>
                <div class="dash-profile-body">
                    <a href="/profile">${avatar(acc.full_name, acc.profile_picture, "lg")}</a>
                    <h2><a href="/profile">${esc(acc.full_name)}</a></h2>
                    <p>@${esc(acc.username)} · <span class="sx-chip-bg">${esc(acc.blood_group)}</span></p>
                    ${acc.bio ? `<p style="margin-top:8px">${esc(acc.bio)}</p>` : ""}
                    <div class="dash-stats"><div><strong id="friendCount">${state.friends}</strong><span>Friends</span></div></div>
                    <a class="sx-btn sm" href="/profile">View profile</a>
                </div>
            </section>`;
        $("#composerHead").innerHTML = `${avatar(acc.full_name, acc.profile_picture, "sm")}<strong>${esc(acc.full_name)}</strong>`;
    };
    paintLeft();

    const showView = () => {
        const board = window.location.hash === "#leaderboard";
        $("#viewHome").hidden = board;
        $("#viewLeaderboard").hidden = !board;
        document.querySelectorAll(".sx-tab").forEach((t, i) => t.classList.toggle("active", board ? i === 1 : i === 0));
        if (board) SX.loadLeaderboard($("#viewLeaderboard"));
    };
    window.addEventListener("hashchange", showView);
    showView();

    const loadNotes = guard(async () => {
        const data = await api("/notes");
        const mine = data.notes.find((n) => n.is_me);
        const others = data.notes.filter((n) => !n.is_me);

        const mineHtml = `
            <button class="sx-note ${mine ? mine.note_type.toLowerCase() : "empty"}" data-me>
                ${mine ? `<span class="sx-bubble ${mine.note_type.toLowerCase()}">${esc(SX.noteLabel(mine))}</span>` : ""}
                ${mine ? avatar(acc.full_name, acc.profile_picture, "lg") : `<span class="sx-avatar lg">+</span>`}
                <span class="sx-note-name">${mine ? "Your note" : "Add note"}</span>
            </button>`;

        const othersHtml = others.map((n) => `
            <button class="sx-note ${n.note_type.toLowerCase()}" data-connect="${n.user_id}" title="${n.note_type === "Need" ? "Offer to donate" : "Request blood"}">
                <span class="sx-bubble ${n.note_type.toLowerCase()}">${esc(SX.noteLabel(n))}</span>
                ${avatar(n.full_name, n.profile_picture, "lg")}
                <span class="sx-note-name">${esc(n.full_name.split(" ")[0])}</span>
            </button>`).join("");

        const strip = $("#notesStrip");
        strip.innerHTML = mineHtml + othersHtml;
        $("[data-me]", strip).addEventListener("click", () => SX.openNoteModal({ current: mine || null, onDone: loadNotes }));
        strip.querySelectorAll("[data-connect]").forEach((b) => b.addEventListener("click", () => SX.openConnectionForm(Number(b.dataset.connect))));
    });
    loadNotes();

    const feedList = $("#feedList");
    const loadFeed = guard(async ({ reset = false } = {}) => {
        if (reset) { state.before = 0; state.done = false; feedList.innerHTML = ""; }
        const q = `/feed?limit=${PAGE}${state.before ? `&before=${state.before}` : ""}`;
        const data = await api(q);
        data.posts.forEach((p) => feedList.appendChild(renderPost(p)));
        if (data.posts.length) state.before = data.posts[data.posts.length - 1].post_id;
        state.done = data.posts.length < PAGE;
        $("#feedMore").hidden = state.done;
        $("#feedEmpty").hidden = feedList.children.length > 0;
        $("#newPostsBtn").hidden = true;
    });
    loadFeed();
    $("#feedMore").addEventListener("click", () => loadFeed());
    $("#newPostsBtn").addEventListener("click", () => loadFeed({ reset: true }));

    let chosenFile = null;
    const fileInput = $("#postFile");
    $("#postPhotoBtn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
        chosenFile = fileInput.files[0] || null;
        if (!chosenFile) return;
        if (chosenFile.size > 5 * 1024 * 1024) { toast("Image must be under 5 MB."); fileInput.value = ""; chosenFile = null; return; }
        $("#postPreviewImg").src = URL.createObjectURL(chosenFile);
        $("#postPreview").hidden = false;
    });
    const clearImage = () => { chosenFile = null; fileInput.value = ""; $("#postPreview").hidden = true; };
    $("#postPreviewClear").addEventListener("click", clearImage);

    $("#postBtn").addEventListener("click", guard(async () => {
        const text = $("#postText").value.trim();
        if (!text && !chosenFile) { toast("Write something or add a photo."); return; }
        const btn = $("#postBtn");
        btn.disabled = true;
        try {
            const form = new FormData();
            form.append("content", text);
            if (chosenFile) form.append("image", chosenFile);
            const data = await api("/posts", { method: "POST", form });
            feedList.prepend(renderPost(data.post));
            $("#feedEmpty").hidden = true;
            $("#postText").value = "";
            clearImage();
            toast("Posted. Your friends have been notified.", "success");
        } finally {
            btn.disabled = false;
        }
    }));

    const personRow = (u, actions) => `
        <div class="dash-person" data-user="${u.user_id}">
            <a href="/profile?u=${encodeURIComponent(u.username)}">${avatar(u.full_name, u.profile_picture, "sm")}</a>
            <div class="dash-person-info"><a href="/profile?u=${encodeURIComponent(u.username)}">${esc(u.full_name)}</a><small>${esc(u.blood_group)}${u.district ? " · " + esc(u.district) : ""}</small></div>
            <div class="dash-person-actions">${actions}</div>
        </div>`;

    const loadRequests = guard(async () => {
        const data = await api("/friends/requests");
        $("#cardRequests").hidden = !data.requests.length;
        $("#requestsList").innerHTML = data.requests.map((r) =>
            personRow(r, `<button class="sx-btn primary sm" data-accept="${r.friendship_id}">Confirm</button><button class="sx-btn sm" data-reject="${r.friendship_id}">Delete</button>`)
        ).join("");
    });
    $("#requestsList").addEventListener("click", guard(async (e) => {
        const accept = e.target.closest("[data-accept]");
        const reject = e.target.closest("[data-reject]");
        const btn = accept || reject;
        if (!btn) return;
        const id = btn.dataset.accept || btn.dataset.reject;
        await api(`/friends/respond/${id}`, { method: "POST", body: { action: accept ? "accept" : "reject" } });
        if (accept) {
            state.friends += 1;
            $("#friendCount").textContent = state.friends;
            toast("You are now friends.", "success");
            loadFeed({ reset: true });
        }
        loadRequests();
        loadSuggestions();
    }));

    const loadConfirmations = guard(async () => {
        const data = await api("/exchanges/pending");
        $("#cardConfirm").hidden = !data.exchanges.length;
        $("#confirmList").innerHTML = data.exchanges.map((x) => `
            <div class="dash-confirm">
                <p><a class="sx-name" href="/profile?u=${encodeURIComponent(x.other_username)}">${esc(x.other_name)}</a> says ${x.i_am_donor ? "you donated" : "they donated"} <b>${esc(x.blood_group)}</b> blood ${x.i_am_donor ? "to them" : "to you"} on ${new Date(x.donated_on).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}.</p>
                <div class="dash-person-actions"><button class="sx-btn green sm" data-ex="${x.exchange_id}" data-do="confirm">Confirm</button><button class="sx-btn sm" data-ex="${x.exchange_id}" data-do="reject">Not true</button></div>
            </div>`).join("");
    });
    $("#confirmList").addEventListener("click", guard(async (e) => {
        const btn = e.target.closest("[data-ex]");
        if (!btn) return;
        await api(`/exchanges/${btn.dataset.ex}/respond`, { method: "POST", body: { action: btn.dataset.do } });
        toast(btn.dataset.do === "confirm" ? "Donation confirmed. You can now rate each other." : "Donation rejected.", "success");
        loadConfirmations();
    }));

    const loadSuggestions = guard(async () => {
        const data = await api("/users/suggestions");
        $("#suggestList").innerHTML = data.users.length
            ? data.users.map((u) => personRow(u, `<button class="sx-btn sm" data-add="${u.user_id}">Add</button>`)).join("")
            : `<div class="sx-empty">No suggestions right now.</div>`;
    });
    $("#suggestList").addEventListener("click", guard(async (e) => {
        const btn = e.target.closest("[data-add]");
        if (!btn) return;
        await api(`/friends/request/${btn.dataset.add}`, { method: "POST" });
        btn.textContent = "Sent";
        btn.disabled = true;
    }));

    loadRequests();
    loadConfirmations();
    loadSuggestions();

    SX.on("notification", (n) => {
        if (n.type === "friend_request") loadRequests();
        if (n.type === "donation_pending") loadConfirmations();
        if (n.type === "need_blood") loadNotes();
        if (n.type === "friend_post") $("#newPostsBtn").hidden = false;
        if (n.type === "friend_accept") { state.friends += 1; $("#friendCount").textContent = state.friends; loadFeed({ reset: true }); }
    });
})();