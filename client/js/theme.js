(() => {
  const saved = localStorage.getItem("bloodLagbeTheme") || document.body?.dataset.defaultTheme || "dark";
  document.documentElement.dataset.theme = saved;
  document.body.classList.toggle("light-mode", saved === "light");
  const sync = () => {
    const light = document.body.classList.contains("light-mode");
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
      btn.textContent = light ? "🌙 Dark" : "☀️ Light";
      btn.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
    });
  };
  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.toggle("light-mode", saved === "light");
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => btn.addEventListener("click", () => {
      const next = document.body.classList.contains("light-mode") ? "dark" : "light";
      localStorage.setItem("bloodLagbeTheme", next);
      document.documentElement.dataset.theme = next;
      document.body.classList.toggle("light-mode", next === "light");
      sync();
    }));
    sync();
  });
})();
