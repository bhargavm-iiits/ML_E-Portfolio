import { projects,roles } from './data.js';
import { artwork } from './art.js';
import { createScene } from './scene.js';

const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=reducedQuery.matches,paused=false,lastTrigger=null;
if(!reduced)document.body.classList.add('js-motion');
const scene=createScene($('#scene'),{reduced,onFailure:()=>{$('.scene-fallback').hidden=false;$('#scene').hidden=true;}});
const contactCanvas=document.createElement('canvas');contactCanvas.setAttribute('aria-hidden','true');const contactSceneWrap=document.createElement('div');contactSceneWrap.className='contact-scene';contactSceneWrap.append(contactCanvas);$('#contact').prepend(contactSceneWrap);
const contactScene=createScene(contactCanvas,{reduced,compact:true,onFailure:()=>{contactSceneWrap.hidden=true;}});

$('#project-list').innerHTML=projects.map((p,i)=>`<article class="project-card reveal" data-project="${p.id}" data-roles="${p.roles.join(' ')}"><button class="project-art" data-open="${p.id}" aria-label="Explore ${p.name}"><span class="art-top"><span>${String(i+1).padStart(2,'0')} / SYSTEM STUDY</span><span>ILLUSTRATIVE ARCHITECTURE</span></span>${artwork(p.art)}<span class="art-open" aria-hidden="true">↗</span></button><div class="project-meta"><button class="project-title" data-open="${p.id}">${p.name}</button><span>${p.category}</span></div><p class="project-description">${p.summary}</p><div class="tags">${p.stack.map(s=>`<span>${s}</span>`).join('')}</div></article>`).join('');

const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObserver.unobserve(e.target);}}),{threshold:.12});
$$('.reveal').forEach(el=>revealObserver.observe(el));

function applyFilter(filter){
  let count=0;$$('.project-card').forEach(el=>{el.hidden=filter!=='all'&&!el.dataset.roles.split(' ').includes(filter);if(!el.hidden){count++;el.classList.add('visible');}});
  $$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
  $('#filter-status').textContent=`${count} projects shown.`;
}
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>applyFilter(b.dataset.filter)));

function openDialog(dialog,trigger){lastTrigger=trigger;dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('.close-dialog').focus();}
function closeDialog(dialog){dialog.close();}
$$('dialog').forEach(dialog=>{
  dialog.querySelector('.close-dialog').addEventListener('click',()=>closeDialog(dialog));
  dialog.addEventListener('close',()=>{document.body.style.overflow='';lastTrigger?.focus();});
  dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))closeDialog(dialog);});
});
$$('[data-resume]').forEach(b=>b.addEventListener('click',()=>openDialog($('#resume-dialog'),b)));
$$('[data-open]').forEach(b=>b.addEventListener('click',()=>{
  const p=projects.find(p=>p.id===b.dataset.open);
  $('#dialog-content').innerHTML=`<p class="eyebrow">${p.category}</p><h2 id="dialog-title">${p.name}</h2><p class="dialog-summary">${p.summary}</p><div class="tags">${p.stack.map(s=>`<span>${s}</span>`).join('')}</div><div class="dialog-art">${artwork(p.art)}</div><div class="dialog-section"><h3>Inside the system</h3><ul>${p.facts.map(f=>`<li>${f}</li>`).join('')}</ul></div><div class="dialog-section"><h3>The engineering decision</h3><p class="dialog-summary">${p.design}</p></div><div class="dialog-section"><h3>Evidence & scope</h3><p class="dialog-summary">${p.evidence}</p></div><div class="dialog-actions"><a class="button primary" href="https://github.com/bhargavm-iiits/${p.repo}" target="_blank" rel="noopener noreferrer">View source code <span aria-hidden="true">↗</span></a><a class="text-link" href="mailto:bhargav.m23@iiits.in?subject=${encodeURIComponent('Let’s discuss '+p.name)}">Discuss this project ↗</a></div><p class="source-note">Content sources: ${p.sources.join(' · ')}<br>Diagram: original illustrative architecture; not a live system status or project screenshot.</p>`;
  openDialog($('#project-dialog'),b);
}));

const captions=[['Source-linked by design','ClaimBridge preserves PDF page provenance and reconciles extracted facts against structured records.'],['Give the model boundaries','Payer/date-filtered retrieval and structured outputs connect relevant context to a bounded generation step.'],['Acceptance is an explicit step','FixProof uses ordered static checks and isolated tests. ClaimBridge keeps reviewer approval and audit history.']];
function setStep(step){$$('[data-step]').forEach(b=>{const active=Number(b.dataset.step)===step;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});$('#pipeline-art').innerHTML=artwork('pipeline',step);$('#pipeline-caption-title').textContent=captions[step][0];$('#pipeline-caption-body').textContent=captions[step][1];}
$$('[data-step]').forEach(b=>b.addEventListener('click',()=>setStep(Number(b.dataset.step))));setStep(0);

