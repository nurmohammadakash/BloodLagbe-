// Multiple text boxes and drop-down lists, added and removed at run time.
// Every row is one search: blood group + district + optional username filter.
(() => {
    const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const MAX_ROWS = 8;
    const locations = window.BangladeshLocations || {};

    // flat, sorted list of districts from every division
    const districts = [...new Set(Object.values(locations).flatMap((d) => Object.keys(d)))].sort();

    const rowsBox = document.getElementById("dsRows");
    const status = document.getElementById("dsStatus");
    const results = document.getElementById("dsResults");

    const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    const addRow = (preset = {}) => {
        if (rowsBox.children.length >= MAX_ROWS) {
            status.textContent = `You can add up to ${MAX_ROWS} rows.`;
            return;
        }
        const row = document.createElement("div");
        row.className = "ds-row";
        row.innerHTML = `
            <select class="ds-group-select" aria-label="Blood group">
                <option value="">Any blood group</option>
                ${GROUPS.map((g) => `<option value="${g}">${g}</option>`).join("")}
            </select>
            <select class="ds-district-select" aria-label="District">
                <option value="">Any district</option>
                ${districts.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("")}
            </select>
            <input type="text" class="ds-name" maxlength="30" placeholder="Part of username (optional)">
            <button type="button" class="ds-remove" title="Remove this row">✕</button>`;
        row.querySelector(".ds-remove").addEventListener("click", () => {
            row.remove();
            if (!rowsBox.children.length) addRow(); // always keep one row
        });
        rowsBox.appendChild(row);
    };

    const searchRow = async (row) => {
        const group = row.querySelector(".ds-group-select").value;
        const district = row.querySelector(".ds-district-select").value;
        const name = row.querySelector(".ds-name").value.trim().toLowerCase();
        const qs = new URLSearchParams();
        if (group) qs.set("blood_group", group);
        if (district) qs.set("district", district);
        const r = await fetch(`/api/public/donors?${qs}`);
        const d = await r.json();
        if (!d.success) throw new Error(d.message || "Search failed");
        return d.donors.filter((x) => !name || x.username.toLowerCase().includes(name));
    };

    document.getElementById("dsForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        status.classList.remove("error");
        status.textContent = "Searching...";
        results.innerHTML = "";
        try {
            const rows = [...rowsBox.children];
            const lists = await Promise.all(rows.map(searchRow));
            const seen = new Set();
            const merged = lists.flat().filter((x) => !seen.has(x.id) && seen.add(x.id));
            status.textContent = merged.length
                ? `${merged.length} donor${merged.length === 1 ? "" : "s"} found for ${rows.length} search row${rows.length === 1 ? "" : "s"}.`
                : "No donors found for these filters.";
                        results.innerHTML = merged.map((x) => `
                <div class="ds-card">
                    <div class="ds-badge">${esc(x.blood_group)}</div>
                    <div><strong>@${esc(x.username)}</strong><small>${esc(x.district || "District not set")}</small></div>
                </div>`).join("");
        } catch (err) {
            console.error("Donor search failed:", err);
            status.classList.add("error");
            status.textContent = "Could not search right now. Please try again.";
        }
    });

    document.getElementById("dsAdd").addEventListener("click", () => addRow());
    document.getElementById("dsReset").addEventListener("click", () => {
        rowsBox.innerHTML = "";
        results.innerHTML = "";
        status.textContent = "";
        addRow();
    });

    addRow();
})();