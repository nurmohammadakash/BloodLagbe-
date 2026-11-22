// "AI forecast" tab: predicts, for every blood bank and blood group, how likely the stock is to
// fall below the bank's low-stock level within 7 days. The prediction runs in THIS browser
// with a TensorFlow Lite model (client/models/shortage_model.tflite) through TensorFlow.js.
(() => {
    const MODEL_URL = "/models/shortage_model.tflite";
    const META_URL = "/models/shortage_model.meta.json";
        const WASM_PATH = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/wasm/";
    const LIBS = [
        "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.22.0",
        "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-cpu@4.22.0",
        "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/tf-tflite.min.js"
    ];

    const esc = (v) => (window.Admin && Admin.escape ? Admin.escape(v) : String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));

    // Turns one row from the server into the model's input: same order and scaling as the training script
    const buildVector = (row, meta) =>
        meta.features.map((name, i) => Math.min(Math.max(Number(row[name] || 0) / meta.scale[i], 0), meta.clip));

    const levelOf = (p, meta) => (p >= meta.levels.high ? "High" : p >= meta.levels.medium ? "Medium" : "Low");

    // ---------------- loading (once) ----------------
    const loadScript = (src) => new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`Could not load ${src}`));
        document.head.appendChild(s);
    });

    let enginePromise = null;
    const loadEngine = () => {
        if (!enginePromise) {
            enginePromise = (async () => {
                if (!window.tflite) for (const src of LIBS) await loadScript(src);   // in order: core, cpu backend, tflite
                // the WebAssembly files of the library live in the package's /wasm folder, not next to the script
                tflite.setWasmPath(WASM_PATH);
                await tf.setBackend("cpu");
                await tf.ready();

                const metaRes = await fetch(META_URL);
                if (!metaRes.ok) throw new Error("MODEL_MISSING");
                const meta = await metaRes.json();
                const model = await tflite.loadTFLiteModel(MODEL_URL);
                return { model, meta };
            })().catch((error) => { enginePromise = null; throw error; });
        }
        return enginePromise;
    };

    const predictAll = (engine, rows) => {
        const { model, meta } = engine;
        const started = performance.now();
        const out = rows.map((row) => {
            const input = tf.tensor2d([buildVector(row, meta)], [1, meta.features.length], "float32");
            const result = model.predict(input);
            const p = result.dataSync()[0];
            input.dispose(); result.dispose();
            return { ...row, risk: p, level: levelOf(p, meta) };
        });
        return { predictions: out, ms: performance.now() - started };
    };

    // ---------------- screen ----------------
    const css = document.createElement("style");
    css.textContent = `
        .fc-note{font-size:13px;color:var(--text-muted);margin:0 0 14px}
        .fc-bar{height:8px;border-radius:99px;background:var(--bg-secondary);overflow:hidden;min-width:90px}
        .fc-bar i{display:block;height:100%;border-radius:99px}
        .fc-High i{background:var(--red)}.fc-Medium i{background:var(--amber)}.fc-Low i{background:var(--green)}
        .fc-lv{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px}
        .fc-lv.High{background:var(--red-soft);color:var(--red-bright)}
        .fc-lv.Medium{background:rgba(245,158,11,.15);color:var(--amber)}
        .fc-lv.Low{background:rgba(34,197,94,.15);color:var(--green)}
        .fc-tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
        .fc-err{white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace;font-size:13px}
    `;
    document.head.appendChild(css);

    const render = async (container) => {
        const state = { level: "", showIdle: false };
        let engine = null;
        let data = [];
        let timer = null;

        container.innerHTML = `
            <p class="fc-note">A small neural network (TensorFlow Lite) runs in your browser and estimates the chance that each blood group will fall below the bank's low-stock level in the next 7 days.</p>
            <div id="fcCards" class="grid-4"></div>
            <div class="fc-tools">
                <select class="select" id="fcLevel"><option value="">All risk levels</option><option>High</option><option>Medium</option><option>Low</option></select>
                <label><input type="checkbox" id="fcIdle"> Show groups with no stock and no activity</label>
                <button class="btn btn-ghost" id="fcRefresh">↻ Refresh now</button>
                <span class="sub" id="fcStamp"></span>
            </div>
            <div class="card table-card"><div class="table-wrap"><table class="table">
                <thead><tr><th>Blood bank</th><th>Group</th><th>Free stock</th><th>Used / day (7d)</th><th>Cover (days)</th><th>Shortage risk (AI)</th><th>Level</th></tr></thead>
                <tbody id="fcRows"><tr><td colspan="7" class="muted-empty">Loading the model…</td></tr></tbody>
            </table></div></div>`;
        const $ = (s) => container.querySelector(s);

        const paint = (ms) => {
            const meta = engine.meta;
            const shown = data
                .filter((r) => state.showIdle || r.active)
                .filter((r) => !state.level || r.level === state.level)
                .sort((a, b) => b.risk - a.risk);
            const high = data.filter((r) => r.active && r.level === "High").length;
            const medium = data.filter((r) => r.active && r.level === "Medium").length;

            $("#fcCards").innerHTML = `
                <div class="card stat"><div class="ico">🔴</div><div><strong>${high}</strong><span>High risk</span><small>risk ≥ ${Math.round(meta.levels.high * 100)}%</small></div></div>
                <div class="card stat"><div class="ico">🟠</div><div><strong>${medium}</strong><span>Medium risk</span><small>risk ≥ ${Math.round(meta.levels.medium * 100)}%</small></div></div>
                <div class="card stat"><div class="ico">🤖</div><div><strong>${data.length}</strong><span>Predictions</span><small>${ms.toFixed(0)} ms in your browser</small></div></div>
                <div class="card stat"><div class="ico">📈</div><div><strong>${Math.round((meta.metrics?.accuracy || 0) * 100)}%</strong><span>Model accuracy</span><small>on ${esc(meta.trained_on)}</small></div></div>`;

            $("#fcRows").innerHTML = shown.length ? shown.map((r) => `
                <tr>
                    <td><strong>${esc(r.bank_name)}</strong><br><span class="sub">${esc(r.district)}</span></td>
                    <td><span class="blood-tag">${esc(r.blood_group)}</span></td>
                    <td>${esc(r.stock)} <span class="sub">(low ≤ ${esc(r.low_threshold)})</span></td>
                    <td>${esc(r.out7_per_day)}</td>
                    <td>${r.days_cover >= 30 ? "30+" : esc(r.days_cover)}</td>
                    <td><div style="display:flex;align-items:center;gap:8px"><div class="fc-bar fc-${r.level}" style="flex:1"><i style="width:${Math.round(r.risk * 100)}%"></i></div><strong>${Math.round(r.risk * 100)}%</strong></div></td>
                    <td><span class="fc-lv ${r.level}">${r.level}</span></td>
                </tr>`).join("") : `<tr><td colspan="7" class="muted-empty">Nothing to show for this filter.</td></tr>`;
        };

        const refresh = async () => {
            try {
                const res = await Admin.api("/bank-forecast")
                const out = predictAll(engine, res.rows);
                data = out.predictions;
                paint(out.ms);
                $("#fcStamp").textContent = `Updated ${new Date(res.generated_at).toLocaleTimeString()}`;
            } catch (error) {
                $("#fcRows").innerHTML = `<tr><td colspan="7" class="muted-empty">${esc(error.message)}</td></tr>`;
            }
        };

        try {
            engine = await loadEngine();
        } catch (error) {
            const missing = error.message === "MODEL_MISSING";
            container.innerHTML = `<div class="card"><h3>${missing ? "Model file not found" : "Could not start TensorFlow Lite"}</h3>
                <p class="fc-err">${missing
                    ? "Create the model first:\n1. Open Google Colab and run ml/train_shortage_model.py\n2. Put shortage_model.tflite and shortage_model.meta.json in client/models/\n3. Refresh this page"
                    : esc(error.message)}</p></div>`;
            return;
        }

        $("#fcLevel").addEventListener("change", (e) => { state.level = e.target.value; refresh(); });
        $("#fcIdle").addEventListener("change", (e) => { state.showIdle = e.target.checked; refresh(); });
        $("#fcRefresh").addEventListener("click", refresh);
        await refresh();

        // live: recompute every 60 seconds while this tab is on screen
        timer = setInterval(() => {
            if (!container.querySelector("#fcRows")) { clearInterval(timer); return; }   // user left this tab
            refresh();
        }, 60000);
    };

    window.BankForecast = { render, buildVector, levelOf };

    // its own page in the admin sidebar
    if (window.AdminShell) {
        AdminShell.register("bankforecast", async (el) => {
            el.innerHTML = `
                <div class="page-head"><h1>AI Stock Forecast</h1><p>Which blood groups are likely to run short at each blood bank in the next 7 days.</p></div>
                <div id="fcPage"></div>`;
            await render(el.querySelector("#fcPage"));
        });
    }
})();