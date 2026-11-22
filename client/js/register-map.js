// Address-to-Google-Maps helper used by the donor/recipient registration form.
document.addEventListener("DOMContentLoaded", async () => {
  const mapEl = document.getElementById("registrationMap");
  const address = document.getElementById("fullAddress");
  const division = document.getElementById("division");
  const district = document.getElementById("district");
  const upazila = document.getElementById("upazila");
  const postal = document.getElementById("postalCode");
  const lat = document.getElementById("latitude");
  const lng = document.getElementById("longitude");
  const status = document.getElementById("registrationMapStatus");
  if (!mapEl || !window.BloodLagbeMaps) return;
  let map, marker;
  try {
    await window.BloodLagbeMaps.load();
    mapEl.innerHTML = ""; map = await window.BloodLagbeMaps.createMap(mapEl, {lat:23.685,lng:90.3563}, 7);
  } catch (e) { mapEl.innerHTML=`<div class="map-loading-message">${e.message}</div>`; return; }
  let timer;
  async function update() {
    const parts=[address?.value, upazila?.value, district?.value, division?.value, postal?.value, "Bangladesh"].filter(Boolean);
    if (!parts.length || !address?.value.trim()) return;
    clearTimeout(timer); timer=setTimeout(async()=>{
      try {
        if(status) status.textContent="Locating your address…";
        const result=await window.BloodLagbeMaps.geocode(parts.join(", "));
        const position={lat:result.lat,lng:result.lng}; map.setView([position.lat,position.lng],15);
        if(marker) marker.remove(); marker=window.BloodLagbeMaps.dot(map,position,"#e50914","Selected registration address");
        lat.value=result.lat;lng.value=result.lng;if(status)status.textContent=`Located: ${result.formatted}`;
      } catch { if(status) status.textContent="Address could not be located yet. Add more address details."; }
    },500);
  }
  [address,division,district,upazila,postal].forEach(el=>el?.addEventListener("input",update));
  [division,district,upazila].forEach(el=>el?.addEventListener("change",update));
});
