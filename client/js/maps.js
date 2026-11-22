window.BloodLagbeMaps = (() => {
  let loaderPromise;
  function load() {
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (loaderPromise) return loaderPromise;
    loaderPromise = fetch("/api/public/google-maps-config")
      .then(r => r.json())
      .then(config => {
        if (!config.key) throw new Error("Google Maps API key is not configured. Add GOOGLE_MAPS_API_KEY to .env.");
        return new Promise((resolve, reject) => {
          const callback = `bloodLagbeMapsCallback_${Date.now()}`;
          window[callback] = () => { delete window[callback]; resolve(window.google.maps); };
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.key)}&callback=${callback}&libraries=geometry`;
          script.async = true; script.defer = true;
          script.onerror = () => reject(new Error("Google Maps failed to load."));
          document.head.appendChild(script);
        });
      });
    return loaderPromise;
  }
  async function geocode(address) {
    await load();
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => geocoder.geocode({ address, region: "BD" }, (results, status) => {
      if (status === "OK" && results[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng(), formatted: results[0].formatted_address });
      } else reject(new Error("Address could not be located on Google Maps."));
    }));
  }
  return { load, geocode };
})();
