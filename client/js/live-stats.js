// Live homepage numbers: reads /api/public/stats and shows them as rolling odometer digits.
// Elements opt in with data-live="users|banks|requests|lives" (optional data-suffix="+").
document.addEventListener("DOMContentLoaded", () => {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const REFRESH_MS = 10000; // how often the numbers are checked again

  // Styles for the rolling digits (kept here so this file is self-contained)
  const css = document.createElement("style");
  css.textContent = `
    .odo{display:inline-flex;align-items:center;line-height:1;vertical-align:bottom}
    .odo-col{display:inline-block;height:1em;overflow:hidden;position:relative}
    .odo-strip{display:block;will-change:transform}
    .odo-strip span{display:block;height:1em;line-height:1em;text-align:center}
    .odo-sep,.odo-suffix{display:inline-block;line-height:1em}
    .stat-number.odo-on{background:none!important;-webkit-text-fill-color:currentColor!important;color:#fff;
      text-shadow:0 0 22px rgba(229,9,20,.45);font-variant-numeric:tabular-nums}
    body.light-mode .stat-number.odo-on{color:#111827;text-shadow:none}
    .trust-item strong.odo-on{background:none!important;-webkit-text-fill-color:currentColor!important;color:#fff}
    body.light-mode .trust-item strong.odo-on{color:#111827}
        /* The hero rule '.trust-item span' would shrink and grey the digits, so reset it inside the odometer */
    .odo,.odo span{font-size:inherit!important;color:inherit!important;margin:0!important;font-weight:inherit!important}
    .odo-flash{animation:odoFlash .9s ease}
    @keyframes odoFlash{0%{filter:brightness(2.2)}100%{filter:brightness(1)}}
  `;
  document.head.appendChild(css);

  // One rolling-digit number
  function Odometer(el, suffix) {
    this.el = el;
    this.suffix = suffix || "";
    this.value = null;
    this.cols = [];
    el.classList.add("odo-on");
    this.box = document.createElement("span");
    this.box.className = "odo";
    el.textContent = "";
    el.appendChild(this.box);
  }

  Odometer.prototype.build = function (text) {
    // Rebuild the columns when the amount of digits changes; start every digit at 0
    this.box.textContent = "";
    this.cols = [];
    for (const ch of text) {
      if (ch === ",") {
        const sep = document.createElement("span");
        sep.className = "odo-sep";
        sep.textContent = ",";
        this.box.appendChild(sep);
        continue;
      }
      const col = document.createElement("span");
      col.className = "odo-col";
      const strip = document.createElement("span");
      strip.className = "odo-strip";
      for (let i = 0; i < 30; i++) {
        const cell = document.createElement("span");
        cell.textContent = String(i % 10);
        strip.appendChild(cell);
      }
      col.appendChild(strip);
      this.box.appendChild(col);
      this.cols.push({ strip, pos: 0 });
    }
    if (this.suffix) {
      const suf = document.createElement("span");
      suf.className = "odo-suffix";
      suf.textContent = this.suffix;
      this.box.appendChild(suf);
    }
  };

  // Roll every digit to its new value. Digits spin extra turns, like a counting machine.
  Odometer.prototype.set = function (n, animate) {
    const text = Number(n).toLocaleString("en-US");
    const digits = text.replace(/,/g, "");
    const rebuilt = this.value === null || digits.length !== this.cols.length;
    if (rebuilt) this.build(text);
    const spins = animate && !reduce;
    const total = this.cols.length;
    // Force the browser to apply the starting position before we start the roll
    void this.box.offsetWidth;
    this.cols.forEach((c, i) => {
      const d = Number(digits[i]);
      const from = c.pos;
      // Target cell: same digit, one or two full turns ahead
      let target = from <= d ? d : d + 10;
      if (spins && (rebuilt || d !== from)) target += 10;
      if (target > 29) target -= 10;
      const changed = target !== from;
      if (!changed) return;
      const strip = c.strip;
      if (spins) {
        // Right-most digits finish first, left-most last
        const duration = 1.1 + (total - 1 - i) * 0.18 + Math.random() * 0.15;
        strip.style.transition = `transform ${duration}s cubic-bezier(.17,.8,.25,1)`;
      } else {
        strip.style.transition = "none";
      }
      strip.style.transform = `translateY(${-target}em)`;
      c.pos = target;
      const settle = () => {
        // Reset to the first turn so the strip never runs out of cells
        strip.style.transition = "none";
        strip.style.transform = `translateY(${-d}em)`;
        c.pos = d;
        strip.removeEventListener("transitionend", settle);
      };
      if (spins) {
        strip.addEventListener("transitionend", settle);
        setTimeout(settle, 3500); // safety: always settle even if the event is missed
      }
      else { strip.style.transform = `translateY(${-d}em)`; c.pos = d; }
    });
    if (!rebuilt && spins) {
      this.el.classList.remove("odo-flash");
      void this.el.offsetWidth;
      this.el.classList.add("odo-flash");
    }
    this.value = Number(n);
  };

  // Find the elements that show live numbers
  const items = Array.from(document.querySelectorAll("[data-live]")).map((el) => ({
    key: el.dataset.live,
    el,
    odo: new Odometer(el, el.dataset.suffix || ""),
    shown: false,
    visible: false,
  }));
  if (!items.length) return;
  items.forEach((it) => it.odo.set(0, false));

  let latest = null;

  function render() {
    if (!latest) return;
    items.forEach((it) => {
      const value = latest[it.key];
      if (typeof value !== "number") return;
      // First time: count up from 0 when the number scrolls into view. Later: roll only if changed.
      if (!it.shown) {
        if (!it.visible) return;
        it.shown = true;
        // Reset to a fresh 0 so the first display always spins up from zero
        it.odo.value = null;
        it.odo.set(value, true);
      } else if (it.odo.value !== value) {
        it.odo.set(value, true);
      }
    });
  }

  // Start the count-up when each number becomes visible
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const it = items.find((x) => x.el === e.target);
        if (it) { it.visible = true; render(); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    items.forEach((it) => io.observe(it.el));
  } else {
    items.forEach((it) => { it.visible = true; });
  }

  async function load() {
    try {
      const res = await fetch("/api/public/stats", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) return;
      data.lives = data.lives_helped;
      data.support = 24; // round-the-clock support is a fixed value
      latest = data;
      render();
    } catch (e) {
      console.warn("Live statistics unavailable", e);
    }
  }

  load();
  setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
});