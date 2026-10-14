// A light loader: a CSS/SVG cube that echoes the landing cube, plus a counter. No WebGL of its own.
// Percent per second: about 1.6 s on a first visit, faster on revisits and with reduced motion.
const RATE=62,QUICK_RATE=160,HOLD=.25,EXIT_MS=500;
// The cube assembles bottom-up as the counter passes these values.
const SLABS=[['.s3',5],['.s2',35],['.s1',65]];

export function mountLandingLoader(container,scene,readiness,options={}){
  const $=s=>container.querySelector(s),root=document.documentElement;
  const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=!!options.reduced,ready=false,disposed=false,exiting=false,revealed=false,skipped=false,stalled=false;
  let shown=0,display=-1,hold=0,last=0,raf=0,exitAt=0,elapsed=0,seek=options.seek??null;
  const mode=options.mode||'normal',status=$('.ld-status'),pct=$('.ld-pct'),fill=$('.ld-bar span'),skipButton=$('.ld-skip');
  const slabs=SLABS.map(([s,at])=>[$(s),at]);
  const rate=()=>options.quick||reduced?QUICK_RATE:RATE;
  container.dataset.renderer='css';
  root.classList.add('is-loading');scene.setLoadingPose();
  const announce=s=>{if(status.textContent!==s)status.textContent=s;};
  function setPct(n){const v=Math.floor(n);if(v===display)return;display=v;pct.textContent=v;fill.style.transform=`scaleX(${v/100})`;for(const [el,at] of slabs)el?.classList.toggle('on',v>=at);}
  function reveal(){if(revealed)return;revealed=true;root.classList.remove('is-loading');root.classList.add('is-revealing');options.onReveal?.();}
  function startExit(){if(exiting||!ready)return;exiting=true;exitAt=performance.now();reveal();container.classList.add('ld-exit');container.dataset.state='exit';}
  function complete(){if(disposed)return;scene.finishLoading();dispose();options.onExit?.();}
  function markReady(){if(disposed)return;ready=true;container.classList.remove('ld-waiting');}
  function skip(){skipped=true;if(ready){shown=100;startExit();}else{container.classList.add('ld-waiting');announce('Preparing the landing scene');}}
  const onKey=e=>{if(e.key==='Escape')skip();};
  const onReduced=e=>{reduced=e.matches;};
  skipButton.addEventListener('click',skip);addEventListener('keydown',onKey);reducedQuery.addEventListener('change',onReduced);
  const skipTimer=setTimeout(()=>skipButton.classList.add('on'),1000);
  const watchdog=setTimeout(()=>{if(!ready&&!disposed){stalled=true;announce('Still preparing the landing scene. You can skip the animation.');container.classList.add('ld-waiting');options.onTimeout?.();}},options.watchdog??15000);
  readiness.then(markReady,()=>{announce('Preparing a simplified landing view');options.onFailure?.();});
  setPct(0);
  function frame(now){
    if(disposed)return;raf=requestAnimationFrame(frame);
    // Cap the step so a long main-thread stall can never jump the counter.
    const dt=last&&!document.hidden?Math.min(.1,Math.max(0,(now-last)/1000)):0;last=now;if(document.hidden)return;elapsed+=dt;
    if(exiting){if(now-exitAt>(reduced?200:EXIT_MS))complete();return;}
    if(seek!==null)shown=seek*10;
    else if(mode==='replay')shown=(elapsed*RATE)%100;
    else if(skipped&&ready)shown=100;
    else shown=Math.min(ready?100:99,shown+rate()*dt);
    setPct(shown);
    const done=ready&&shown>=100&&seek===null&&mode==='normal';
    if(done)hold+=dt;
    const wait=!ready&&(skipped||stalled||shown>=99);container.classList.toggle('ld-waiting',wait);
    container.dataset.state=done?'handoff':wait?'waiting':'loading';container.dataset.progress=String(display);container.dataset.ready=String(ready);
    announce(wait?'Preparing the landing scene':done?'Landing scene ready':'Loading the portfolio');
    if(done&&(skipped||reduced||hold>=HOLD))startExit();
  }
  raf=requestAnimationFrame(frame);
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);clearTimeout(watchdog);clearTimeout(skipTimer);skipButton.removeEventListener('click',skip);removeEventListener('keydown',onKey);reducedQuery.removeEventListener('change',onReduced);root.classList.remove('is-loading','is-revealing');container.remove();}
  return {setTaskProgress(){},markReady,skip,dispose,seekReference(s){seek=Math.max(0,Math.min(10,s));},get progress(){return display;}};
}
