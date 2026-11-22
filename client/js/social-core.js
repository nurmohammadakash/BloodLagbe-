(() => {
    const TOKEN_KEY = "bloodLagbeToken";
    const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const listeners = {};
    let me = null;
    let notifState = { items: [], unread: 0 };

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const token = () => localStorage.getItem(TOKEN_KEY);

    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));

    const timeAgo = (value) => {
        const secs = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
        if (secs < 60) return "just now";
        const mins = Math.floor(secs / 60);
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d`;
        return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    };

    const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

    const avatar = (name, pic, size = "md", extra = "") => pic
        ? `<span class="sx-avatar ${size} ${extra}"><img src="${esc(pic)}" alt=""></span>`
        : `<span class="sx-avatar ${size} ${extra}">${esc(initials(name))}</span>`;

    const on = (event, fn) => { (listeners[event] = listeners[event] || []).push(fn); };
    const emit = (event, data) => (listeners[event] || []).forEach((fn) => fn(data));

    const toast = (message, type = "info") => {
        let box = $("#sxToasts");
        if (!box) {
            box = document.createElement("div");
            box.id = "sxToasts";
            document.body.appendChild(box);
        }
        const el = document.createElement("div");
        el.className = `sx-toast ${type}`;
        el.textContent = message;
        box.appendChild(el);
        setTimeout(() => el.remove(), 3800);
    };

        const logout = (expired = false) => {
        // end the server-side session too (keepalive lets it finish during the redirect)
        try { fetch("/api/auth/logout", { method: "POST", keepalive: true }); } catch { /* ignore */ }
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("bloodLagbeUser");
        window.location.href = expired ? "/login" : "/";
    };

    const api = async (path, { method = "GET", body, form } = {}) => {
        const headers = { Authorization: `Bearer ${token()}` };
        let payload;
        if (form) {
            payload = form;
        } else if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            payload = JSON.stringify(body);
        }
        const res = await fetch(`/api/social${path}`, { method, headers, body: payload });
        if (res.status === 401) {
            logout(true);
            throw new Error("Session expired. Please log in again.");
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.message || "Something went wrong.");
        return data;
    };

    const guard = (fn) => async (...args) => {
        try { return await fn(...args); } catch (error) { toast(error.message); return null; }
    };

    const modal = (html) => {
        const overlay = document.createElement("div");
        overlay.className = "sx-overlay";
        overlay.innerHTML = `<div class="sx-modal">${html}</div>`;
        const close = () => overlay.remove();
        overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
        document.body.appendChild(overlay);
        return { el: overlay.firstElementChild, close };
    };

    const lightbox = (src) => {
        const box = document.createElement("div");
        box.className = "sx-lightbox";
        box.innerHTML = `<img src="${esc(src)}" alt="">`;
        box.addEventListener("click", () => box.remove());
        document.body.appendChild(box);
    };

    const boot = async (expect) => {
        if (!token()) {
            window.location.href = "/login";
            return null;
        }
        try {
            me = await api("/me");
        } catch (error) {
            return null;
        }
        if (expect && me.account_type !== expect) {
            window.location.replace(me.account_type === "bloodbank" ? "/bloodbank/dashboard" : "/dashboard");
            return null;
        }
        return me;
    };

    const NOTIF_ICONS = {
        friend_request: "👥", friend_accept: "🤝", friend_post: "📝", like: "❤️", comment: "💬",
        need_blood: "🩸", donation_pending: "🩸", donation_confirmed: "✅", rating: "⭐", announcement: "📢",
        connection_request: "🩸", connection_confirmed: "✅", connection_declined: "✖️", connection_closed: "⏹",
        connection_cancelled: "⚠️", connection_review: "⭐", connection_successful: "🎉",
        bank_request: "🩸", bank_request_cancelled: "⚠️",
        bank_request_approved: "✅", bank_request_reserved: "📦", bank_request_released: "↩️",
        bank_request_issued: "🩸", bank_request_rejected: "✖️"
    };

    const notifHTML = (n) => `
        <div class="sx-notif ${n.is_read ? "" : "unread"}" data-id="${n.notification_id || ""}" data-link="${esc(n.link || "")}">
            ${avatar(n.actor_name || "B", n.actor_picture, "sm")}
            <span class="sx-notif-ico">${NOTIF_ICONS[n.type] || "🔔"}</span>
            <div><p>${esc(n.message)}</p><small>${timeAgo(n.created_at)}</small></div>
        </div>`;

    const renderNotifs = () => {
        const list = $("#sxNotifList");
        const badge = $("#sxBadge");
        if (!list) return;
        list.innerHTML = notifState.items.length
            ? notifState.items.map(notifHTML).join("")
            : `<div class="sx-empty">You're all caught up.</div>`;
        badge.textContent = notifState.unread > 99 ? "99+" : notifState.unread;
        badge.hidden = notifState.unread < 1;
    };

    const loadNotifs = guard(async () => {
        const data = await api("/notifications?limit=25");
        notifState = { items: data.notifications, unread: data.unread };
        renderNotifs();
    });
        // posts currently on screen, so live like counts and comments can reach them
    const postViews = new Map();
    const watched = new Set();
    let liveSocket = null;
    const watchPost = (id) => {
        watched.add(id);
        if (liveSocket && liveSocket.connected) liveSocket.emit("watch", [id]);
    };


    const connectSocket = () => {
        if (typeof io === "undefined") return;
        const socket = io({ auth: { token: token() } });
                liveSocket = socket;
        // runs on first connect and after every reconnect
        socket.on("connect", () => { if (watched.size) socket.emit("watch", [...watched]); });
        socket.on("post:reaction", (d) => {
            const v = postViews.get(d.post_id);
            if (v) v.onReaction(d);
        });
        socket.on("comment:new", (d) => {
            const v = postViews.get(d.post_id);
            if (v) v.onComment(d);
        });
        socket.on("notification", (n) => {
            notifState.items.unshift({ ...n, actor_name: null, actor_picture: null });
            notifState.unread += 1;
            renderNotifs();
            toast(n.message, "info");
            emit("notification", n);
        });
    };

    const mountNav = (active) => {
        const nav = $("#sxNav");
        const isUser = me.account_type === "user";
        const acc = me.account;
        const name = isUser ? acc.full_name : acc.name;
        const pic = isUser ? acc.profile_picture : null;

        nav.innerHTML = `
            <div class="sx-nav-left">
                <a class="sx-brand" href="${isUser ? "/dashboard" : "/bloodbank/dashboard"}">🩸<span>Blood<b>Lagbe</b></span></a>
                <div class="sx-search">
                    <input id="sxSearch" placeholder="Search people" autocomplete="off">
                    <div class="sx-search-results" id="sxSearchResults"></div>
                </div>
            </div>
            <nav class="sx-tabs">
                <a class="sx-tab ${active === "home" ? "active" : ""}" href="/dashboard">Home</a>
                <a class="sx-tab ${active === "leaderboard" ? "active" : ""}" href="/dashboard#leaderboard">Leaderboard</a>
                                ${isUser ? `<a class="sx-tab ${active === "connections" ? "active" : ""}" href="/connection">Connections</a>` : ""}
                                ${isUser ? `<a class="sx-tab ${active === "banks" ? "active" : ""}" href="/banks">Blood Banks</a>` : ""}
            </nav>
            <div class="sx-nav-right">
                <button class="sx-theme" data-theme-toggle>☀️ Light</button>
                <div class="sx-pop">
                    <button class="sx-iconbtn" id="sxBell" aria-label="Notifications">🔔<span class="sx-badge" id="sxBadge" hidden>0</span></button>
                    <div class="sx-dropdown" id="sxNotifDrop">
                        <div class="sx-dd-head"><strong>Notifications</strong><button class="sx-link" id="sxReadAll">Mark all read</button></div>
                        <div class="sx-dd-list" id="sxNotifList"></div>
                    </div>
                </div>
                <div class="sx-pop">
                    <button class="sx-avatar-btn" id="sxMenuBtn" style="background:none;border:0">${avatar(name, pic, "sm")}</button>
                    <div class="sx-dropdown sx-menu" id="sxMenu">
                        ${isUser ? `<a href="/profile">👤 My profile</a>` : `<a href="/bloodbank/dashboard">🏥 Dashboard</a>`}
                        <button id="sxSession">🔐 Session info</button>
                        <button id="sxLogout">↩ Log out</button>
                    </div>
                </div>
            </div>`;

        const notifDrop = $("#sxNotifDrop");
        const menu = $("#sxMenu")
        $("#sxBell").addEventListener("click", (e) => {
            e.stopPropagation();
            menu.classList.remove("open");
            notifDrop.classList.toggle("open");
        });
        $("#sxMenuBtn").addEventListener("click", (e) => {
            e.stopPropagation();
            notifDrop.classList.remove("open");
            menu.classList.toggle("open");
        });
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".sx-pop")) { notifDrop.classList.remove("open"); menu.classList.remove("open"); }
            if (!e.target.closest(".sx-search")) $("#sxSearchResults").classList.remove("open");
        });
                $("#sxSession").addEventListener("click", async () => {
            menu.classList.remove("open");
            try {
                const res = await fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token()}` } });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) throw new Error(data.message || "Could not load session info.");
                const s = data.session;
                const when = (v) => new Date(v).toLocaleString();
                const row = (k, v) => `<div style="display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid var(--border)"><span class="sx-muted">${k}</span><strong style="text-align:right">${v}</strong></div>`;
                const m = modal(`
                    <h3>Your session</h3>
                    <p>This is the server-side session created when you logged in.</p>
                    ${row("Signed in as", `@${esc(s.username || "")} (${s.account_type === "bloodbank" ? "blood bank" : "user"})`)}
                    ${row("Logged in", `${timeAgo(s.logged_in_at)}<br><small class="sx-muted">${esc(when(s.logged_in_at))}</small>`)}
                    ${row("Last activity", esc(when(s.last_activity)))}
                    ${row("Device", esc(s.browser))}
                    ${row("IP address", esc(s.ip))}
                    ${row("Session ends", esc(when(s.expires_at)))}
                    ${s.resumed ? `<p class="sx-muted" style="margin-top:10px">Your session was restored after a server restart, so the login time shows from then.</p>` : ""}
                    <div class="sx-modal-actions" style="margin-top:14px">
                        <button class="sx-btn" data-close>Close</button>
                        <button class="sx-btn primary" data-out>Log out</button>
                    </div>`);
                $("[data-close]", m.el).addEventListener("click", m.close);
                $("[data-out]", m.el).addEventListener("click", () => logout(false));
            } catch (err) {
                toast(err.message);
            }
        });
        $("#sxLogout").addEventListener("click", () => logout(false));

        $("#sxReadAll").addEventListener("click", guard(async () => {
            await api("/notifications/read-all", { method: "POST" });
            notifState.items.forEach((n) => { n.is_read = true; });
            notifState.unread = 0;
            renderNotifs();
        }));

        $("#sxNotifList").addEventListener("click", guard(async (e) => {
            const row = e.target.closest(".sx-notif");
            if (!row) return;
            const id = row.dataset.id;
            if (id) await api(`/notifications/${id}/read`, { method: "POST" });
            if (row.dataset.link) window.location.href = row.dataset.link;
            else { row.classList.remove("unread"); loadNotifs(); }
        }));

        let timer;
        const results = $("#sxSearchResults");
        $("#sxSearch").addEventListener("input", (e) => {
            clearTimeout(timer);
            const q = e.target.value.trim();
            if (q.length < 2) { results.classList.remove("open"); return; }
            timer = setTimeout(guard(async () => {
                const data = await api(`/users/search?q=${encodeURIComponent(q)}`);
                results.innerHTML = data.users.length
                    ? data.users.map((u) => `<a href="/profile?u=${encodeURIComponent(u.username)}">${avatar(u.full_name, u.profile_picture, "sm")}<div><strong>${esc(u.full_name)}</strong><br><small class="sx-muted">@${esc(u.username)} · ${esc(u.blood_group)}</small></div></a>`).join("")
                    : `<p>No people found.</p>`;
                results.classList.add("open");
            }), 250);
        });

        loadNotifs();
        connectSocket();
        setInterval(loadNotifs, 90000);
    };

    const noteLabel = (note) => `${note.note_type === "Need" ? "Need" : "Available"} ${note.blood_group} Blood`;

    const openNoteModal = ({ current = null, fixedType = null, onDone } = {}) => {
        let type = fixedType || current?.note_type || "Need";
        let group = current?.blood_group || null;

        const m = modal(`
            <h3>${fixedType === "Need" ? "🩸 I need blood" : fixedType === "Available" ? "✅ I'm available to donate" : "Share a blood note"}</h3>
            <p>Pick a blood group. Everyone will see it above your profile picture for 24 hours.</p>
            ${fixedType ? "" : `<div class="sx-seg"><button data-type="Need">🩸 Need Blood</button><button data-type="Available">✅ Available</button></div>`}
            <div class="sx-chips">${GROUPS.map((g) => `<button class="sx-chip" data-g="${g}">${g}</button>`).join("")}</div>
            <div class="sx-modal-actions">
                ${current ? `<button class="sx-btn danger" data-remove>Remove note</button>` : ""}
                <button class="sx-btn" data-cancel>Cancel</button>
                <button class="sx-btn primary" data-save>Share</button>
            </div>`);

        const paint = () => {
            $$("[data-type]", m.el).forEach((b) => b.classList.toggle("on", b.dataset.type === type));
            $(".sx-seg", m.el)?.classList.toggle("available", type === "Available");
            const chips = $(".sx-chips", m.el);
            chips.classList.toggle("available", type === "Available");
            $$(".sx-chip", chips).forEach((c) => c.classList.toggle("on", c.dataset.g === group));
        };
        paint();

        m.el.addEventListener("click", guard(async (e) => {
            const t = e.target.closest("button");
            if (!t) return;
            if (t.dataset.type) { type = t.dataset.type; paint(); }
            else if (t.dataset.g) { group = t.dataset.g; paint(); }
            else if (t.hasAttribute("data-cancel")) m.close();
            else if (t.hasAttribute("data-remove")) {
                await api("/notes", { method: "DELETE" });
                m.close();
                toast("Note removed.", "success");
                if (onDone) onDone(null);
            } else if (t.hasAttribute("data-save")) {
                if (!group) { toast("Please choose a blood group."); return; }
                await api("/notes", { method: "PUT", body: { note_type: type, blood_group: group } });
                m.close();
                toast(type === "Need" ? "Your friends have been notified." : "Your note is live.", "success");
                if (onDone) onDone({ note_type: type, blood_group: group });
            }
        }));
    };

    const postHTML = (p) => {
        const bank = p.author_type === "bloodbank";
        const link = bank ? null : `/profile?u=${encodeURIComponent(p.author_username)}`;
        const nameHtml = bank
            ? `<strong>${esc(p.author_name)}</strong>`
            : `<a class="sx-name" href="${link}">${esc(p.author_name)}</a>`;
        const av = bank ? avatar(p.author_name, null, "md", "bank") : avatar(p.author_name, p.author_picture, "md");
        return `
        <article class="sx-card sx-post ${p.is_urgent ? "urgent" : ""}" data-post="${p.post_id}">
            <header class="sx-post-head">
                ${link ? `<a href="${link}">${av}</a>` : av}
                <div class="sx-post-meta"><div>${nameHtml}${bank ? `<span class="sx-pill bank">🏥 Blood Bank</span>` : ""}</div><span class="sx-time">${timeAgo(p.created_at)}</span></div>
                ${p.is_urgent ? `<span class="sx-pill urgent">URGENT</span>` : ""}
                ${p.mine ? `<button class="sx-iconbtn sm" data-act="delete" title="Delete post" style="${p.is_urgent ? "" : "margin-left:auto"}">🗑</button>` : ""}
                ${!p.mine ? `<button class="sx-iconbtn sm" data-act="report" title="Report post" style="${p.is_urgent ? "" : "margin-left:auto"}">🚩</button>` : ""}
            </header>
            ${p.content ? `<p class="sx-post-text">${esc(p.content)}</p>` : ""}
            ${p.media_url ? `<img class="sx-post-img" data-act="zoom" src="${esc(p.media_url)}" alt="Post image">` : ""}
            <div class="sx-post-stats"><span data-role="likes"></span><button class="sx-link" data-act="comments"><span data-role="ccount">${p.comment_count}</span> comments</button></div>
            <div class="sx-post-actions">
                <button data-act="like">♥ Like</button>
                <button data-act="dislike">👎 Dislike</button>
                <button data-act="comments">💬 Comment</button>
            </div>
            <div class="sx-comments" hidden>
                <div data-role="clist" style="display:grid;gap:10px"></div>
                <form class="sx-comment-form"><input maxlength="1000" placeholder="Write a comment…"><button class="sx-btn primary sm">Send</button></form>
            </div>
        </article>`;
    };

    const commentHTML = (c) => {
        const bank = c.author_type === "bloodbank";
        const name = bank ? `<strong>${esc(c.author_name)}</strong>` : `<a class="sx-name" href="/profile?u=${encodeURIComponent(c.author_username)}"><strong>${esc(c.author_name)}</strong></a>`;
        return `<div class="sx-comment" data-cid="${c.comment_id}">${bank ? avatar(c.author_name, null, "xs", "bank") : avatar(c.author_name, c.author_picture, "xs")}<div class="sx-comment-body">${name}${esc(c.content)}<br><small>${timeAgo(c.created_at)} · <button class="sx-link" data-act="report-comment" data-id="${c.comment_id}" title="Report comment">🚩 Report</button></small></div></div>`;
    };
        const REPORT_REASONS = ["Spam", "Harassment", "Misinformation", "Inappropriate", "Other"];

    const reportFlow = (type, id) => {
        const field = "width:100%;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);font:inherit;";
        const m = modal(`
            <h3>Report ${type}</h3>
            <p>Tell us what is wrong. Our team reviews every report.</p>
            <select id="sxRepReason" style="${field}margin-bottom:10px">${REPORT_REASONS.map((r) => `<option>${r}</option>`).join("")}</select>
            <textarea id="sxRepDetails" maxlength="250" rows="3" placeholder="Optional details…" style="${field}"></textarea>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
                <button class="sx-btn" data-x="cancel">Cancel</button>
                <button class="sx-btn primary" data-x="send">Submit report</button>
            </div>`);

        $('[data-x="cancel"]', m.el).addEventListener("click", m.close);
        $('[data-x="send"]', m.el).addEventListener("click", async (e) => {
            e.target.disabled = true;
            try {
                await api(`/${type === "post" ? "posts" : "comments"}/${id}/report`, {
                    method: "POST",
                    body: { reason: $("#sxRepReason", m.el).value, details: $("#sxRepDetails", m.el).value }
                });
                m.close();
                toast("Thanks for reporting. Our team will review it.", "success");
            } catch (err) {
                e.target.disabled = false;
                toast(err.message);
            }
        });
    };
    const bindPost = (root, p, { onDelete } = {}) => {
        const likesEl = $('[data-role="likes"]', root);
        const likeBtn = $('[data-act="like"]', root);
        const countEl = $('[data-role="ccount"]', root);
        const box = $(".sx-comments", root);
        const list = $('[data-role="clist"]', root);
        let loaded = false;

        const dislikeBtn = $('[data-act="dislike"]', root);

        const paintLikes = () => {
            const parts = [];
            if (p.like_count) parts.push(`♥ ${p.like_count} ${p.like_count === 1 ? "like" : "likes"}`);
            if (p.dislike_count) parts.push(`👎 ${p.dislike_count}`);
            likesEl.textContent = parts.join("  ·  ");
            likeBtn.classList.toggle("liked", p.my_reaction === "like");
            dislikeBtn.classList.toggle("disliked", p.my_reaction === "dislike");
        };
        paintLikes();

        // adds a comment once, whether it arrives from our own request or from the live push
        const addCommentOnce = (c) => {
            if (list.querySelector(`[data-cid="${c.comment_id}"]`)) return;
            list.insertAdjacentHTML("beforeend", commentHTML(c));
        };

        postViews.set(p.post_id, {
            onReaction: (d) => {
                p.like_count = d.like_count;
                p.dislike_count = d.dislike_count;
                paintLikes();
            },
            onComment: (d) => {
                countEl.textContent = d.comment_count;
                if (loaded) addCommentOnce(d.comment);
            }
        });
        watchPost(p.post_id);

        const openComments = guard(async () => {
            box.hidden = !box.hidden;
            if (box.hidden || loaded) return;
            const data = await api(`/posts/${p.post_id}/comments`);
            list.innerHTML = data.comments.map(commentHTML).join("");
            loaded = true;
        });

        root.addEventListener("click", guard(async (e) => {
            const btn = e.target.closest("[data-act]");
            if (!btn) return;
            const act = btn.dataset.act;
            if (act === "like" || act === "dislike") {
                const data = await api(`/posts/${p.post_id}/${act}`, { method: "POST" });
                p.my_reaction = data.reaction;
                p.like_count = data.like_count;
                p.dislike_count = data.dislike_count;
                paintLikes();
            } else if (act === "comments") {
                await openComments();
            } else if (act === "zoom") {
                lightbox(btn.src);
            } else if (act === "report") {
                reportFlow("post", p.post_id);
            } else if (act === "report-comment") {
                reportFlow("comment", btn.dataset.id);
            } else if (act === "delete") {
                if (!window.confirm("Delete this post?")) return;
                await api(`/posts/${p.post_id}`, { method: "DELETE" });
                root.remove();
                postViews.delete(p.post_id);
                if (onDelete) onDelete(p);
            }
        }));

        $("form", root).addEventListener("submit", guard(async (e) => {
            e.preventDefault();
            const input = $("input", e.target);
            const text = input.value.trim();
            if (!text) return;
            const data = await api(`/posts/${p.post_id}/comments`, { method: "POST", body: { content: text } });
            if (!loaded) {
                const all = await api(`/posts/${p.post_id}/comments`);
                list.innerHTML = all.comments.map(commentHTML).join("");
                loaded = true;
            } else {
                addCommentOnce(data.comment);
            }
            countEl.textContent = data.comment_count;
            input.value = "";
        }));
    };

    const renderPost = (p, opts) => {
        const wrap = document.createElement("div");
        wrap.innerHTML = postHTML(p).trim();
        const el = wrap.firstElementChild;
        bindPost(el, p, opts);
        return el;
    };

    const medal = (rank) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank);

    const leaderboardRows = (rows, metric, myId) => rows.length
        ? rows.map((r) => `
            <a class="sx-lb-row ${r.user_id === myId ? "me" : ""}" href="/profile?u=${encodeURIComponent(r.username)}">
                <span class="sx-rank">${medal(r.rank)}</span>
                ${avatar(r.full_name, r.profile_picture, "sm")}
                <div class="sx-lb-info"><strong>${esc(r.full_name)}</strong><small class="sx-muted">${esc(r.blood_group)}</small></div>
                <div class="sx-lb-metric">${metric(r)}</div>
            </a>`).join("")
        : `<div class="sx-empty">No one on the board yet this year.</div>`;

    const loadLeaderboard = guard(async (target, year) => {
        const thisYear = new Date().getFullYear();
        const selected = year || thisYear;
        const data = await api(`/leaderboard?year=${selected}`);
        const myId = me?.account_type === "user" ? me.account.user_id : 0;
        target.innerHTML = `
            <div class="sx-lb-head">
                <div><h1>🏆 ${data.year} Leaderboard</h1><p class="sx-muted">Resets every year. Only confirmed donations and ratings count.</p></div>
                <select id="sxYear">${[thisYear, thisYear - 1, thisYear - 2].map((y) => `<option ${y === data.year ? "selected" : ""}>${y}</option>`).join("")}</select>
            </div>
            <div class="sx-lb-grid">
                <section class="sx-card"><h3>🩸 Most blood donated</h3>${leaderboardRows(data.top_donors, (r) => `${r.donations}<small>${r.donations === 1 ? "donation" : "donations"}</small>`, myId)}</section>
                <section class="sx-card"><h3>⭐ Best rated by recipients</h3>${leaderboardRows(data.top_rated, (r) => `★ ${r.average.toFixed(1)}<small>${r.reviews} ${r.reviews === 1 ? "review" : "reviews"}</small>`, myId)}</section>
            </div>`;
        $("#sxYear", target).addEventListener("change", (e) => loadLeaderboard(target, Number(e.target.value)));
    });

    window.SX = {
        $, $$, esc, timeAgo, avatar, initials, toast, modal, lightbox, api, guard, boot, mountNav, logout,
        on, emit, GROUPS, noteLabel, openNoteModal, renderPost, postHTML, loadLeaderboard,
        get me() { return me; }
    };
})();