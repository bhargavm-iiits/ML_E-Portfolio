import { projects, roles, flows } from './data.js';
import { artwork } from './art.js';
import { createScene, DECK_LABELS, JOURNEY } from './scene.js';
import { mountLoader } from './loader.js';

const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const {gsap,ScrollTrigger,SplitText,CustomEase,Lenis}=window;
const hasGsap=!!(gsap&&ScrollTrigger&&SplitText);
if(hasGsap){gsap.registerPlugin(ScrollTrigger,SplitText,...(CustomEase?[CustomEase]:[]));if(CustomEase)CustomEase.create('expo','0.16,1,0.3,1');}
const EXPO=CustomEase?'expo':'power4.out';
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=reducedQuery.matches,paused=false,lastTrigger=null,lenis=null,velocity=0;
const header=$('.site-header');
// The loader mounts first, before the heavier main scene is built; the page stays inert until it exits.
const loaderQuery=new URLSearchParams(location.search).get('loader');
let resolvePageReady;const pageReady=new Promise(r=>{resolvePageReady=r;});
const pageRegions=[$('main'),$('.site-header'),$('.site-footer')];
pageRegions.forEach(el=>{el.inert=true;});$('main').setAttribute('aria-busy','true');
let loaderSeen=false;try{loaderSeen=sessionStorage.getItem('bm-loader-seen')==='1';}catch{}
const loader=mountLoader($('.ld'),pageReady,{mode:loaderQuery==='replay'?'replay':'normal',seek:loaderQuery==='seek'?Number(new URLSearchParams(location.search).get('t')||0):null,quick:loaderSeen&&!loaderQuery,reduced,onExit:()=>{
  pageRegions.forEach(el=>{el.inert=false;});$('main').removeAttribute('aria-busy');try{sessionStorage.setItem('bm-loader-seen','1');}catch{}
  clearInterval(loaderPoll);revealHero();}});
window.__bmLoader=loader;
const loaderPoll=setInterval(()=>loader.setTaskProgress('assets',loadProgress),120);

/* ---------- 3D scenes ---------- */
const deckTip=$('.deck-tip');let pointerX=0,pointerY=0;
addEventListener('pointermove',e=>{pointerX=e.clientX;pointerY=e.clientY;if(deckTip.classList.contains('is-on'))placeTip();},{passive:true});
function placeTip(){deckTip.style.transform=`translate3d(${pointerX+22}px,${pointerY-18}px,0)`;}
var loadProgress=0;
const scene=createScene($('#scene'),{reduced,content:{projects,flows,artwork},onPanelHover:i=>{
  if(i<0){deckTip.classList.remove('is-on');return;}
  $('.deck-tip-num').textContent=`PROJECT ${pad(i+1)}`;$('.deck-tip-name').textContent=projects[i].name.toUpperCase();placeTip();deckTip.classList.add('is-on');
},onProgress:p=>{loadProgress=p;},onFailure:()=>{$('.scene-fallback').hidden=false;$('#scene').hidden=true;},onHover:i=>{
  if(i<0){deckTip.classList.remove('is-on');document.body.style.cursor='';return;}
  $('.deck-tip-num').textContent=`DECK ${pad(i+1)}`;$('.deck-tip-name').textContent=DECK_LABELS[i];placeTip();deckTip.classList.add('is-on');
}});
const contactScene=createScene($('#contact-scene'),{reduced,compact:true,onFailure:()=>{$('.contact-scene').hidden=true;}});

