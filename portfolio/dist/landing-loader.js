// The loader is a HUD/timeline over the landing canvas. Geometry and rendering stay owned by scene.js.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const beats=[[0,0],[1.4,0],[1.6,12],[2.9,40],[3,61],[3.6,65],[5.2,69],[5.8,88],[6.5,95],[7.2,99]];
const progressAt=t=>{for(let i=1;i<beats.length;i++){const [a,v]=beats[i-1],[b,w]=beats[i];if(t<=b)return v+(w-v)*clamp((t-a)/(b-a));}return 99;};

export function mountLandingLoader(container,scene,readiness,options={}){
  const $=s=>container.querySelector(s),root=document.documentElement;
  const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=!!options.reduced,ready=false,disposed=false,exiting=false,revealed=false,skipped=false;
  let t=options.quick?9.5:0,seekT=options.seek??null,last=0,raf=0,shown=0,exitAt=0;
  let elapsed=0;
  const mode=options.mode||'normal',status=$('.ld-status'),pct=$('.ld-pct'),fill=$('.ld-bar span'),meter=$('.ld-meter'),hud=$('.ld-hud'),skipButton=$('.ld-skip');
  const tasks={modules:1,assets:0,render:0,interface:0};
  const fx={svg:$('.ld-fx'),rings:$('.ld-rings'),one:$('.ld-ring1'),two:$('.ld-ring2'),ticks:$('.ld-ticks'),sweep:$('.ld-sweep'),rays:$('.ld-rays'),reticle:$('.ld-reticle')};
  container.classList.add('ld-shared');container.dataset.renderer='landing-canvas';
  // No second context, iris cube, dark tunnel or fallback model can appear in production.
  $('.ld-canvas')?.remove();$('.ld-fallback')?.remove();hud.hidden=true;
  root.classList.add('is-loading');scene.setLoadingPose(reduced?10:t);
  const announce=s=>{if(status.textContent!==s)status.textContent=s;};
  const ns='http://www.w3.org/2000/svg';
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2,l=document.createElementNS(ns,'line');l.setAttribute('x1',Math.cos(a)*104);l.setAttribute('y1',Math.sin(a)*104);l.setAttribute('x2',Math.cos(a)*(i%4?111:116));l.setAttribute('y2',Math.sin(a)*(i%4?111:116));fx.ticks.append(l);}
  fx.sweep.setAttribute('d','M100 0 A100 100 0 0 1 45 89');
  function setPct(n){shown=Math.max(shown,Math.round(n));pct.textContent=shown;fill.style.transform=`scaleX(${shown/100})`;}
  function reveal(){if(revealed)return;revealed=true;root.classList.remove('is-loading');root.classList.add('is-revealing');options.onReveal?.();}
  function startExit(){if(exiting||!ready)return;exiting=true;exitAt=performance.now();reveal();scene.setLoadingPose(10);container.classList.add('ld-exit');container.dataset.state='exit';}
  function complete(){if(disposed)return;scene.finishLoading();dispose();options.onExit?.();}
  function markReady(){if(disposed)return;ready=true;for(const k in tasks)tasks[k]=1;container.classList.remove('ld-waiting');}
  function skip(){skipped=true;if(ready){t=10;startExit();}else{t=Math.max(t,7.35);container.classList.add('ld-waiting');announce('Preparing the landing scene');}}
  const onKey=e=>{if(e.key==='Escape')skip();};
  const onReduced=e=>{reduced=e.matches;if(reduced){t=10;scene.setLoadingPose(10);if(ready)startExit();}};
  skipButton.addEventListener('click',skip);addEventListener('keydown',onKey);reducedQuery.addEventListener('change',onReduced);
  const skipTimer=setTimeout(()=>skipButton.classList.add('on'),1000);
  const watchdog=setTimeout(()=>{if(!ready&&!disposed){skipped=true;t=Math.max(t,7.35);announce('Still preparing the landing scene. You can skip the animation.');container.classList.add('ld-waiting');options.onTimeout?.();}},options.watchdog??15000);
  readiness.then(markReady,()=>{announce('Preparing a simplified landing view');options.onFailure?.();});
  function frame(now){
    if(disposed)return;raf=requestAnimationFrame(frame);
    // Use elapsed wall time, not a capped GPU frame step; backgrounding does not advance choreography.
    const dt=last&&!document.hidden?Math.max(0,(now-last)/1000):0;last=now;if(document.hidden)return;elapsed+=dt;
    if(exiting){if(now-exitAt>(reduced?180:480))complete();return;}
    if(seekT!==null)t=seekT;
    else if(mode==='replay')t=elapsed%10;
    else if(reduced)t=10;
    else if(!ready)t=Math.min(7.35,t+dt);
    else t=Math.min(10,t+dt);
    if(skipped&&ready)t=10;
    const wait=!ready&&t>=7.35;container.classList.toggle('ld-waiting',wait);
    const phase=wait?'waiting':t<1.5?'opening':t<3.6?'diagnostics':t<5.2?'routing':t<7.35?'assembly':t<9.5?'handoff':'ready';
    container.dataset.state=phase;container.dataset.time=t.toFixed(3);container.dataset.ready=String(ready);
    announce(wait?'Preparing the landing scene':phase==='ready'?'Landing scene ready':phase==='handoff'?'Aligning the landing view':phase==='assembly'?'Assembling the landing cube':phase==='routing'?'Preparing scene materials':phase==='diagnostics'?'Loading the portfolio':'Initialising the landing cube');
    setPct(ready&&t>=7.4?100:Math.min(99,progressAt(t)));
    scene.setLoadingPose(reduced?10:t);
    const p=scene.projectCore()||{x:.65,y:.5},scale=Math.min(innerWidth,innerHeight*16/9)/1280;
    fx.svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);fx.reticle.style.opacity='0';fx.rays.style.opacity='0';
    fx.rings.setAttribute('transform',`translate(${p.x*innerWidth} ${p.y*innerHeight})`);
    const ring=(!reduced?smooth(7.8,8.1,t)*(1-smooth(8.5,9.25,t)):0);fx.rings.style.opacity=String(ring*.55);
    const radius=(120+smooth(7.8,8.65,t)*185)*scale;fx.one.setAttribute('r',String(radius));fx.two.setAttribute('r',String(radius*1.16));
    fx.ticks.setAttribute('transform',`scale(${radius/100})`);fx.sweep.setAttribute('transform',`rotate(${t*55}) scale(${radius/100*1.16})`);
    meter.style.opacity=String(1-smooth(9.2,9.65,t));
    if(mode==='normal'&&seekT===null&&ready){if(t>=9.5)reveal();if(t>=10)startExit();}
  }
  raf=requestAnimationFrame(frame);
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);clearTimeout(watchdog);clearTimeout(skipTimer);skipButton.removeEventListener('click',skip);removeEventListener('keydown',onKey);reducedQuery.removeEventListener('change',onReduced);root.classList.remove('is-loading','is-revealing');container.remove();}
  return {setTaskProgress(id,v){if(id in tasks)tasks[id]=Math.max(tasks[id],clamp(v));},markReady,skip,dispose,seekReference(s){seekT=Math.max(0,Math.min(10,s));},get time(){return t;}};
}
