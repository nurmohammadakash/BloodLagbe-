document.addEventListener("DOMContentLoaded",()=>{
  if(!window.gsap)return;if(window.ScrollTrigger)gsap.registerPlugin(ScrollTrigger);
  const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if(reduce)return;
  gsap.fromTo("body",{opacity:0},{opacity:1,duration:.5,ease:"power2.out"});
  const reveal=gsap.utils.toArray(".hero-content>*:not(.hero-trust),.stat-card,.request-card,.map-filter-box,.blood-map,.video-card,.site-rating .section-heading,.cta-content,.footer-main,.developer-card");
  reveal.forEach((el,i)=>gsap.fromTo(el,{opacity:0,y:34,rotateX:6},{opacity:1,y:0,rotateX:0,duration:.75,delay:Math.min(i*.045,.5),ease:"power3.out",scrollTrigger:window.ScrollTrigger?{trigger:el,start:"top 88%",once:true}:undefined}));
  // Fallback stagger when ScrollTrigger is not loaded.
  if(!window.ScrollTrigger)gsap.fromTo(reveal,{opacity:0,y:20},{opacity:1,y:0,duration:.7,stagger:.035,ease:"power3.out"});
  gsap.to(".blood-glow",{scale:1.12,opacity:.95,duration:2.4,repeat:-1,yoyo:true,ease:"sine.inOut"});
  gsap.to(".blood-drop-container",{y:-12,rotationZ:.8,duration:3.6,repeat:-1,yoyo:true,ease:"sine.inOut"});
  gsap.to(".pulse-dot",{scale:1.7,opacity:.5,duration:.8,repeat:-1,yoyo:true,ease:"sine.inOut"});
  const path=document.getElementById("ecgPath");
  if(path){const len=path.getTotalLength();gsap.set(path,{strokeDasharray:len,strokeDashoffset:len});gsap.to(path,{strokeDashoffset:0,duration:1.15,ease:"none",repeat:-1,repeatDelay:.45});}
  gsap.utils.toArray(".btn,.respond-btn,.rating-star,.theme-toggle,.nav-signup").forEach(el=>{
    el.addEventListener("mouseenter",()=>gsap.to(el,{y:-3,scale:1.025,duration:.22,ease:"power2.out"}));
    el.addEventListener("mouseleave",()=>gsap.to(el,{y:0,scale:1,duration:.25,ease:"power2.out"}));
    el.addEventListener("click",()=>gsap.fromTo(el,{scale:.96},{scale:1,duration:.35,ease:"back.out(3)"}));
  });
});