/* ---------- Content ---------- */
const stageHtml=stages=>stages.map(([label,kind],k)=>`<span class="stage ${kind}" style="--i:${k}"><span aria-hidden="true">${kind==='in'?'›':kind==='gate'?'✓':'·'}</span>${label}</span>${k<stages.length-1?'<span class="stage-arrow" aria-hidden="true">→</span>':''}`).join('');
const branchHtml=b=>b?`<div class="branch"><span aria-hidden="true">↳</span><span class="branch-chip">! ${b}</span></div>`:'';
const N=projects.length;
const charSpans=t=>[...t].map((c,k)=>c===' '?' ':`<span class="ch" style="--c:${k}">${c}</span>`).join('');
$('#project-list').innerHTML=projects.map((p,i)=>`<article class="g-card ${i%2?'is-right':'is-left'}" data-index="${i}" data-lenis-prevent aria-labelledby="proj-${p.id}">
  <p class="g-count mono" data-in style="--d:0"><span class="deck-num">${pad(i+1)}</span> / ${pad(N)} · <span class="deck-cat">${p.category}</span></p>
  <h3 class="g-name${p.name.length>14?' is-long':''}" id="proj-${p.id}" aria-label="${p.name}"><span aria-hidden="true">${charSpans(p.name)}</span></h3>
  <p class="g-summary" data-in style="--d:1">${p.summary}</p>
  <button type="button" class="g-more-toggle mono" aria-expanded="false" data-in style="--d:2">Inside the system <span aria-hidden="true">+</span></button>
  <div class="g-more">
    <ol class="g-facts" data-in style="--d:2">${p.facts.map((x,k)=>`<li><span class="mono">${pad(k+1)}</span>${x}</li>`).join('')}</ol>
    <div class="g-notes" data-in style="--d:3"><div class="note decision"><p class="note-label mono">✓ ENGINEERING DECISION</p><p>${p.design}</p></div><div class="note scope"><p class="note-label mono">! EVIDENCE &amp; SCOPE</p><p>${p.evidence}</p></div></div>
  </div>
  <div class="g-actions" data-in style="--d:4"><a class="button primary magnetic" href="https://github.com/bhargavm-iiits/${p.repo}" target="_blank" rel="noopener noreferrer"><span class="roll" data-roll="View source">View source</span><span aria-hidden="true">↗</span></a><a class="text-link" href="mailto:bhargav.m23@iiits.in?subject=${encodeURIComponent('Let’s discuss '+p.name)}"><span class="roll" data-roll="Discuss">Discuss</span> <span aria-hidden="true">↗</span></a></div>
  <p class="g-sources mono" data-in style="--d:5">STACK · ${p.stack.join(' · ')}<br>SOURCES · ${p.sources.join(' · ')}</p>
</article>`).join('');
$('.deck-index').innerHTML=projects.map((p,i)=>`<button type="button" data-jump="${i}"${i===0?' aria-current="true"':''}><span class="mono">${pad(i+1)}</span><span class="deck-index-name">${p.name}</span></button>`).join('');
$$('.g-more-toggle').forEach(b=>b.addEventListener('click',()=>{const open=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(open));b.closest('.g-card').classList.toggle('show-more',open);b.querySelector('span').textContent=open?'−':'+';}));

// Text roll duplicates a label once; the copy is hidden from assistive technology.
function rollify(root=document){
  $$('.roll:not([data-rolled]),.main-nav a:not([data-rolled])',root).forEach(el=>{el.dataset.rolled='';const t=el.textContent.trim();el.innerHTML=`<span class="roll-inner"><span>${t}</span><span aria-hidden="true">${t}</span></span>`;});
}
rollify();

/* ---------- Dialogs ---------- */
function openDialog(dialog,trigger){lastTrigger=trigger;dialog.showModal();lenis?.stop();document.documentElement.style.overflow='hidden';dialog.querySelector('.close-dialog').focus();}
$$('dialog').forEach(dialog=>{
  dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{document.documentElement.style.overflow='';lenis?.start();lastTrigger?.focus({preventScroll:true});});
  dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
});
$$('[data-resume]').forEach(b=>b.addEventListener('click',()=>{closeMenu();openDialog($('#resume-dialog'),b);}));

