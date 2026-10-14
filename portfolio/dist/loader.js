import * as THREE from './vendor/three.module.js';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { buildAssembly, seeded } from './loader-parts.js';

// AI hardware initialisation loader. A deterministic 10-second timeline (every transform is evaluated from
// absolute time, so seeking is exact) runs while the page prepares; the displayed percentage never reaches
// 100 until the page's readiness contract is met.
const clamp=x=>Math.max(0,Math.min(1,x));
const lin=(a,b,x)=>clamp((x-a)/(b-a));
const smooth=(a,b,x)=>{const t=lin(a,b,x);return t*t*(3-2*t);};
const cubic=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const seat=t=>t<.85?cubic(t/.85)*.94:.94+(1-Math.pow(1-(t-.85)/.15,2))*.06;// smooth travel, quicker final seating
const mix=(a,b,t)=>a+(b-a)*t;
const DURATION=10;
const REFERENCE_TRACE=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,12,12,16,17,20,24,25,26,27,30,36,36,39,40,61,63,63,63,64,65,65,64,64,64,64,65,65,65,66,67,67,68,67,67,68,69,69,77,79,80,87,83,88,81,82,83,83,89,94,95,97,96,96,95,99,99,99,99,100,100,100,100,100,100,100];
// Initialisation curve for normal use: follows the reference beats but stays monotonic.
const CURVE=[[0,0],[1.4,0],[1.6,12],[2.9,40],[3.0,61],[3.6,65],[5.2,69],[5.8,88],[6.5,95],[7.2,99]];
const curveAt=t=>{for(let i=1;i<CURVE.length;i++){const [t1,v1]=CURVE[i],[t0,v0]=CURVE[i-1];if(t<=t1)return mix(v0,v1,lin(t0,t1,t));}return 99;};
// Camera keyframes: [time, position, target]. Interpolated with a Catmull–Rom spline through the positions.
const CAM=[[0,[1.0,4.4,9.0],[0,.15,0]],[1.5,[1.5,4.6,8.8],[0,.1,0]],[2.5,[3.0,5.3,9.4],[0,-.2,0]],[3.6,[3.5,4.9,9.0],[0,-.2,0]],[4.8,[3.5,4.1,8.0],[0,-.1,0]],[5.6,[3.2,2.6,7.0],[0,0,0]],[6.1,[2.7,2.0,6.1],[0,.05,0]],[6.5,[1.9,1.5,5.5],[0,.05,0]],[7.0,[.9,.95,5.3],[0,.05,0]],[7.7,[.1,.62,9.3],[0,0,0]],[8.8,[0,.55,10.4],[0,0,0]],[9.3,[.15,.55,10.0],[0,0,0]],[10,[1.45,.6,9.3],[0,0,0]]];

