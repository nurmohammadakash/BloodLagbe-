document.addEventListener("DOMContentLoaded", () => {
  const $=id=>document.getElementById(id), form=$("bloodBankRegisterForm");
  const division=$("bankDivision"), district=$("bankDistrict"), upazila=$("bankUpazila");
  const locations=window.BangladeshLocations||{};
  Object.keys(locations).forEach(name=>division.add(new Option(name,name)));
  division.addEventListener("change",()=>{district.innerHTML='<option value="">Select district</option>';upazila.innerHTML='<option value="">Select district first</option>';upazila.disabled=true;Object.keys(locations[division.value]||{}).forEach(name=>district.add(new Option(name,name)));district.disabled=false;geocode();});
  district.addEventListener("change",()=>{upazila.innerHTML='<option value="">Select upazila/thana</option>';Object.keys(locations[division.value]||{}).length&&(locations[division.value][district.value]||[]).forEach(name=>upazila.add(new Option(name,name)));upazila.disabled=false;geocode();});
  upazila.addEventListener("change",geocode);
  [$("bankAddress"),$("bankPostalCode")].forEach(el=>el.addEventListener("input",geocode));

  let map,marker,timer;
  async function initMap(){
    try{await window.BloodLagbeMaps.load();map=new google.maps.Map($("bankMap"),{center:{lat:23.685,lng:90.3563},zoom:7,mapTypeControl:false,streetViewControl:false});}
    catch(e){$("bankMap").innerHTML=`<div class="map-loading-message">${e.message}</div>`;}
  }
  async function geocode(){
    if(!map||!$("bankAddress").value.trim())return; clearTimeout(timer);timer=setTimeout(async()=>{try{const parts=[$("bankAddress").value,upazila.value,district.value,division.value,$("bankPostalCode").value,"Bangladesh"].filter(Boolean);const r=await window.BloodLagbeMaps.geocode(parts.join(", "));const pos={lat:r.lat,lng:r.lng};map.setCenter(pos);map.setZoom(15);if(marker)marker.setMap(null);marker=new google.maps.Marker({map,position:pos,title:"Blood Bank address"});$("bankLatitude").value=r.lat;$("bankLongitude").value=r.lng;$("bankMapStatus").textContent=`Located: ${r.formatted}`;}catch{$("bankMapStatus").textContent="Address could not be located yet. Add more details.";}},450);
  }
  initMap();

  let usernameTimer;
  $("bankUsername").addEventListener("input",()=>{clearTimeout(usernameTimer);const value=$("bankUsername").value.trim();const out=$("usernameStatus");if(value.length<3){out.textContent="";return;}usernameTimer=setTimeout(async()=>{try{const r=await fetch(`/api/public/username-check?username=${encodeURIComponent(value)}`);const d=await r.json();if(d.available){out.textContent="Username is available.";out.style.color="#64d88a";}else{out.textContent=`Username exists. Suggestions: ${d.suggestions.filter(x=>x!==value).slice(0,4).join(", ")||"try another username"}`;out.style.color="#ff5360";}}catch{out.textContent="Could not check username right now.";}},350);});

  form.addEventListener("submit",async e=>{e.preventDefault();const msg=$("bankMessage");const password=$("bankPassword").value,confirm=$("bankConfirmPassword").value;if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password))return msg.textContent="Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";if(password!==confirm)return msg.textContent="Passwords do not match.";if(!$("bankTerms").checked)return msg.textContent="You must agree to the Terms & Conditions and Privacy Policy.";const data={blood_bank_name:$("bloodBankName").value.trim(),license_number:$("licenseNumber").value.trim(),email:$("bankEmail").value.trim().toLowerCase(),contact:$("bankContact").value.trim(),division:division.value,district:district.value,upazila:upazila.value,postal_code:$("bankPostalCode").value.trim(),address:$("bankAddress").value.trim(),username:$("bankUsername").value.trim(),password,confirmPassword:confirm,latitude:$("bankLatitude").value||null,longitude:$("bankLongitude").value||null};const button=$("bankRegisterButton");button.disabled=true;button.textContent="Creating Account…";try{const r=await fetch("/api/bloodbank/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const d=await r.json();if(!r.ok||!d.success){msg.textContent=d.message||d.errors?.map(x=>x.msg).join(" ")||"Registration failed.";return;}sessionStorage.setItem("bloodLagbeVerificationEmail",data.email);sessionStorage.setItem("bloodLagbeVerificationType","bloodbank");msg.textContent=d.message||"Registration successful. Check your email for the OTP.";setTimeout(()=>window.location.href="/verify-email",1000);}catch(err){msg.textContent=err.message||"Unable to connect to server.";}finally{button.disabled=false;button.textContent="Create Account →";}});
});