/* ---------- Approach ---------- */
const captions=[['Source-linked by design','ClaimBridge preserves PDF page provenance and reconciles extracted facts against structured records.'],['Give the model boundaries','Payer/date-filtered retrieval and structured outputs connect relevant context to a bounded generation step.'],['Acceptance is an explicit step','FixProof uses ordered static checks and isolated tests. ClaimBridge keeps reviewer approval and audit history.']];
const NODE_STATE=[[2,0,0,0],[1,2,0,0],[1,1,2,2]];let currentStep=-1;
function setStep(step){
  if(step===currentStep)return;currentStep=step;
  $$('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===step)));
  $$('.flow-node').forEach((n,i)=>{const s=NODE_STATE[step][i];n.classList.toggle('active',s===2);n.classList.toggle('done',s===1);n.querySelector('b').textContent=s===2?'●':s===1?'✓':'○';n.querySelector('.node-state').textContent=s===2?'ACTIVE STEP':s===1?'GROUNDED':'PENDING';});
  $('#pipeline-caption-title').textContent=captions[step][0];$('#pipeline-caption-body').textContent=captions[step][1];
  if(hasGsap&&!reduced)gsap.fromTo('.pipeline-caption > *',{opacity:0,y:12},{opacity:1,y:0,duration:.6,ease:EXPO,stagger:.06,overwrite:true});
}
let approachTrigger=null;
$$('[data-step]').forEach(b=>b.addEventListener('click',()=>{
  const step=Number(b.dataset.step);
  if(approachTrigger&&lenis){const t=approachTrigger;lenis.scrollTo(t.start+(t.end-t.start)*((step+.5)/3),{duration:1.2});}
  setStep(step);
}));
setStep(0);

/* ---------- Capabilities ---------- */
const roleShort={ai:'AI-engineering',data:'data-engineering',ml:'data-science & ML',xr:'application-development'};
function setRole(role,animate=true){
  if(role===currentRole&&animate)return;currentRole=role;
  const r=roles[role];$$('[data-role]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===role)));
  $('#role-content').innerHTML=`<p>${r.description}</p><div><p class="skill-label">SKILLS IN SCOPE</p><div class="skill-list">${r.skills.map(s=>`<span>${s}</span>`).join('')}</div></div><p class="role-evidence"><span aria-hidden="true">→</span>${r.evidence}</p><a class="role-download" href="assets/resumes/${r.resume}" download><span><strong>Download the ${roleShort[role]} résumé</strong><small>${r.resume}</small></span><b aria-hidden="true">↓</b></a>`;
  if(animate&&hasGsap&&!reduced){gsap.from('#role-content > *',{opacity:0,y:18,duration:.7,ease:EXPO,stagger:.06});gsap.from('#role-content .skill-list span',{opacity:0,scale:.85,duration:.5,ease:'back.out(2)',stagger:.025,delay:.1});}
}
const ROLE_ORDER=['ai','data','ml','xr'];let currentRole='ai',capTrigger=null;
$$('[data-role]').forEach(b=>b.addEventListener('click',()=>{const k=ROLE_ORDER.indexOf(b.dataset.role);if(capTrigger&&lenis){lenis.scrollTo(capTrigger.start+(capTrigger.end-capTrigger.start)*((k+.5)/4),{duration:1.2});}setRole(b.dataset.role);}));setRole('ai',false);

/* ---------- Menu, copy, motion toggle ---------- */
const menu=$('.menu-toggle');
function closeMenu(){if(menu.getAttribute('aria-expanded')!=='true')return;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');$('#mobile-nav').hidden=true;lenis?.start();}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');$('#mobile-nav').hidden=!open;if(open){lenis?.stop();$('#mobile-nav a').focus();}else lenis?.start();});
$$('#mobile-nav a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
$('#copy-email').addEventListener('click',async()=>{const s=$('#copy-status');try{await navigator.clipboard.writeText('bhargav.m23@iiits.in');s.classList.remove('fail');s.textContent='✓ Email address copied.';}catch{s.classList.add('fail');s.textContent='Copy is unavailable here. Email: bhargav.m23@iiits.in';}});
const creditsToggle=$('.credits-toggle');creditsToggle.addEventListener('click',()=>{const open=creditsToggle.getAttribute('aria-expanded')!=='true';creditsToggle.setAttribute('aria-expanded',String(open));$('#credits').hidden=!open;});
const motionButton=$('.motion-toggle');
motionButton.addEventListener('click',()=>{paused=!paused;motionButton.setAttribute('aria-pressed',String(paused));motionButton.setAttribute('aria-label',paused?'Resume animations':'Pause animations');$('.motion-label').textContent=paused?'Resume motion':'Pause motion';document.body.classList.toggle('motion-paused',paused);scene.setPaused(paused);contactScene.setPaused(paused);});

/* ---------- Anchors ---------- */
const headerOffset=()=>-(header.offsetHeight+16);
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');if(!a)return;const id=a.getAttribute('href');const el=id.length>1&&document.getElementById(id.slice(1));if(!el)return;
  e.preventDefault();closeMenu();
  if(lenis)lenis.scrollTo(el,{offset:id==='#home'||id==='#work'?0:headerOffset(),duration:1.8});else el.scrollIntoView({behavior:reduced?'auto':'smooth'});
  if(el.getAttribute('aria-hidden')!=='true'){if(!el.hasAttribute('tabindex'))el.tabIndex=-1;el.focus({preventScroll:true});}history.replaceState(null,'',id);
});

/* ---------- Journey ---------- */
// One scroll timeline drives the 3D camera and every overlay: hero → layers → corridor → eight projects → warp.
const journey=$('.journey'),stage=$('.journey-stage'),copies=$$('.stage-copy');
const gCards=$$('.g-card'),gIntro=$('.g-intro'),gOutro=$('.g-outro'),gHud=$('.g-hud'),gallery=$('.gallery-copy'),mark=$('#work');
const T=JOURNEY.T,G0=JOURNEY.G0;
const chapterNames=[['INTELLIGENCE CORE','DATA · MODELS · VERIFICATION'],['OPEN ARCHITECTURE','RETRIEVAL · REASONING · GUARDRAILS'],['VERIFICATION CORRIDOR','SOURCE · RETRIEVE · VALIDATE · REVIEW'],['SELECTED WORK','EIGHT SYSTEMS · ONE JOURNEY']];
const CHAPTER_AT=[0,1.0,2.6,G0+.25],CHAPTER_END=[.5,1.85,3.7,T];
let lastChapter=-1,journeyU=0,activeCard=-1,cinematic=false;
const span=()=>Math.max(1,journey.offsetHeight-stage.offsetHeight);
const band=(u,a,b,c,d)=>smooth(a,b,u)*(1-smooth(c,d,u));
const cardWindow=k=>{const at=G0+k;return k===0?[4.28,4.42,at+.52,at+.66]:k===N-1?[at-.08,at+.06,T-1.1,T-.95]:[at-.08,at+.06,at+.52,at+.66];};
function show(el,o,lift=24){el.style.opacity=o;el.inert=o<.5;el.style.pointerEvents=o>.5?'auto':'none';if(!reduced){el.style.translate=`0 ${(1-o)*-lift}px`;el.style.filter=o<.98?`blur(${(1-o)*8}px)`:'none';}}
function updateJourney(p){
  const u=p*T;journeyU=u;scene.update(u);
  if(!cinematic)return;
  show(copies[0],1-smooth(.3,.6,u),60);show(copies[1],band(u,.5,.8,1.5,1.8));show(copies[2],band(u,1.85,2.15,3.05,3.3));
  stage.style.setProperty('--corr',band(u,1.85,2.2,3.3,3.6).toFixed(3));
  show(gIntro,band(u,3.72,3.92,4.18,4.32),30);show(gOutro,band(u,T-1,T-.85,T-.4,T-.2),20);
  let act=-1;gCards.forEach((c,k)=>{const [a,b,cc,d]=cardWindow(k);const o=band(u,a,b,cc,d);c.style.opacity=o;c.inert=o<.5;c.style.pointerEvents=o>.5?'auto':'none';c.classList.toggle('is-on',o>.35);if(o>.5)act=k;});
  const inG=u>3.85&&u<T-1;gHud.classList.toggle('is-on',inG);gHud.inert=!inG;
  const focus=clamp((u-G0)/(N-1))*(N-1);const k=Math.min(N-1,Math.max(0,Math.floor(focus+.2)));
  if(k!==activeCard){activeCard=k;$$('[data-jump]').forEach((b,i)=>{if(i===k)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});$('.deck-meter-num').textContent=pad(k+1);}
  $('.deck-meter-bar span').style.transform=`scaleX(${clamp((u-G0)/(T-1-G0))})`;
  $('.scene-annotation').style.opacity=1-band(u,3.6,3.9,T,T+1);
  const chapter=u<CHAPTER_END[0]?0:u<CHAPTER_END[1]?1:u<CHAPTER_END[2]?2:3;
  $$('[data-chapter]').forEach((btn,i)=>{const a=i?CHAPTER_END[i-1]:0;btn.style.setProperty('--fill',clamp((u-a)/(CHAPTER_END[i]-a)));if(i===chapter)btn.setAttribute('aria-current','step');else btn.removeAttribute('aria-current');});
  if(chapter!==lastChapter){lastChapter=chapter;$('.journey-count').innerHTML=`0${chapter+1} <span>/ 04</span>`;scramble($('#core-label'),chapterNames[chapter][0]);$('#core-detail').textContent=chapterNames[chapter][1];}
}
function scrollToU(u,duration=1.6){const y=journey.offsetTop+span()*(u/T);if(lenis)lenis.scrollTo(y,{duration});else scrollTo({top:y,behavior:reduced?'auto':'smooth'});}
function placeMark(){
  // The #work anchor marks where the project gallery starts (or the static list when motion is off).
  if(cinematic){mark.style.top=`${span()*((G0-.45)/T)}px`;mark.style.height=`${span()*((T-1-G0+.45)/T)}px`;}
  else{mark.style.top=`${gallery.offsetTop}px`;mark.style.height=`${gallery.offsetHeight}px`;}
}
function setCinematic(on){
  cinematic=on;journey.classList.toggle('is-cinematic',on);
  if(!on){[...copies,gIntro,gOutro,...gCards].forEach(el=>{el.style.opacity='';el.inert=false;el.style.pointerEvents='';el.style.translate='';el.style.filter='';});copies.forEach((el,i)=>{if(i){el.inert=true;}});gCards.forEach(c=>c.classList.add('is-on'));gHud.inert=true;}
  else gCards.forEach(c=>c.classList.remove('is-on'));
  placeMark();
}
$$('[data-chapter]').forEach(b=>b.addEventListener('click',()=>scrollToU(CHAPTER_AT[Number(b.dataset.chapter)],1.8)));
$$('[data-jump]').forEach(b=>b.addEventListener('click',()=>scrollToU(G0+Number(b.dataset.jump)+.25,1.4)));
addEventListener('resize',()=>placeMark());

/* ---------- Text effects ---------- */
const GLYPHS='▚▞▖▗▘▝◇◆#/<>[]01';
function scramble(el,finalText=el.dataset.final||el.textContent){
  el.dataset.final=finalText;if(reduced||!hasGsap){el.textContent=finalText;return;}
  const len=finalText.length,o={p:0};gsap.killTweensOf(o);
  gsap.to(o,{p:1,duration:Math.min(1.2,.35+len*.025),ease:'power2.out',onUpdate(){const n=Math.floor(o.p*len);let s=finalText.slice(0,n);for(let i=n;i<len;i++)s+=finalText[i]===' '?' ':GLYPHS[(Math.random()*GLYPHS.length)|0];el.textContent=s;},onComplete(){el.textContent=finalText;}});
}

/* ---------- Scroll progress, header, section index ---------- */
const progressBar=$('.scroll-progress');
const sectionNames={home:'INTRO',work:'WORK',approach:'APPROACH',capabilities:'CAPABILITIES',experience:'EXPERIENCE',contact:'CONTACT'};
let lastY=scrollY;
function onScroll(y=scrollY){
  const max=document.documentElement.scrollHeight-innerHeight;progressBar.style.transform=`scaleX(${max>0?y/max:0})`;
  const dy=y-lastY;if(Math.abs(dy)>4){header.classList.toggle('is-hidden',dy>0&&y>innerHeight*.6&&!document.querySelector('dialog[open]'));lastY=y;}
}
const sectionObserver=new IntersectionObserver(entries=>{for(const e of entries){if(!e.isIntersecting)continue;const id=e.target.id;$$('.main-nav a').forEach(a=>a.classList.toggle('active',a.hash===`#${id}`));const keys=Object.keys(sectionNames);$('.section-index-num').textContent=pad(keys.indexOf(id));scramble($('.section-index-name'),sectionNames[id]);}},{rootMargin:'-40% 0px -55% 0px'});
$$('main>section[id]').forEach(s=>sectionObserver.observe(s));sectionObserver.observe(mark);

/* ---------- Motion system ---------- */
function intro(){
  // Readiness contract: main-scene assets loaded, its first frame rendered, and fonts ready.
  document.fonts?.ready.then(()=>loader.setTaskProgress('interface',1));
  Promise.all([scene.ready.then(()=>{loader.setTaskProgress('assets',1);}),document.fonts?.ready??Promise.resolve()])
    .then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
    .then(()=>{loader.setTaskProgress('render',1);resolvePageReady();});
}
function revealHero(){
  scene.playIntro?.();
  if(!hasGsap||reduced)return;
  const split=SplitText.create('.hero-title .line',{type:'chars',charsClass:'char',mask:'lines'});
  const tl=gsap.timeline({defaults:{ease:EXPO}});
  tl.from(split.chars,{yPercent:115,rotate:8,duration:1.3,stagger:.028},.35)
    .add(()=>scramble($('.hero-copy .eyebrow [data-scramble]')),.4)
    .from('.hero-description,.hero-actions,.hero-personal',{opacity:0,y:24,duration:1.1,stagger:.1},.8)
    .from('.site-header',{yPercent:-100,duration:1.1},.5)
    .from('.journey-footer,.scene-annotation',{opacity:0,y:16,duration:1},1.2)
    .add(()=>{split.revert();const h=$('.hero-title');h.classList.add('sheen');h.addEventListener('animationend',()=>h.classList.remove('sheen'),{once:true});});
}

function setupMotion(){
  if(!hasGsap){setCinematic(!reduced);addEventListener('scroll',()=>{onScroll();const r=journey.getBoundingClientRect();updateJourney(reduced?0:clamp(-r.top/span()));},{passive:true});updateJourney(0);onScroll();return;}
  const mm=gsap.matchMedia();
  mm.add({motion:'(prefers-reduced-motion: no-preference)',desktop:'(min-width: 761px)',wide:'(min-width: 1024px) and (min-height: 620px)',fine:'(hover: hover) and (pointer: fine)'},ctx=>{
    const {motion,desktop,wide,fine}=ctx.conditions;const cleanups=[];
    reduced=!motion;document.documentElement.classList.toggle('motion',motion);scene.setReduced(!motion);contactScene.setReduced(!motion);
    if(!motion){setCinematic(false);updateJourney(0);
      const s=()=>onScroll();addEventListener('scroll',s,{passive:true});return()=>removeEventListener('scroll',s);}

    // Smooth, inertial scrolling that keeps native scroll position and keyboard scrolling.
    if(Lenis){
      lenis=new Lenis({lerp:.085,smoothWheel:true,wheelMultiplier:.95,touchMultiplier:1.1});window.__lenis=lenis;
      lenis.on('scroll',e=>{ScrollTrigger.update();velocity=e.velocity;onScroll(e.scroll);});
      const raf=t=>lenis.raf(t*1000);gsap.ticker.add(raf);gsap.ticker.lagSmoothing(0);
      cleanups.push(()=>{gsap.ticker.remove(raf);lenis.destroy();lenis=null;window.__lenis=null;});
    }else{const s=()=>onScroll();addEventListener('scroll',s,{passive:true});cleanups.push(()=>removeEventListener('scroll',s));}

    setCinematic(true);
    const journeyTrigger=ScrollTrigger.create({trigger:journey,start:'top top',end:'bottom bottom',onUpdate:self=>updateJourney(self.progress),onRefresh:()=>placeMark()});updateJourney(journeyTrigger.progress);
    cleanups.push(()=>{journeyTrigger.kill();setCinematic(false);});
    gsap.ticker.add(feedVelocity);cleanups.push(()=>gsap.ticker.remove(feedVelocity));

    // Section headings rise line by line through a mask.
    $$('[data-split]').forEach(el=>SplitText.create(el,{type:'lines',mask:'lines',linesClass:'split-line',autoSplit:true,onSplit:self=>gsap.from(self.lines,{yPercent:110,rotate:2.5,duration:1.25,ease:EXPO,stagger:.09,scrollTrigger:{trigger:el,start:'top 86%',once:true}})}));
    $$('[data-scramble]').forEach(el=>{if(el.closest('.hero-copy'))return;ScrollTrigger.create({trigger:el,start:'top 92%',once:true,onEnter:()=>scramble(el)});});

    // The connecting statement lights word by word as it is read.
    const words=SplitText.create('[data-words]',{type:'words',wordsClass:'word'});
    gsap.to(words.words,{opacity:1,stagger:.08,ease:'none',scrollTrigger:{trigger:'.intro-strip',start:'top 80%',end:'bottom 55%',scrub:.6}});

    gsap.from('.intro-strip>div',{opacity:0,y:40,duration:1.2,ease:EXPO,scrollTrigger:{trigger:'.intro-strip',start:'top 75%',once:true}});

    // Approach: pinned while the three steps advance with scroll.
    if(desktop){
      const pin=$('.approach-pin');
      approachTrigger=ScrollTrigger.create({trigger:'#approach',start:()=>pin.offsetHeight>innerHeight?'bottom bottom':'top top',end:'+=160%',pin:pin,pinSpacing:true,anticipatePin:1,onUpdate:self=>{const p=self.progress;setStep(Math.min(2,Math.floor(p*3)));$$('.approach-step').forEach((b,i)=>b.querySelector('.step-bar').style.setProperty('--p',clamp(p*3-i)));}});
      cleanups.push(()=>{approachTrigger=null;$$('.step-bar').forEach(b=>b.style.removeProperty('--p'));});
    }
    // Capabilities: pinned while the four disciplines advance with scroll.
    if(desktop){
      const capPin=$('.capabilities-pin');
      capTrigger=ScrollTrigger.create({trigger:'#capabilities',start:()=>capPin.offsetHeight>innerHeight?'bottom bottom':'top top',end:'+=180%',pin:capPin,pinSpacing:true,anticipatePin:1,onUpdate:self=>{const k=Math.min(3,Math.floor(self.progress*4));setRole(ROLE_ORDER[k]);$$('.role-selector button').forEach((b,i)=>b.style.setProperty('--p',clamp(self.progress*4-i)));}});
      cleanups.push(()=>{capTrigger=null;});
    }
    gsap.fromTo('.orbit-rings',{rotate:-25},{rotate:25,transformOrigin:'50% 50%',ease:'none',scrollTrigger:{trigger:'#approach',start:'top bottom',end:'bottom top',scrub:true}});
    gsap.fromTo('.orbit-dots',{rotate:0},{rotate:220,transformOrigin:'50% 50%',ease:'none',scrollTrigger:{trigger:'#approach',start:'top bottom',end:'bottom top',scrub:true}});
    gsap.from('.flow-node',{opacity:0,y:30,duration:1,ease:EXPO,stagger:.08,scrollTrigger:{trigger:'.pipeline-panel',start:'top 85%',once:true}});
    gsap.from('.role-selector button',{opacity:0,x:-30,duration:1,ease:EXPO,stagger:.07,scrollTrigger:{trigger:'.role-selector',start:'top 85%',once:true}});
    gsap.from('#role-content',{opacity:0,y:40,duration:1.2,ease:EXPO,scrollTrigger:{trigger:'#role-content',start:'top 88%',once:true}});

    // Timeline rail fills with scroll; items slide in; school results count up.
    gsap.to('.timeline-rail span',{'--p':1,ease:'none',scrollTrigger:{trigger:'.timeline',start:'top 70%',end:'bottom 70%',scrub:.5}});
    $$('.timeline-item').forEach(el=>gsap.from(el.children,{opacity:0,x:40,duration:1.1,ease:EXPO,stagger:.1,scrollTrigger:{trigger:el,start:'top 85%',once:true}}));
    $$('[data-count]').forEach(el=>{const v=Number(el.dataset.count),o={v:0};ScrollTrigger.create({trigger:el,start:'top 90%',once:true,onEnter:()=>gsap.to(o,{v,duration:1.6,ease:'power3.out',onUpdate:()=>{el.textContent=`${o.v.toFixed(1)}%`;}})});});

    // Contact headline: characters rise in, then react to the pointer.
    const contactSplit=SplitText.create('[data-chars]',{type:'lines,words,chars',charsClass:'char',linesClass:'split-line',mask:'lines'});
    gsap.from(contactSplit.chars,{yPercent:110,duration:1.1,ease:EXPO,stagger:.016,scrollTrigger:{trigger:'#contact',start:'top 70%',once:true}});
    gsap.from('.contact-copy,.contact-actions',{opacity:0,y:30,duration:1.1,ease:EXPO,stagger:.1,scrollTrigger:{trigger:'#contact',start:'top 60%',once:true}});
    gsap.fromTo('.contact-scene',{yPercent:-38,rotate:-4},{yPercent:-62,rotate:4,ease:'none',scrollTrigger:{trigger:'#contact',start:'top bottom',end:'bottom top',scrub:true}});

    // Velocity-driven marquee: speeds up and reverses with the scroll direction.
    const track=$('.marquee-track');let mx=0,dir=-1;
    const marquee=()=>{if(paused)return;const half=track.scrollWidth/2;if(Math.abs(velocity)>.2)dir=velocity>0?-1:1;mx+=dir*(.6+Math.min(30,Math.abs(velocity))*.9);if(mx<=-half)mx+=half;if(mx>0)mx-=half;track.style.transform=`translate3d(${mx}px,0,0)`;};
    gsap.ticker.add(marquee);cleanups.push(()=>{gsap.ticker.remove(marquee);track.style.transform='';});
    if(fine)cleanups.push(setupPointer());
    return()=>{cleanups.forEach(f=>f());};
  });
}
function feedVelocity(){const v=lenis?lenis.velocity:0;velocity=v;scene.setVelocity(v);}

function setupPointer(){
  const offs=[];const on=(t,ev,fn,o)=>{t.addEventListener(ev,fn,o);offs.push(()=>t.removeEventListener(ev,fn,o));};
  // Cursor: a dot that tracks exactly and a ring that trails, labelled over projects.
  const cursor=$('.cursor'),dot=$('.cursor-dot'),ring=$('.cursor-ring'),label=$('.cursor-label');
  const dx=gsap.quickTo(dot,'x',{duration:.08}),dy=gsap.quickTo(dot,'y',{duration:.08}),rx=gsap.quickTo(ring,'x',{duration:.45,ease:'power3.out'}),ry=gsap.quickTo(ring,'y',{duration:.45,ease:'power3.out'});
  on(window,'pointermove',e=>{if(e.pointerType!=='mouse')return;dx(e.clientX);dy(e.clientY);rx(e.clientX);ry(e.clientY);cursor.classList.remove('is-hidden');
    const t=e.target.closest?.('a,button');const view=false;
    cursor.classList.toggle('is-view',!!view);cursor.classList.toggle('is-link',!!t&&!view);label.textContent=view?'OPEN':'';},{passive:true});
  on(document,'pointerleave',()=>cursor.classList.add('is-hidden'));
  // Magnetic buttons pull toward the pointer and spring back.
  $$('.magnetic').forEach(el=>{const x=gsap.quickTo(el,'x',{duration:.6,ease:'power3.out'}),y=gsap.quickTo(el,'y',{duration:.6,ease:'power3.out'});
    on(el,'pointermove',e=>{const r=el.getBoundingClientRect();x((e.clientX-r.left-r.width/2)*.3);y((e.clientY-r.top-r.height/2)*.4);});
    on(el,'pointerleave',()=>{gsap.to(el,{x:0,y:0,duration:1.1,ease:'elastic.out(1,.35)'});});});
  // Contact headline: letters near the pointer lift and turn lime.
  const title=$('.contact-title');let chars=[],rects=[];
  on(title,'pointerenter',()=>{chars=$$('.char',title);rects=chars.map(c=>{const r=c.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];});});
  on(title,'pointermove',e=>{chars.forEach((c,i)=>{const d=Math.hypot(e.clientX-rects[i][0],e.clientY-rects[i][1]);const k=Math.max(0,1-d/140);c.style.translate=`0 ${-k*16}px`;c.style.color=k>.55?'var(--lime)':'';});});
  on(title,'pointerleave',()=>chars.forEach(c=>{c.style.translate='';c.style.color='';}));
  return()=>{offs.forEach(f=>f());$$('.magnetic').forEach(el=>gsap.set(el,{x:0,y:0}));};
}

setupMotion();intro();onScroll();
addEventListener('pagehide',()=>{scene.dispose();contactScene.dispose();});
