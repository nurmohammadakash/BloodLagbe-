// Homepage visual effects only. No data, API or form logic lives here.
document.addEventListener("DOMContentLoaded", () => {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reading progress bar at the top of the page
  const bar = document.createElement("div");
  bar.className = "fx-progress";
  document.body.appendChild(bar);

  // Back-to-top button
  const topBtn = document.createElement("button");
  topBtn.type = "button";
  topBtn.className = "fx-top";
  topBtn.setAttribute("aria-label", "Back to top");
  topBtn.textContent = "↑";
  topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(topBtn);

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    topBtn.classList.toggle("show", window.scrollY > 700);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Floating blood drops inside the hero background
  const hero = document.querySelector(".hero");
  if (hero && !reduce) {
    const layer = document.createElement("div");
    layer.className = "fx-drops";
    for (let i = 0; i < 14; i++) {
      const d = document.createElement("span");
      d.className = "fx-drop";
      const size = 0.6 + Math.random() * 0.9;
      d.style.left = Math.random() * 100 + "%";
      d.style.width = 14 * size + "px";
      d.style.height = 18 * size + "px";
      d.style.animationDuration = 9 + Math.random() * 9 + "s";
      d.style.animationDelay = -Math.random() * 14 + "s";
      layer.appendChild(d);
    }
    hero.insertBefore(layer, hero.firstChild);
  }

  // Rating: friendly caption and face that react to hover/click (purely visual)
  const labels = ["Poor", "Fair", "Good", "Very good", "Excellent!"];
  const faces = ["😕", "🙂", "😊", "😍", "🤩"];
  const stars = Array.from(document.querySelectorAll(".rating-star"));
  const caption = document.getElementById("fxRatingLabel");
  const face = document.getElementById("fxRatingFace");
  let picked = 0;
  function show(v) {
    if (!caption || !face) return;
    caption.textContent = v ? labels[v - 1] : "Tap a star to rate";
    face.textContent = v ? faces[v - 1] : "🩸";
    face.classList.add("bump");
    setTimeout(() => face.classList.remove("bump"), 220);
  }
  stars.forEach((s) => {
    const v = Number(s.dataset.rating);
    s.addEventListener("mouseenter", () => show(v));
    s.addEventListener("click", () => { picked = v; show(v); });
  });
  const box = document.getElementById("ratingStars");
  if (box) box.addEventListener("mouseleave", () => show(picked));

  // Soft reveal for the new decorative blocks
  const targets = document.querySelectorAll(".rating-card, .team-section .section-heading");
  targets.forEach((el) => el.classList.add("fx-reveal"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add("in"));
  }
});
