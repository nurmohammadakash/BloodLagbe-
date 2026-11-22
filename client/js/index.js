document.addEventListener("DOMContentLoaded", () => {
  const escapeHtml = v => String(v ?? "").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const authDestination = () => localStorage.getItem("bloodLagbeToken") ? "/dashboard" : "/login";

  document.querySelectorAll(".respond-auth").forEach(btn => btn.addEventListener("click", () => {
    window.location.href = authDestination();
  }));

  async function loadRequests(){
    try{
      const r=await fetch("/api/public/urgent-requests"),d=await r.json();
      if(!d.success||!d.requests?.length)return;
      const grid=document.querySelector(".request-grid"); if(!grid)return;
      grid.innerHTML=d.requests.slice(0,3).map(x=>`<article class="request-card"><div class="blood-type">${escapeHtml(x.blood_group)}</div><div class="request-info"><div class="request-status">${escapeHtml(x.urgency_level||"URGENT")}</div><h3>${escapeHtml(x.patient_name||"Blood Needed")}</h3><p>📍 ${escapeHtml(x.hospital_name||x.hospital_address||"Location")}</p><span class="request-time">${escapeHtml(x.required_date||"Recently")}</span></div><button class="respond-btn respond-auth" type="button">Respond</button></article>`).join("");
      grid.querySelectorAll(".respond-auth").forEach(btn=>btn.addEventListener("click",()=>window.location.href=authDestination()));
    }catch{}
  }
  loadRequests();

  const stars=[...document.querySelectorAll(".rating-star")], message=document.getElementById("ratingMessage");
  let selected=0;
  const paint=v=>stars.forEach(s=>s.classList.toggle("active",Number(s.dataset.rating)<=v));
  stars.forEach(s=>{
    s.addEventListener("mouseenter",()=>paint(Number(s.dataset.rating)));
    s.addEventListener("click",async()=>{
      selected=Number(s.dataset.rating); paint(selected);
      try{const r=await fetch("/api/public/rating",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rating:selected})});const d=await r.json();message.textContent=d.message||"Thank you for rating Blood-Lagbe!";}
      catch{message.textContent="Your rating could not be saved right now.";}
    });
  });
  document.getElementById("ratingStars")?.addEventListener("mouseleave",()=>paint(selected));

  const filter=document.getElementById("bloodGroupFilter"), mapEl=document.getElementById("bloodMap");
  let map,userMarker=[],donorMarkers=[];
  let current={lat:22.3569,lng:91.7832};

  function markerIcon(color="#e50914"){return {path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:color,fillOpacity:1,strokeColor:"#fff",strokeWeight:2};}
  function drawUser(pos){
    userMarker.forEach(m=>m.setMap(null)); userMarker=[];
    userMarker.push(new google.maps.Marker({map,position:pos,title:"Your current location",icon:markerIcon("#111827"),zIndex:999}));
  }
  async function loadDonors(){
    if(!map)return;
    const group=filter?.value||"";
    if(!group){
      donorMarkers.forEach(m=>m.setMap(null));donorMarkers=[];
      return;
    }
    try{
      const url=`/api/public/donors?blood_group=${encodeURIComponent(group)}&latitude=${current.lat}&longitude=${current.lng}&radius_km=5`;
      const r=await fetch(url),d=await r.json();
      donorMarkers.forEach(m=>m.setMap(null));donorMarkers=[];
      if(!d.success)return;
      d.donors.forEach(donor=>{
        if(!Number.isFinite(Number(donor.latitude)))return;
        const pos={lat:Number(donor.latitude),lng:Number(donor.longitude)};
        const marker=new google.maps.Marker({map,position:pos,title:`${donor.username} • ${donor.blood_group}`,icon:markerIcon("#e50914")});
        const info=new google.maps.InfoWindow({content:`<div style="padding:7px"><strong>${escapeHtml(donor.username)}</strong><br>${escapeHtml(donor.blood_group)} donor<br><small>Within 5 km</small></div>`});
        marker.addListener("click",()=>info.open({map,anchor:marker}));donorMarkers.push(marker);
      });
      if(d.donors.length){const bounds=new google.maps.LatLngBounds();bounds.extend(current);d.donors.forEach(x=>x.latitude&&bounds.extend({lat:Number(x.latitude),lng:Number(x.longitude)}));map.fitBounds(bounds,{top:80,right:50,bottom:50,left:50});}
    }catch(e){console.warn("Nearby donor search unavailable",e);}
  }
  async function initMap(){
    if(!mapEl||!window.BloodLagbeMaps)return;
    try{
      await window.BloodLagbeMaps.load();
      map=new google.maps.Map(mapEl,{center:current,zoom:13,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,gestureHandling:"greedy"});
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(p=>{current={lat:p.coords.latitude,lng:p.coords.longitude};map.setCenter(current);drawUser(current);loadDonors();},()=>{drawUser(current);},{enableHighAccuracy:true,timeout:10000});
      }else drawUser(current);
    }catch(e){mapEl.innerHTML=`<div class="map-error">${escapeHtml(e.message)}</div>`;}
  }
  filter?.addEventListener("change",()=>{
    if(window.gsap)gsap.fromTo("#bloodFilterBox",{rotationX:-8,y:-4},{rotationX:0,y:0,duration:.55,ease:"back.out(2)"});
    loadDonors();
  });
  initMap();

  // Make the navigation feel like a floating 3D object.
  const nav=document.getElementById("floatingNav");
  if(nav&&window.gsap){
    gsap.to(nav,{y:-5,duration:2.8,ease:"sine.inOut",repeat:-1,yoyo:true});
    nav.addEventListener("mousemove",e=>{const r=nav.getBoundingClientRect(),rx=((e.clientY-r.top)/r.height-.5)*-5,ry=((e.clientX-r.left)/r.width-.5)*7;gsap.to(nav,{rotationX:rx,rotationY:ry,duration:.25,overwrite:true});});
    nav.addEventListener("mouseleave",()=>gsap.to(nav,{rotationX:0,rotationY:0,duration:.45,ease:"power3.out"}));
  }
});