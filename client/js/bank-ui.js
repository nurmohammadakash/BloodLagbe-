(() => {
    const esc = Bank.escape;

    function modal({ title, body = "", wide = false, actions = [] }) {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
            <div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">
                <div class="modal-head"><h3>${esc(title)}</h3><button class="modal-x" aria-label="Close">×</button></div>
                <div class="modal-body">${body}</div>
                <div class="modal-foot"></div>
            </div>`;

        const bodyEl = overlay.querySelector(".modal-body");
        const foot = overlay.querySelector(".modal-foot");
        const onKey = (e) => { if (e.key === "Escape") close(); };

        function close() {
            overlay.remove();
            document.removeEventListener("keydown", onKey);
        }

        function setActions(list) {
            foot.innerHTML = "";
            list.forEach((a) => {
                const btn = document.createElement("button");
                btn.className = `btn ${a.className || "btn-ghost"}`;
                btn.textContent = a.label;
                btn.addEventListener("click", () => (a.onClick ? a.onClick({ close, button: btn }) : close()));
                foot.appendChild(btn);
            });
        }

        setActions(actions);
        overlay.querySelector(".modal-x").addEventListener("click", close);
        overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
        document.addEventListener("keydown", onKey);
        document.body.appendChild(overlay);

        return { overlay, bodyEl, close, setActions };
    }

    // message is HTML: the caller must escape any user data in it
    function reasonDialog({
        title, message, confirmLabel, danger = false, askReason = true,
        reasonLabel = "Reason", placeholder = "Explain the decision. It is included in the email.", onConfirm
    }) {
        const body = `
            <p class="modal-text">${message}</p>
            ${askReason ? `<div class="field"><label for="reasonInput">${esc(reasonLabel)} (required)</label>
                <textarea id="reasonInput" rows="3" maxlength="250" placeholder="${esc(placeholder)}"></textarea></div>` : ""}
            <div class="form-msg error" id="reasonErr"></div>`;

        const m = modal({
            title,
            body,
            actions: [
                { label: "Cancel" },
                {
                    label: confirmLabel,
                    className: danger ? "btn-danger" : "btn-primary",
                    onClick: async ({ close, button }) => {
                        const errEl = m.overlay.querySelector("#reasonErr");
                        const input = m.overlay.querySelector("#reasonInput");
                        const reason = input ? input.value.trim() : "";

                        if (askReason && reason.length < 3) {
                            errEl.textContent = "Please enter at least 3 characters.";
                            return;
                        }
                        button.disabled = true;
                        button.textContent = "Please wait…";
                        try {
                            await onConfirm(reason);
                            close();
                        } catch (err) {
                            errEl.textContent = err.message;
                            button.disabled = false;
                            button.textContent = confirmLabel;
                        }
                    }
                }
            ]
        });
        return m;
    }

    function pager(el, { page, pages, total, limit }, onChange) {
        if (!total) { el.innerHTML = ""; return; }

        const from = (page - 1) * limit + 1;
        const to = Math.min(total, page * limit);
        const nums = [];
        for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i);

        el.innerHTML = `
            <span class="pager-info">Showing ${from}–${to} of ${total}</span>
            <div class="pager-btns">
                <button class="pg" data-p="${page - 1}" ${page <= 1 ? "disabled" : ""}>‹</button>
                ${nums.map((i) => `<button class="pg ${i === page ? "active" : ""}" data-p="${i}">${i}</button>`).join("")}
                <button class="pg" data-p="${page + 1}" ${page >= pages ? "disabled" : ""}>›</button>
            </div>`;

        el.querySelectorAll(".pg").forEach((b) =>
            b.addEventListener("click", () => {
                const p = Number(b.dataset.p);
                if (p >= 1 && p <= pages && p !== page) onChange(p);
            })
        );
    }

    const debounce = (fn, ms = 350) => {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    };

    const pill = (label) =>
        `<span class="pill s-${String(label).toLowerCase().replace(/\s+/g, "-")}">${esc(label)}</span>`;

    const fmtDate = (ts) =>
        ts ? new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    const initials = (name) =>
        String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

    window.BankUI = { modal, reasonDialog, pager, debounce, pill, fmtDate, initials };
})();