function setRole(role){const r=roles[role];$$('[data-role]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===role)));$('#role-content').innerHTML=`<p>${r.description}</p><div class="skill-list">${r.skills.map(s=>`<span>${s}</span>`).join('')}</div><p class="role-evidence">${r.evidence}</p><a class="text-link" href="assets/resumes/${r.resume}" download>Download focused résumé <span aria-hidden="true">↓</span></a>`;}
$$('[data-role]').forEach(b=>b.addEventListener('click',()=>setRole(b.dataset.role)));setRole('ai');

const menu=$('.menu-toggle');menu.addEventListener('click',()=>{const expanded=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!expanded));menu.setAttribute('aria-label',expanded?'Open navigation':'Close navigation');$('#mobile-nav').hidden=expanded;});
$$('#mobile-nav a').forEach(a=>a.addEventListener('click',()=>{menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');$('#mobile-nav').hidden=true;}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){menu.click();menu.focus();}});

$('#copy-email').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('bhargav.m23@iiits.in');$('#copy-status').textContent='Email address copied.';}catch{$('#copy-status').textContent='Copy is unavailable here. Email: bhargav.m23@iiits.in';}});

const motionButton=$('.motion-toggle');
motionButton.addEventListener('click',()=>{paused=!paused;motionButton.setAttribute('aria-pressed',String(paused));motionButton.setAttribute('title',paused?'Resume animations':'Pause animations');motionButton.setAttribute('aria-label',paused?'Resume animations':'Pause animations');motionButton.firstElementChild.textContent=paused?'▷':'Ⅱ';$('.motion-label').textContent=paused?'Resume motion':'Pause motion';document.body.classList.toggle('motion-paused',paused);scene.setPaused(paused);contactScene.setPaused(paused);});
reducedQuery.addEventListener('change',e=>{reduced=e.matches;document.body.classList.toggle('js-motion',!reduced);scene.setReduced(reduced);contactScene.setReduced(reduced);updateScroll();});

const stage=$('.journey-stage');const journey=$('.journey');const copies=$$('.stage-copy');
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
let scrollQueued=false;
function updateScroll(){
  scrollQueued=false;
  const rect=journey.getBoundingClientRect();const span=Math.max(1,journey.offsetHeight-stage.offsetHeight);const p=reduced?0:Math.max(0,Math.min(1,-rect.top/span));
  if(rect.bottom>=0&&rect.top<innerHeight)scene.update(p);
  const a=1-smooth(.10,.22,p), b=smooth(.17,.29,p)*(1-smooth(.46,.58,p)),c=smooth(.53,.64,p);
  [a,b,c].forEach((opacity,i)=>{copies[i].style.opacity=opacity;copies[i].style.pointerEvents=opacity>.5?'auto':'none';copies[i].inert=opacity<.5;if(!reduced)copies[i].style.translate=`0 ${(1-opacity)*-18}px`;});
  const chapter=p<.20?0:p<.55?1:2;
  $$('[data-chapter]').forEach((b,i)=>{if(i===chapter)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  $('.journey-count').innerHTML=`0${chapter+1} <span>/ 03</span>`;
  $('#core-label').textContent=['INTELLIGENCE CORE','OPEN ARCHITECTURE','VERIFICATION CORRIDOR'][chapter];
  $('#core-detail').textContent=['DATA · MODELS · VERIFICATION','RETRIEVAL · REASONING · GUARDRAILS','SOURCE · RETRIEVE · VALIDATE · REVIEW'][chapter];
  const maxScroll=document.documentElement.scrollHeight-innerHeight;$('.scroll-progress').style.transform=`scaleX(${maxScroll>0?scrollY/maxScroll:0})`;
}
window.addEventListener('scroll',()=>{if(!scrollQueued){scrollQueued=true;requestAnimationFrame(updateScroll);}},{passive:true});window.addEventListener('resize',updateScroll);
$$('[data-chapter]').forEach(b=>b.addEventListener('click',()=>{const targets=[0,.36,.78];const span=journey.offsetHeight-stage.offsetHeight;window.scrollTo({top:journey.offsetTop+span*targets[Number(b.dataset.chapter)],behavior:reduced?'instant':'smooth'});}));
const sectionObserver=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){$$('.site-header>nav a').forEach(a=>a.classList.toggle('active',a.hash===`#${e.target.id}`));}}},{rootMargin:'-20% 0px -60% 0px'});
$$('main>section[id]').forEach(s=>sectionObserver.observe(s));updateScroll();
window.addEventListener('pagehide',()=>{scene.dispose();contactScene.dispose();});