export function mountLoader(container,readiness,options={}){
  const $=s=>container.querySelector(s);
  const mode=options.mode||'normal';// 'normal' | 'replay' | 'seek'
  const quick=!!options.quick;
  const reduced=!!options.reduced;
  const tasks={modules:0,assets:0,render:0,interface:0},WEIGHTS={modules:.25,assets:.4,render:.25,interface:.1};
  let watchdog=0,onKey=null;
  let ready=false,disposed=false,exiting=false,skipped=false,state='boot',t=quick?6.9:0,seekT=options.seek??null,raf=0,last=0,holdStart=0,start=performance.now();
  const statusEl=$('.ld-status'),pctEl=$('.ld-pct'),barEl=$('.ld-bar span'),skipBtn=$('.ld-skip');
  const realProgress=()=>Object.entries(WEIGHTS).reduce((s,[k,w])=>s+w*tasks[k],0);
  let shownPct=0;
  const announce=txt=>{if(statusEl.textContent!==txt)statusEl.textContent=txt;};

  // ---------- Renderer ----------
  let renderer=null;
  if(!reduced){try{renderer=new THREE.WebGLRenderer({canvas:$('.ld-canvas'),antialias:true,powerPreference:'high-performance'});}catch(e){renderer=null;}}
  const fallback=!renderer;
  container.classList.toggle('ld-is-fallback',fallback);
  let api;
  if(fallback){
    // Lightweight path: SVG hardware outline, real progress, short fade.
    const tick=()=>{if(disposed)return;raf=requestAnimationFrame(tick);const p=ready?100:Math.min(99,Math.round(realProgress()*100));setPct(p);if(ready&&!exiting)exit(reduced?250:500);};
    raf=requestAnimationFrame(tick);
    readiness.then(()=>{ready=true;});setTimeout(()=>{if(!ready){ready=true;}},15000);
    api={setTaskProgress,markReady,skip(){},dispose,seekReference(){}};
    return api;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1:1.35));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x07111a);scene.fog=new THREE.Fog(0x07111a,12,48);
  const camera=new THREE.PerspectiveCamera(40,1,.05,120);
  const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=env.texture;scene.environmentIntensity=.32;
  scene.add(new THREE.HemisphereLight(0x8fb8c8,0x050a0c,.35));
  const key=new THREE.DirectionalLight(0xe8f2ff,2.4);key.position.set(-5,9,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0x9fd7ff,1.1);rim.position.set(6,3,-7);scene.add(rim);
  const cpuLight=new THREE.PointLight(0x80ff87,0,7,1.6);scene.add(cpuLight);
  const sideLight=new THREE.PointLight(0x80ff87,0,9,1.5);sideLight.position.set(0,0,2.2);scene.add(sideLight);
  const front=new THREE.DirectionalLight(0xdfeaf0,0);front.position.set(0,-2.2,9);scene.add(front);

  const G=(c,k)=>new THREE.Color(c).multiplyScalar(k);
  const M={
    silver:new THREE.MeshStandardMaterial({color:0xc9d0d3,metalness:.92,roughness:.44,envMapIntensity:.7}),
    silverDim:new THREE.MeshStandardMaterial({color:0x9aa4a8,metalness:.9,roughness:.4}),
    armor:new THREE.MeshStandardMaterial({color:0x8c959a,metalness:.95,roughness:.42,envMapIntensity:.55}),
    armorDark:new THREE.MeshStandardMaterial({color:0x40474b,metalness:.92,roughness:.42,envMapIntensity:.6}),
    armorShell:new THREE.MeshStandardMaterial({color:0xa2abaf,metalness:.9,roughness:.5,envMapIntensity:.5,side:THREE.DoubleSide}),
    petal:new THREE.MeshStandardMaterial({color:0x3e464b,metalness:.85,roughness:.34,side:THREE.DoubleSide}),
    petalAlt:new THREE.MeshStandardMaterial({color:0x353c41,metalness:.85,roughness:.38,side:THREE.DoubleSide}),
    strap:new THREE.MeshStandardMaterial({color:0x4d555a,metalness:.9,roughness:.45,envMapIntensity:.5}),
    edgeGlow:new THREE.LineBasicMaterial({color:G(0xa8ffb2,2.2),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}),
    irisBack:new THREE.MeshStandardMaterial({color:0x0b1412,metalness:.5,roughness:.6}),
    coreGlow:new THREE.MeshBasicMaterial({color:G(0x80ff87,.6)}),
    spreader:new THREE.MeshStandardMaterial({color:0xd7dcd9,metalness:.9,roughness:.3,emissive:new THREE.Color(0x80ff87),emissiveIntensity:0}),
    chip:new THREE.MeshStandardMaterial({color:0x121b1d,metalness:.6,roughness:.4}),
    cap:new THREE.MeshStandardMaterial({color:0xa59b74,metalness:.9,roughness:.35}),
    brass:new THREE.MeshStandardMaterial({color:0xa59b74,metalness:1,roughness:.35}),
    boardEdge:new THREE.MeshStandardMaterial({color:0x0f2a1f,metalness:.4,roughness:.6}),
    chipGeo:new THREE.BoxGeometry(.18,.04,.12),capGeo:new THREE.CylinderGeometry(.02,.02,.05,8),pinGeo:new THREE.BoxGeometry(.018,.03,.08),
    boards:[],sideBoards:[]
  };
  // Brushed detail arrives progressively; the first frames render without it.
  const tl=new THREE.TextureLoader();
  // Normal detail only: the roughness map drives some texels to the minimum roughness, whose specular peak
  // overflows the half-float bloom buffer and blooms into a white block.
  for(const [k,mats] of [['NormalGL',['silver','armor','armorDark','armorShell','petal','strap']]]){
    tl.load(`assets/live-3d/Metal046A_1K_${k}.jpg`,tex=>{if(disposed)return tex.dispose();tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1.5,1.5);for(const m of mats){if(k==='NormalGL'){M[m].normalMap=tex;M[m].normalScale=new THREE.Vector2(.1,.1);}else M[m].roughnessMap=tex;M[m].needsUpdate=true;}});
  }
  const A=buildAssembly(M);scene.add(A.root);
  if(options.debug)window.__ld={scene,A,camera,THREE};
  tasks.modules=1;

  // ---------- Energy: axial filament with loops, then routed branches ----------
  const axial=new THREE.Group();scene.add(axial);
  const coreLine=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,6.6,8,1,true),new THREE.MeshBasicMaterial({color:G(0xb6ffb4,2.6),transparent:true}));axial.add(coreLine);
  const coreHalo=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,6.6,16,1,true),new THREE.MeshBasicMaterial({color:G(0x80ff87,1.4),transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false}));axial.add(coreHalo);
  const strands=[];const sr=seeded(4);
  for(let k=0;k<5;k++){const pts=[];for(let i=0;i<=40;i++){const y=-3.2+i/40*6.4;pts.push(new THREE.Vector3(Math.sin(i*.6+k*1.3)*(.05+sr()*.12),y,Math.cos(i*.5+k)*(.05+sr()*.1)));}
    const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),120,.006,4,false),new THREE.MeshBasicMaterial({color:G(0x7dff8c,2.2),transparent:true}));axial.add(m);strands.push(m);}
  // Horizontal beams from the side modules into the core (opening pulse).
  for(const sx of [-1,1])for(let k=0;k<3;k++){const pts=[];for(let i=0;i<=24;i++){const x=sx*(2.1-i/24*1.25);pts.push(new THREE.Vector3(x,Math.sin(i*.7+k*2)*.05+(k-1)*.06,Math.cos(i*.6+k)*.05));}
    const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,.007,4,false),new THREE.MeshBasicMaterial({color:G(0x7dff8c,2.4),transparent:true}));axial.add(m);strands.push(m);}
  const loops=[];for(let k=0;k<4;k++){const m=new THREE.Mesh(new THREE.TorusGeometry(.32+k*.05,.006,6,64),new THREE.MeshBasicMaterial({color:G(0x91ff9b,2),transparent:true}));m.rotation.x=Math.PI/2;axial.add(m);loops.push(m);}
  // Routed branches: bundles leave the middle band with 90° and 45° corners and run out into the environment.
  const routes=[];const rr=seeded(17);
  const bundle=(dir,yBase,zBase,count,rise)=>{for(let k=0;k<count;k++){const off=(k-(count-1)/2)*.09;
      const p=[[dir*1.28,yBase+off*.4,zBase+off],[dir*2.1,yBase+off*.4,zBase+off]];let x=dir*2.1,y=yBase+off*.4,z=zBase+off;
      y+=rise*.6;x+=dir*.6;p.push([x,y,z]);x+=dir*(1.2+rr()*.6);p.push([x,y,z]);y+=rise*(.4+rr()*.5);x+=dir*.45;p.push([x,y,z]);x+=dir*(2.5+rr()*2);p.push([x,y,z]);
      const path=new THREE.CurvePath();for(let i=1;i<p.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(...p[i-1]),new THREE.Vector3(...p[i])));
      addRoute(path,0);}};
  const addRoute=(path,kind)=>{const len=path.getLength(),segs=Math.ceil(len*24);
      const core=new THREE.Mesh(new THREE.TubeGeometry(path,segs,.0085,4,false),new THREE.MeshBasicMaterial({color:G(0xa6ffae,2.1),transparent:true}));
      const halo=new THREE.Mesh(new THREE.TubeGeometry(path,segs,.032,6,false),new THREE.MeshBasicMaterial({color:G(0x58f070,1),transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false}));
      const pulse=new THREE.Mesh(new THREE.BoxGeometry(.04,.04,.04),new THREE.MeshBasicMaterial({color:G(0xd8ffd8,3)}));
      scene.add(core,halo,pulse);routes.push({core,halo,pulse,path,kind,delay:routes.length*.04%(.5),segs});};
  bundle(1,.18,.6,6,1);bundle(1,-.2,-.4,5,-1);bundle(-1,.22,-.5,6,1);bundle(-1,-.16,.5,5,-1);bundle(1,.05,0,4,.4);bundle(-1,-.05,.05,4,-.4);
  // Vertical bundles: rise and fall from the side boards during ignition, jogging at 45° as they leave.
  for(const [x0,z0] of [[-.55,1.29],[.55,1.29],[1.29,.5],[-1.29,-.4]])for(const dy of [1,-1])for(let k=0;k<5;k++){const off=(k-2)*.07;
      const along=Math.abs(z0)>1?[off,0]:[0,off];const x=x0+along[0],z=z0+along[1];const jog=(k-2)*.06*(dy>0?1:-1);const yb=dy*(1.6+rr()*.4);
      const pts=[[x,dy*.56,z],[x,yb,z],[x+jog*4,yb+dy*.24,z],[x+jog*4,dy*(5.6+rr()*1.5),z]];
      const path=new THREE.CurvePath();for(let i=1;i<pts.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i-1]),new THREE.Vector3(...pts[i])));addRoute(path,1);}
  // ---------- Diagnostic planes (four floating bars) ----------
  const diags=[];const LABELS=['GEOMETRY','MATERIALS','SHADERS','INTERFACE'];const TASK=['assets','assets','render','interface'];
  [[-3.3,1.9,.6],[3.3,2.1,-.4],[-3.4,-1.05,.5],[3.4,-1.25,-.3]].forEach(([x,y,z],k)=>{
    const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
    const W=2.0,H=.55;const br=[];for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const cx=sx*W/2,cy=sy*H/2;br.push(cx,cy,0,cx-sx*.16,cy,0,cx,cy,0,cx,cy-sy*.12,0);}
    const lines=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(br,3)),new THREE.LineBasicMaterial({color:G(0x8bcbc1,1.2),transparent:true}));g.add(lines);
    const track=new THREE.Mesh(new THREE.PlaneGeometry(W*.86,.19),new THREE.MeshBasicMaterial({color:0x10261f,transparent:true}));track.position.y=-.04;g.add(track);
    const fill=new THREE.Mesh(new THREE.PlaneGeometry(W*.86,.19),new THREE.MeshBasicMaterial({color:G(0x9be8a0,.95),transparent:true}));fill.position.set(0,-.04,.002);g.add(fill);
    const c=document.createElement('canvas');c.width=256;c.height=40;const x2=c.getContext('2d');x2.fillStyle='#bfeee3';x2.font='600 22px "Geist Mono", monospace';x2.fillText(LABELS[k],4,28);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Mesh(new THREE.PlaneGeometry(.62,.1),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));label.position.set(-W*.43+.31,.16,.001);g.add(label);
    diags.push({g,lines,track,fill,label,k,fillAt:[2.0+k*.18,3.1+k*.12]});});
  // ---------- Environment: floor grid, side wire volumes, wire boxes, travelling segments ----------
  const envMat=o=>new THREE.LineBasicMaterial({color:0x3d7773,transparent:true,opacity:o});
  const lineSet=(arr,mat)=>{const l=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(arr,3)),mat);scene.add(l);return l;};
  const floor=[];for(let i=-24;i<=24;i++){floor.push(i*1.3,-3.9,-60,i*1.3,-3.9,14);}for(let j=-46;j<=10;j++){floor.push(-32,-3.9,j*1.3,32,-3.9,j*1.3);}
  const floorMat=envMat(.3);const floorLines=lineSet(floor,floorMat);
  const walls=[];for(const sx of [-1,1]){for(let i=-46;i<=10;i+=2)walls.push(sx*11,-3.9,i*1.3,sx*11,12,i*1.3);for(let y=-3.9;y<12;y+=1.3)walls.push(sx*11,y,-60,sx*11,y,14);}
  const wallMat=envMat(.12);lineSet(walls,wallMat);
  const wb=seeded(8),boxes=[];for(let i=0;i<26;i++){const geo=new THREE.EdgesGeometry(new THREE.BoxGeometry(.6+wb()*2.4,.4+wb()*1.8,.6+wb()*2.4));const side=wb()<.5?-1:1;const l=new THREE.LineSegments(geo,envMat(.1+wb()*.14));l.position.set(side*(4.5+wb()*6),-2+wb()*6,-4-wb()*28);scene.add(l);boxes.push(l);}
  const SEG=260,segMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.012,.012,1),new THREE.MeshBasicMaterial({color:G(0x8bcbc1,1.1),transparent:true,opacity:.55,depthWrite:false}),SEG);scene.add(segMesh);
  const sg=seeded(21),segs=[];for(let i=0;i<SEG;i++){const a=sg()*Math.PI*2,r=3+sg()*10;segs.push({x:Math.cos(a)*r,y:Math.sin(a)*r*.7+.5,z0:-50+sg()*60,len:.2+sg()*1.4,v:2+sg()*6});}
  const segObj=new THREE.Object3D();
  // ---------- Post-processing ----------
  const composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType}));
  composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.5,.26,1.05);composer.addPass(bloom);composer.addPass(new OutputPass());
  // ---------- Camera spline ----------
  const camCurve=new THREE.CatmullRomCurve3(CAM.map(k=>new THREE.Vector3(...k[1])),false,'centripetal');
  const tgtCurve=new THREE.CatmullRomCurve3(CAM.map(k=>new THREE.Vector3(...k[2])),false,'centripetal');
  const camU=time=>{for(let i=1;i<CAM.length;i++)if(time<=CAM[i][0]){const f=lin(CAM[i-1][0],CAM[i][0],time);return (i-1+f)/(CAM.length-1);}return 1;};
  let aspect=1,dolly=1;
  const tmp=new THREE.Vector3(),tgt=new THREE.Vector3(),proj=new THREE.Vector3();
  // SVG overlay elements
  const fx={ring1:$('.ld-ring1'),ring2:$('.ld-ring2'),ticks:$('.ld-ticks'),sweep:$('.ld-sweep'),rings:$('.ld-rings'),reticle:$('.ld-reticle')};
  const hud=$('.ld-hud'),meter=$('.ld-meter');
  {const ns='http://www.w3.org/2000/svg';for(let i=0;i<64;i++){const a=i/64*Math.PI*2,l=document.createElementNS(ns,'line');const r0=104,r1=i%4?112:118;l.setAttribute('x1',Math.cos(a)*r0);l.setAttribute('y1',Math.sin(a)*r0);l.setAttribute('x2',Math.cos(a)*r1);l.setAttribute('y2',Math.sin(a)*r1);fx.ticks.append(l);}
   {const rays=$('.ld-rays');fx.rays=rays;const rr2=seeded(31);for(let i=0;i<56;i++){const a=i/56*Math.PI*2+rr2()*.05,l=document.createElementNS(ns,'line');l.setAttribute('x1',Math.cos(a)*40);l.setAttribute('y1',Math.sin(a)*40);l.setAttribute('x2',Math.cos(a)*100);l.setAttribute('y2',Math.sin(a)*100);l.setAttribute('stroke-width',(3+rr2()*7).toFixed(1));rays.append(l);}}
   fx.sweep.setAttribute('d','M100 0 A100 100 0 0 1 '+(Math.cos(1.1)*100).toFixed(2)+' '+(Math.sin(1.1)*100).toFixed(2));}
  // Telemetry in the final HUD is measured, not decorative.
  const tele={fps:$('[data-tele=fps]'),calls:$('[data-tele=calls]'),tris:$('[data-tele=tris]'),load:$('[data-tele=load]'),dpr:$('[data-tele=dpr]'),view:$('[data-tele=view]')};let fpsAvg=60,teleTick=0;

  // ---------- Evaluate the whole scene at absolute time ----------
  function evaluate(T){
    // Hardware tracks
    for(const P of A.parts){P.obj.visible=T>=P.show;if(!P.obj.visible)continue;const e=seat(lin(P.win[0],P.win[1],T));const bob=Math.sin(T*1.3+P.phase)*P.bob*(1-e);
      P.obj.position.lerpVectors(P.from.p,P.to.p,e);P.obj.position.y+=bob;
      P.obj.rotation.set(mix(P.from.r.x,P.to.r.x,e),mix(P.from.r.y,P.to.r.y,e),mix(P.from.r.z,P.to.r.z,e));}
    // Iris: present once the front armour seats, petals close 7.2–7.8 (then hold, no idle spin).
    A.iris.visible=T>7.0;const close=cubic(lin(7.15,7.85,T));A.petals.forEach(h=>{h.rotation.z=mix(-1.05,0,close);});
    A.iris.scale.setScalar(mix(.9,1,smooth(7.0,7.35,T)));
    // Energy tracks (separate shapes on purpose)
    const axialPulse=smooth(0,.18,T)*(1-smooth(1.15,1.6,T));
    axial.visible=axialPulse>.001;coreLine.material.opacity=axialPulse;coreHalo.material.opacity=.22*axialPulse;
    strands.forEach((s,k)=>{s.material.opacity=axialPulse*(.6+.4*Math.sin(T*9+k));});
    loops.forEach((l,k)=>{const ph=((T*.9+k*.27)%1);l.position.y=mix(-2.6,2.6,ph);l.scale.setScalar(.7+Math.sin(ph*Math.PI)*.6);l.material.opacity=axialPulse*Math.sin(ph*Math.PI);});
    const boardEdge=smooth(.2,.8,T)*(1-smooth(1.4,2.2,T))*.35;
    const cpuGlow=smooth(3.55,4.2,T)*(1-smooth(6.9,7.9,T)*.85);
    const ignition=Math.exp(-Math.pow((T-6.0)/.16,2));
    A.spreader.material.emissiveIntensity=cpuGlow*.55+ignition*.6;
    M.boards.forEach(b=>{b.emissiveIntensity=boardEdge+cpuGlow*.55;});
    M.sideBoards.forEach(b=>{b.emissiveIntensity=boardEdge+cpuGlow*.16+ignition*.3;});
    M.edgeGlow.opacity=smooth(5.45,5.9,T)*(1-smooth(6.9,7.5,T));
    const traces=smooth(7.25,8.0,T)*(1+.25*Math.exp(-Math.pow((T-8.1)/.2,2)));A.faces.forEach(m=>{m.emissiveIntensity=traces*1.35;});
    front.intensity=smooth(6.8,7.8,T)*.5;
    A.centre.material.color.copy(G(0x80ff87,.35+smooth(7.6,8.2,T)*.5));
    cpuLight.intensity=axialPulse*2.5+cpuGlow*6+ignition*5;sideLight.intensity=cpuGlow*2+ignition*4;
    bloom.strength=.45+ignition*.3+axialPulse*.1;
    // Routes: reveal 4.0–4.9 with staggered starts, pulses travel, retract and dim 5.4–7.0.
    routes.forEach(R=>{const rev=R.kind?cubic(lin(5.8+R.delay*.5,6.35+R.delay*.5,T)):cubic(lin(3.95+R.delay,4.75+R.delay,T)),ret=R.kind?cubic(lin(6.95,7.5,T)):cubic(lin(5.3+R.delay*.4,6.3,T));const f=rev*(1-ret);
      const n=Math.floor(f*R.segs)*24;R.core.geometry.setDrawRange(0,n);R.halo.geometry.setDrawRange(0,Math.floor(f*R.segs)*36);
      const vis=f>.002;R.core.visible=R.halo.visible=R.pulse.visible=vis;R.core.material.opacity=.4+.6*(1-ret);
      if(vis){const u=((T*.55+R.delay*3)%1)*f;R.path.getPointAt(Math.min(.999,u),R.pulse.position);}});
    // Diagnostics: appear 1.5–2.4, fill 2.0–3.3 (bounded by the real task), fade 5.0–5.4.
    diags.forEach(D=>{const vis=smooth(1.5+D.k*.08,2.3+D.k*.08,T)*(1-smooth(5.0,5.45,T));D.g.visible=vis>.002;
      D.lines.material.opacity=vis*.8;D.track.material.opacity=vis*.8;D.label.material.opacity=vis;D.fill.material.opacity=vis;
      const anim=cubic(lin(D.fillAt[0],D.fillAt[1],T));const real=mode==='normal'?Math.max(tasks[TASK[D.k]],T>7?1:0):1;const f=Math.max(.02,Math.min(anim,real||.08));
      D.fill.scale.x=f;D.fill.position.x=-(1-f)*2.0*.86/2;D.g.lookAt(camera.position.x,D.g.position.y,camera.position.z);});
    floorMat.opacity=.16+smooth(3.5,5,T)*.14;wallMat.opacity=.08+smooth(3.5,5,T)*.08;
    // Travelling segments drift towards the camera; deterministic from absolute time.
    segs.forEach((s,i)=>{const z=((s.z0+T*s.v)%60+60)%60-50;segObj.position.set(s.x,s.y,z);segObj.scale.set(1,1,segObj.position.distanceTo(camera.position)<3?0:s.len*(1+smooth(7.8,8.8,T)*1.5));segObj.updateMatrix();segMesh.setMatrixAt(i,segObj.matrix);});segMesh.instanceMatrix.needsUpdate=true;
    // Camera rig
    const u=camU(T);camCurve.getPoint(u,camera.position);tgtCurve.getPoint(u,tgt);
    camera.position.sub(tgt).multiplyScalar(dolly).add(tgt);camera.lookAt(tgt);
    // Screen-space overlays: reticle arcs, scan rings, HUD, percentage panel.
    proj.set(0,0,0).project(camera);const cx=(proj.x+1)/2*innerWidth,cy=(1-proj.y)/2*innerHeight,scale=Math.min(innerWidth,innerHeight*16/9)/1280;
    fx.reticle.style.opacity=String(smooth(.75,1.3,T)*(1-smooth(4.8,5.4,T))*.6);
    const r1=lin(8.02,8.85,T),r2=lin(8.18,9.05,T);const ringFade=1-smooth(8.85,9.25,T);
    fx.rings.style.opacity=String(T>8&&T<9.4?1:0);fx.rings.setAttribute('transform',`translate(${cx} ${cy})`);
    fx.ring1.setAttribute('r',String((150+Math.pow(r1,.8)*330)*scale));fx.ring1.style.opacity=String(smooth(8.0,8.12,T)*ringFade);
    fx.ring2.setAttribute('r',String((170+Math.pow(r2,.75)*420)*scale));fx.ring2.style.opacity=String(smooth(8.18,8.32,T)*ringFade);
    fx.ticks.setAttribute('transform',`scale(${(150+Math.pow(r1,.8)*330)*scale/100})`);fx.ticks.style.opacity=String(smooth(8.18,8.4,T)*(1-smooth(8.8,9.1,T))*.7);
    fx.rays.setAttribute('transform',`scale(${(150+Math.pow(r1,.8)*330)*scale/100*.97})`);fx.rays.style.opacity=String(smooth(8.0,8.16,T)*(1-smooth(8.45,8.9,T)));
    fx.sweep.setAttribute('transform',`rotate(${T*160}) scale(${(170+Math.pow(r2,.75)*420)*scale/100})`);fx.sweep.style.opacity=String(smooth(8.2,8.4,T)*ringFade*.8);
    meter.style.opacity=String(1-smooth(7.9,8.2,T));
    hud.style.setProperty('--draw',String(smooth(9.0,9.35,T)));hud.classList.toggle('on',T>=9.0);
  }

  // ---------- Progress, state and readiness ----------
  function setPct(p){p=Math.round(p);if(p===shownPct&&pctEl.textContent!=='')return;shownPct=p;pctEl.textContent=String(p);barEl.style.transform=`scaleX(${p/100})`;}
  function setTaskProgress(id,v){if(id in tasks)tasks[id]=Math.max(tasks[id],clamp(v));}
  function markReady(){for(const k in tasks)tasks[k]=1;ready=true;}
  function phaseOf(T){return T<1.5?'opening':T<3.6?'diagnostics':T<5.2?'routing':T<7.9?'assembly':T<9.0?'scan':'ready';}
  const PHASE_TEXT={opening:'Initialising hardware',diagnostics:'Loading geometry and materials',routing:'Compiling shaders',assembly:'Assembling interface',scan:'Interface ready',ready:'Interface ready'};
  function exit(delay=200){if(exiting)return;exiting=true;state='exit';setTimeout(()=>{container.classList.add('ld-exit');setTimeout(()=>{dispose();options.onExit?.();},520);},delay);}
  function skip(){if(exiting)return;skipped=true;if(ready)exit(0);else{t=Math.max(t,7.3);announce('Preparing interface');container.classList.add('ld-waiting');}}
  readiness.then(markReady);
  watchdog=setTimeout(()=>{if(!ready){ready=true;container.classList.remove('ld-waiting');}},options.watchdog||15000);
  skipBtn.addEventListener('click',skip);onKey=e=>{if(e.key==='Escape')skip();};addEventListener('keydown',onKey);
  setTimeout(()=>skipBtn.classList.add('on'),1000);

  function resize(){aspect=innerWidth/innerHeight;dolly=aspect<1?Math.min(2.1,1.18/aspect*.82):1;renderer.setSize(innerWidth,innerHeight,false);composer.setSize(innerWidth,innerHeight);camera.aspect=aspect;camera.fov=aspect<1?46:40;camera.updateProjectionMatrix();fx.svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);}
  fx.svg=$('.ld-fx');
  function frame(now){
    if(disposed)return;raf=requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||.016);last=now;
    if(seekT!==null){t=seekT;}
    else if(mode==='replay'){t=((now-start)/1000)%DURATION;}
    else{
      // Hold an assembled, subdued pose at 99% until the page is really ready.
      const holdAt=7.32;if(!ready&&t+dt>=holdAt){t=holdAt;container.classList.add('ld-waiting');}else t=Math.min(DURATION,t+dt);
      if(ready)container.classList.remove('ld-waiting');
      if(ready&&!exiting&&(skipped||t>=DURATION-.1)){exit(skipped?0:200);}
    }
    const ph=phaseOf(t);if(ph!==state&&!exiting){state=ph;announce(container.classList.contains('ld-waiting')?'Preparing interface':PHASE_TEXT[ph]);}
    if(mode==='replay'||seekT!==null){const i=Math.min(REFERENCE_TRACE.length-1,Math.floor(t*10));setPct(REFERENCE_TRACE[i]);}
    else setPct(ready&&t>=7.4?100:Math.max(shownPct,Math.min(99,curveAt(t))));
    evaluate(t);renderer.info.autoReset=false;renderer.info.reset();composer.render(dt);
    fpsAvg+=(1/Math.max(dt,.001)-fpsAvg)*.05;
    if(t>=9&&++teleTick%12===0){tele.fps.textContent=String(Math.round(fpsAvg));tele.calls.textContent=String(renderer.info.render.calls);tele.tris.textContent=(renderer.info.render.triangles/1000).toFixed(0)+'K';tele.load.textContent=((performance.now()-start)/1000).toFixed(1)+'s';tele.dpr.textContent=renderer.getPixelRatio().toFixed(2);tele.view.textContent=innerWidth+'×'+innerHeight;}
    if(!firstRendered){firstRendered=true;container.dataset.firstFrame='1';}
  }
  let firstRendered=false;
  addEventListener('resize',resize);resize();raf=requestAnimationFrame(frame);
  function dispose(){if(disposed)return;disposed=true;clearTimeout(watchdog);cancelAnimationFrame(raf);removeEventListener('resize',resize);if(onKey)removeEventListener('keydown',onKey);
    if(renderer){scene.traverse(o=>{o.geometry?.dispose();const m=o.material;(Array.isArray(m)?m:m?[m]:[]).forEach(x=>{for(const v of Object.values(x))if(v?.isTexture)v.dispose();x.dispose();});});env.dispose();pmrem.dispose();composer.dispose();renderer.dispose();renderer.forceContextLoss?.();}
    container.remove();}
  api={setTaskProgress,markReady,skip,dispose,seekReference(s){seekT=Math.max(0,Math.min(DURATION,s));},get time(){return t;}};
  return api;
}
