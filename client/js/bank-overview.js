(() => {
    if (!window.BankShell) return;

    const esc = Bank.escape;
    const ui = BankUI;

    BankShell.register("overview", async (el) => {
        const bank = Bank.profile || {};
        const data = await Bank.api("/overview");
        const k = data.kpis;
        const maxUnits = Math.max(20, ...data.stock.map((s) => s.units));

        BankShell.setBadge("requests", k.pendingRequests || 0);

        const requestRows = data.recentRequests.map((r) => `
            <tr>
                <td>#${esc(r.request_id)}</td>
                <td><strong>${esc(r.patient_name)}</strong><br><span class="sub">${esc(r.hospital_name)}</span></td>
                <td>${esc(r.blood_group)} × ${esc(r.units_required)}</td>
                <td>${ui.pill(r.urgency_level)}</td>
                <td>${ui.pill(r.status)}</td>
                <td>${esc(r.created_on)}</td>
            </tr>`).join("");

        const expiringRows = data.expiring.map((b) => `
            <div class="exp-row">
                <span><strong>${esc(b.blood_group)}</strong> · ${esc(b.units_left)} unit${b.units_left === 1 ? "" : "s"}</span>
                <span class="sub">${b.days_left <= 0 ? "expires today" : `in ${esc(b.days_left)} day${b.days_left === 1 ? "" : "s"}`} (${esc(b.expires_on)})</span>
            </div>`).join("");

        el.innerHTML = `
            <section class="bank-hero">
                <div>
                    <h1>Welcome, ${esc(bank.name)}</h1>
                    <p>Your blood stock and request activity at a glance.</p>
                </div>
                <div class="bank-chips">
                    <span class="bank-chip">✔ ${esc(bank.status)}</span>
                    <span class="bank-chip">License ${esc(bank.license_number)}</span>
                    <span class="bank-chip">📍 ${esc(bank.district)}</span>
                </div>
            </section>

            ${k.totalUnits === 0 ? `<div class="info-banner">Your stock is empty. Blood batches you add in <strong>Inventory</strong> will appear here with expiry tracking.</div>` : ""}

            <div class="grid-4">
                <div class="card stat"><div class="ico">🩸</div><div><strong>${esc(k.totalUnits)}</strong><span>Units in stock</span>${k.attentionGroups ? `<small class="down">${esc(k.attentionGroups)} group${k.attentionGroups === 1 ? "" : "s"} need attention</small>` : `<small class="up">All groups healthy</small>`}</div></div>
                <div class="card stat"><div class="ico">⏳</div><div><strong>${esc(k.pendingRequests)}</strong><span>Pending requests</span>${k.criticalRequests ? `<small class="down">${esc(k.criticalRequests)} critical</small>` : `<small>None critical</small>`}</div></div>
                <div class="card stat"><div class="ico">💉</div><div><strong>${esc(k.donationsThisMonth)}</strong><span>Donations this month</span></div></div>
                <div class="card stat"><div class="ico">⚠️</div><div><strong>${esc(k.expiringUnits)}</strong><span>Units expiring soon</span><small>within ${esc(data.thresholds.expiryDays)} days</small></div></div>
            </div>

            <div class="card" style="margin-top:16px">
                <div class="card-head"><h3>Blood stock by group</h3><span class="sub">Low at ${esc(data.thresholds.low)} units or fewer</span></div>
                <div class="stock-grid">
                    ${data.stock.map((s) => `
                        <div class="stock-card ${esc(s.level)}">
                            <div class="grp">${esc(s.blood_group)}</div>
                            <div class="units">${esc(s.units)}</div>
                            <div class="bar"><i style="width:${Math.min(100, Math.round((s.units / maxUnits) * 100))}%"></i></div>
                            <div class="lvl">${esc(s.level === "Good" ? "Healthy" : s.level)}</div>
                        </div>`).join("")}
                </div>
            </div>

            <div class="two-col">
                <div class="card">
                    <div class="card-head"><h3>Recent blood requests</h3><a class="sub" href="#requests">View all →</a></div>
                    ${data.recentRequests.length
                        ? `<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Patient</th><th>Blood</th><th>Urgency</th><th>Status</th><th>Date</th></tr></thead><tbody>${requestRows}</tbody></table></div>`
                        : `<p class="sub">No requests yet. When users request blood from your bank, they will appear here.</p>`}
                </div>
                <div class="card">
                    <div class="card-head"><h3>Expiring soon</h3><a class="sub" href="#inventory">Inventory →</a></div>
                    ${data.expiring.length ? expiringRows : `<p class="sub">No batches are close to expiry.</p>`}
                </div>
            </div>`;
    });
})();