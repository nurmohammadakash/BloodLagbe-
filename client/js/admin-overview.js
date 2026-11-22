(() => {
    if (!window.AdminShell) return;

    const ICONS = { user: "👤", bloodbank: "🏥", request: "🩸" };
    const STATUS_COLOR = {
        Pending: "--amber", Accepted: "--blue", Completed: "--green",
        Cancelled: "--text-muted", Expired: "--red"
    };

    let charts = [];
    let lastData = null;

    const esc = (s) => Admin.escape(s);
    const fmt = (n) => Number(n || 0).toLocaleString();
    const css = (v) => getComputedStyle(document.body).getPropertyValue(v).trim();
    const monthLabel = (ym) =>
        new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en", { month: "short", timeZone: "UTC" });

    const ago = (ts) => {
        const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
        if (s < 60) return "just now";
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const d = Math.floor(h / 24);
        return d < 30 ? `${d}d ago` : new Date(ts).toLocaleDateString();
    };

    function buildCharts(data) {
        charts.forEach((c) => c.destroy());
        charts = [];

        if (typeof Chart === "undefined") return;

        const c = data.charts;
        const red = css("--red"), blue = css("--blue"), green = css("--green");
        const grid = css("--border");

        Chart.defaults.color = css("--text-secondary");
        Chart.defaults.font.family = '"Segoe UI", Inter, Arial, sans-serif';

        const scales = {
            x: { grid: { display: false } },
            y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: grid } }
        };
        const base = { responsive: true, maintainAspectRatio: false };
        const legend = { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } };
        const make = (id, config) => {
            const el = document.getElementById(id);
            if (el) charts.push(new Chart(el, config));
        };
        const labels = c.months.map(monthLabel);

        make("chartRegistrations", {
            type: "line",
            data: {
                labels,
                datasets: [
                    { label: "Users", data: c.users, borderColor: red, backgroundColor: `${red}22`, fill: true, tension: .35 },
                    { label: "Blood banks", data: c.bloodBanks, borderColor: blue, backgroundColor: `${blue}22`, fill: true, tension: .35 }
                ]
            },
            options: { ...base, scales, plugins: { legend } }
        });

        make("chartStatus", {
            type: "doughnut",
            data: {
                labels: c.requestStatus.map((x) => x.status),
                datasets: [{
                    data: c.requestStatus.map((x) => x.count),
                    backgroundColor: c.requestStatus.map((x) => css(STATUS_COLOR[x.status])),
                    borderWidth: 0
                }]
            },
            options: { ...base, cutout: "68%", plugins: { legend } }
        });

        make("chartDemand", {
            type: "bar",
            data: {
                labels: c.groups,
                datasets: [
                    { label: "Open demand (units)", data: c.demand, backgroundColor: red, borderRadius: 6 },
                    { label: "Stock (units)", data: c.stock, backgroundColor: green, borderRadius: 6 }
                ]
            },
            options: { ...base, scales, plugins: { legend } }
        });

        make("chartDonations", {
            type: "bar",
            data: {
                labels,
                datasets: [{ label: "Completed donations", data: c.donations, backgroundColor: blue, borderRadius: 6 }]
            },
            options: { ...base, scales, plugins: { legend: { display: false } } }
        });
    }

    function template(data) {
        const { users, bloodBanks, requests, donations } = data.kpis;
        const a = Admin.admin() || {};

        const alerts = [];
        if (bloodBanks.pending > 0) {
            alerts.push(`<div class="alert warn">⏳ <span><strong>${fmt(bloodBanks.pending)}</strong> blood bank(s) waiting for approval</span><a href="#bloodbanks">Review →</a></div>`);
        }
        if (requests.critical > 0) {
            alerts.push(`<div class="alert danger">🚨 <span><strong>${fmt(requests.critical)}</strong> critical blood request(s) still open</span><a href="#requests">View →</a></div>`);
        }

        const urgentRows = data.urgent.length
            ? `<div class="table-wrap"><table class="table">
                <thead><tr><th>Blood</th><th>Hospital</th><th>Units</th><th>Urgency</th><th>Needed by</th></tr></thead>
                <tbody>${data.urgent.map((r) => `
                    <tr>
                        <td><span class="blood-tag">${esc(r.blood_group)}</span></td>
                        <td>${esc(r.hospital_name)}</td>
                        <td>${fmt(r.units_required)}</td>
                        <td><span class="pill ${r.urgency_level.toLowerCase()}">${esc(r.urgency_level)}</span></td>
                        <td>${esc(r.needed_by)}</td>
                    </tr>`).join("")}</tbody></table></div>`
            : `<div class="muted-empty">No urgent requests right now. 🎉</div>`;

        const feed = data.activity.length
            ? `<ul class="feed">${data.activity.map((x) => `
                <li>
                    <div class="dot">${ICONS[x.type] || "•"}</div>
                    <div><strong>${esc(x.title)}</strong><small>${esc(x.subtitle)}</small></div>
                    <time>${ago(x.created_at)}</time>
                </li>`).join("")}</ul>`
            : `<div class="muted-empty">No activity yet.</div>`;

        return `
            <div class="page-head row">
                <div>
                    <h1>Welcome back, ${esc(a.username || "Admin")} 👋</h1>
                    <p>Here is what's happening on Blood Lagbe.</p>
                </div>
                <button class="btn-ghost" id="refreshOverview">↻ Refresh</button>
            </div>

            ${alerts.length ? `<div class="alerts">${alerts.join("")}</div>` : ""}

            <div class="grid-4">
                <div class="card stat"><div class="ico">👥</div><div>
                    <strong>${fmt(users.total)}</strong><span>Total users</span>
                    <small class="up">+${fmt(users.newThisMonth)} this month</small></div></div>
                <div class="card stat"><div class="ico">🏥</div><div>
                    <strong>${fmt(bloodBanks.approved)}</strong><span>Approved blood banks</span>
                    <small class="${bloodBanks.pending ? "warn" : ""}">${fmt(bloodBanks.pending)} pending approval</small></div></div>
                <div class="card stat"><div class="ico">🩸</div><div>
                    <strong>${fmt(requests.open)}</strong><span>Open requests</span>
                    <small class="${requests.critical ? "bad" : ""}">${fmt(requests.critical)} critical</small></div></div>
                <div class="card stat"><div class="ico">💉</div><div>
                    <strong>${fmt(donations.completed)}</strong><span>Completed donations</span>
                    <small class="up">${fmt(donations.thisMonth)} this month</small></div></div>
            </div>

            <div class="row-2">
                <div class="card">
                    <div class="card-head"><h3>New registrations</h3><span>Last 6 months</span></div>
                    <div class="chart-box"><canvas id="chartRegistrations"></canvas></div>
                </div>
                <div class="card">
                    <div class="card-head"><h3>Requests by status</h3><span>All time</span></div>
                    <div class="chart-box"><canvas id="chartStatus"></canvas></div>
                </div>
            </div>

            <div class="row-2 even">
                <div class="card">
                    <div class="card-head"><h3>Demand vs stock</h3><span>By blood group</span></div>
                    <div class="chart-box"><canvas id="chartDemand"></canvas></div>
                </div>
                <div class="card">
                    <div class="card-head"><h3>Donations</h3><span>Last 6 months</span></div>
                    <div class="chart-box"><canvas id="chartDonations"></canvas></div>
                </div>
            </div>

            <div class="row-2">
                <div class="card">
                    <div class="card-head"><h3>Urgent requests</h3><a href="#requests" style="font-size:13px;color:var(--red)">View all →</a></div>
                    ${urgentRows}
                </div>
                <div class="card">
                    <div class="card-head"><h3>Recent activity</h3></div>
                    ${feed}
                </div>
            </div>`;
    }

    async function load(el) {
        const res = await Admin.api("/overview");
        lastData = res.data;
        el.innerHTML = template(lastData);
        buildCharts(lastData);

        document.getElementById("refreshOverview").addEventListener("click", async () => {
            try {
                await load(el);
                Admin.toast("Dashboard refreshed", "success");
            } catch (err) {
                Admin.toast(err.message, "error");
            }
        });
    }

    AdminShell.register("overview", async (el) => {
        el.innerHTML = `<div class="card empty">Loading dashboard…</div>`;
        await load(el);
    });

    // Rebuild chart colors when the theme is toggled
    new MutationObserver(() => {
        if (lastData && document.getElementById("chartRegistrations")) buildCharts(lastData);
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();