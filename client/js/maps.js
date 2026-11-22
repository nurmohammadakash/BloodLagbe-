// Map helper using Leaflet + OpenStreetMap (free, no API key needed).
window.BloodLagbeMaps = (() => {
  let loaderPromise;
  const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

  // Load the Leaflet stylesheet and script once, then resolve with the global L object
  function load() {
    if (window.L) return Promise.resolve(window.L);
    if (loaderPromise) return loaderPromise;
    loaderPromise = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
      const script = document.createElement("script");
      script.src = LEAFLET_JS;
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error("Map failed to load. Check your internet connection."));
      document.head.appendChild(script);
    });
    return loaderPromise;
  }

  // Create a map (CARTO/OpenStreetMap tiles) inside the given element
  async function createMap(el, center, zoom) {
    const L = await load();
    // Never create two maps in the same box (avoids "Map container is already initialized")
    if (el._blMap) return el._blMap;
    // Remove the "Loading map..." text that sits inside the box
    el.querySelectorAll(".map-loading-message, .map-error").forEach(n => n.remove());
    // Keep Leaflet controls below the fixed navbar
    el.style.isolation = "isolate";
    const map = L.map(el).setView([center.lat, center.lng], zoom);
    el._blMap = map;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      // Send the site address as Referer so OpenStreetMap accepts the tile requests
      referrerPolicy: "strict-origin-when-cross-origin",
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    // Recalculate the map size after layout/animation settles, and whenever the box resizes
    setTimeout(() => map.invalidateSize(), 400);
    setTimeout(() => map.invalidateSize(), 1500);
    if (window.ResizeObserver) new ResizeObserver(() => map.invalidateSize()).observe(el);
    return map;
  }

  // Round marker, so we do not depend on Leaflet's default image files
  function dot(map, pos, color, title) {
    return window.L.circleMarker([pos.lat, pos.lng], {
      radius: 9, color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 1
    }).bindTooltip(title || "").addTo(map);
  }

  // Convert an address to latitude/longitude using OpenStreetMap Nominatim.
  // If the full address is not found, retry with fewer parts (street first, then area only).
  async function geocode(address) {
    const parts = address.split(",").map(x => x.trim()).filter(Boolean);
    for (let i = 0; i < parts.length - 1; i++) {
      const query = parts.slice(i).join(", ");
      const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=bd&q=" + encodeURIComponent(query);
      const res = await fetch(url, { headers: { Accept: "application/json" }, referrerPolicy: "strict-origin-when-cross-origin" });
      const data = await res.json();
      if (data.length) return { lat: Number(data[0].lat), lng: Number(data[0].lon), formatted: data[0].display_name };
    }
    throw new Error("Address could not be located on the map.");
  }

  return { load, createMap, dot, geocode };
})();