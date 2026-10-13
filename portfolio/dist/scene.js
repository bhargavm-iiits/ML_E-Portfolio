import * as THREE from './vendor/three.module.js';
import { HDRLoader } from './vendor/addons/loaders/HDRLoader.js';
import { Reflector } from './vendor/addons/objects/Reflector.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { makeHardware } from './hardware.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;

export function createScene(canvas,{reduced=false,compact=false,onFailure=()=>{}}={}){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){onFailure(e);return {update(){},setPaused(){},setReduced(){},dispose(){}};}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.07,100);
  scene.background=new THREE.Color(0x111719);scene.fog=new THREE.FogExp2(0x111719,.028);
  renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1:1.35));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
  renderer.shadowMap.enabled=!compact;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  canvas.dataset.renderer='live-webgl';
  const textureLoader=new THREE.TextureLoader();
  const maps={};
  for(const name of ['Color','NormalGL','Roughness','Metalness']){
    maps[name]=textureLoader.load(`assets/live-3d/Metal046A_1K_${name}.jpg`,()=>{if(!disposed)render();});
    maps[name].colorSpace=name==='Color'?THREE.SRGBColorSpace:THREE.NoColorSpace;maps[name].wrapS=maps[name].wrapT=THREE.RepeatWrapping;maps[name].repeat.set(2,2);maps[name].anisotropy=renderer.capabilities.getMaxAnisotropy();
  }
  const surface={normalMap:maps.NormalGL,normalScale:new THREE.Vector2(.10,.10),roughnessMap:maps.Roughness,metalnessMap:maps.Metalness};
  const materials={
    metal:new THREE.MeshPhysicalMaterial({...surface,color:0x79939f,metalness:.94,roughness:.30,clearcoat:.35,clearcoatRoughness:.17,envMapIntensity:.85}),
    silver:new THREE.MeshStandardMaterial({...surface,color:0xabbac1,metalness:.98,roughness:.23,envMapIntensity:1.0}),
    dark:new THREE.MeshStandardMaterial({...surface,map:maps.Color,color:0x596c73,metalness:.62,roughness:.52}),
    board:new THREE.MeshStandardMaterial({color:0x16282b,metalness:.48,roughness:.54}),
    glass:new THREE.MeshPhysicalMaterial({color:0xd3f7fa,metalness:0,roughness:.075,transmission:.94,thickness:.14,ior:1.46,attenuationColor:new THREE.Color(0x68c7d2),attenuationDistance:1.7,clearcoat:1,clearcoatRoughness:.035,envMapIntensity:.8}),
    cyan:new THREE.MeshStandardMaterial({color:0x82cddb,emissive:0x75c6d0,emissiveIntensity:1.65,roughness:.23,metalness:.1}),
    softCyan:new THREE.MeshStandardMaterial({color:0x70aab6,emissive:0x39737e,emissiveIntensity:.7,roughness:.34,metalness:.45}),
    lime:new THREE.MeshStandardMaterial({color:0xd0ef83,emissive:0xb5de5b,emissiveIntensity:2.2,metalness:.1,roughness:.3}),
    amber:new THREE.MeshStandardMaterial({color:0xe9b877,emissive:0xc59035,emissiveIntensity:1.8,roughness:.35})
  };
  const pmrem=new THREE.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
  // A light-card environment gives immediate reflections while the downloaded HDR loads.
  const studio=new THREE.Scene();studio.background=new THREE.Color(0x0f171d);
  for(const [x,y,z,w,h,intensity] of [[-4,5,3,4,7,5],[5,3,-3,3,6,3],[0,6,0,5,4,4]]){
    const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity*.98,intensity*.95)}));card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);
  }
  let environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;scene.environmentIntensity=.7;
  new HDRLoader().load('assets/live-3d/studio_small_09_1k.hdr',texture=>{if(disposed){texture.dispose();return;}const next=pmrem.fromEquirectangular(texture);environment.dispose();environment=next;scene.environment=next.texture;texture.dispose();canvas.dataset.hdr='studio_small_09';render();},undefined,()=>{canvas.dataset.hdr='light-card-fallback';});
  scene.add(new THREE.HemisphereLight(0xaabac3,0x283038,.48));
  const key=new THREE.DirectionalLight(0xeef5ff,4.7);key.position.set(-3.5,7.4,4.5);key.castShadow=!compact;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:34});key.shadow.bias=-.0005;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
  const rim=new THREE.DirectionalLight(0x91d8e9,2.7);rim.position.set(6,4,-5);scene.add(rim);
  const back=new THREE.PointLight(0x5bc2d4,8,9);back.position.set(1,1,-3);scene.add(back);
  const dieLight=new THREE.PointLight(0xaad95f,1.4,4);dieLight.position.set(2.35,.1,0);scene.add(dieLight);

  const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0x566064,metalness:.3,roughness:.62}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.56;floor.receiveShadow=true;scene.add(floor);
  const floorLines=[];for(let i=-10;i<=10;i++){floorLines.push(-30,-1.558,i*3,30,-1.558,i*3,i*3,-1.558,-40,i*3,-1.558,30);}
  const seams=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(floorLines,3)),new THREE.LineBasicMaterial({color:0x3b4447,transparent:true,opacity:.26}));scene.add(seams);
  let reflection=null;
  if(!compact){
    const shader={...Reflector.ReflectorShader,uniforms:THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('blendOverlay( base.rgb, color ), 1.0','blendOverlay( base.rgb, color ), 0.14')};
    reflection=new Reflector(new THREE.PlaneGeometry(45,55),{textureWidth:512,textureHeight:512,color:0x627e87,clipBias:.003,shader,multisample:0});reflection.rotation.x=-Math.PI/2;reflection.position.set(0,-1.554,-5);reflection.material.transparent=true;reflection.material.depthWrite=false;scene.add(reflection);
  }
  const hardware=makeHardware(materials),core=hardware.root;scene.add(core);
  const {block,label,mergedRoutes}=hardware;
  const corridor=new THREE.Group();scene.add(corridor);corridor.visible=false;
  function portalGeometry(w,h){
    const points=[[-w/2,-h/2],[-w/2,h/2-.28],[-w/2+.28,h/2],[w/2-.28,h/2],[w/2,h/2-.28],[w/2,-h/2]];
    const shape=new THREE.Shape();shape.moveTo(...points[0]);for(const p of points.slice(1))shape.lineTo(...p);shape.closePath();
    const iw=w-.27,ih=h-.23,hole=new THREE.Path();const inner=[[-iw/2,-ih/2],[-iw/2,ih/2-.25],[-iw/2+.25,ih/2],[iw/2-.25,ih/2],[iw/2,ih/2-.25],[iw/2,-ih/2]];hole.moveTo(...inner[inner.length-1]);for(const p of inner.slice(0,-1).reverse())hole.lineTo(...p);hole.closePath();shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape,{depth:.19,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025});
  }
  const gateGeos=[];
  for(let i=0;i<4;i++){
    const gate=new THREE.Group();gate.position.set(0,.43,1.5-i*5.5);corridor.add(gate);
    const geo=portalGeometry(4.7,4.1);gateGeos.push(geo);const frame=new THREE.Mesh(geo,materials.metal);frame.castShadow=true;gate.add(frame);
    for(let lane=0;lane<3;lane++){
      const x=2.18-lane*.13,top=1.86-lane*.1,bottom=-1.95;const path=[[-x,bottom,.24],[-x,top-.22,.24],[-x+.22,top,.24],[x-.22,top,.24],[x,top-.22,.24],[x,bottom,.24]];
      mergedRoutes(gate,[path],i===0?materials.cyan:materials.lime,.014);
    }
    label(gate,['SOURCE','RETRIEVE','VERIFY','REVIEW'][i],0,2.22,.24,1.45,.23,i===0?'#b8e7ef':'#d5ed9c');
    const smallBolts=[];
    for(const x of [-2.22,2.22])for(const y of [-1.7,-.8,.2,1.2]){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.015,8),materials.silver);bolt.rotation.x=Math.PI/2;bolt.position.set(x,y,.24);gate.add(bolt);}
    for(const side of [-1,1]){
      const panel=new THREE.Group();panel.position.set(side*3.55,-.05,-1.35);panel.rotation.y=-side*.25;gate.add(panel);
      block(panel,1.55,1.55,.025,materials.glass,0,0,0,.03);block(panel,1.44,.03,.025,materials.metal,0,.71,.018);label(panel,i%2?'CONTEXT':'EVIDENCE',0,.51,.036,.98,.14);
      for(let k=0;k<6;k++)block(panel,.99-k%3*.12,.016,.02,k===2?materials.cyan:materials.silver,-.10,.26-k*.16,.033,.001);
      block(panel,.035,1.85,.04,materials.dark,0,-.25,-.06);
    }
  }
  const accepted=[[-.7,-1.53,8],[-.7,-1.53,1.5],[-.45,-1.53,1.1],[-.2,-1.53,.8],[-.2,-1.53,-7],[-.4,-1.53,-7.4],[-.65,-1.53,-7.8],[-.65,-1.53,-20]];
  mergedRoutes(corridor,[accepted],materials.lime,.028);
  mergedRoutes(corridor,[accepted.map(([x,y,z])=>[x-.16,y,z])],materials.softCyan,.012);
  mergedRoutes(corridor,[[[-.2,-1.51,-7],[.5,-1.51,-7],[1.2,-1.51,-7.5],[2.8,-1.51,-7.5]]],materials.amber,.021);
  const output=new THREE.Group();output.position.set(3.3,-.5,-7.5);corridor.add(output);block(output,1.3,1.35,.075,materials.dark);label(output,'REVIEW',0,.3,.044,.9,.2,'#f1c389');label(output,'EXCEPTION',0,0,.044,.9,.14,'#f1c389');
  const routePackets=[];for(let i=0;i<22;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.12),i%4===0?materials.lime:materials.cyan);corridor.add(mesh);routePackets.push(mesh);}

  let composer=null,bloom=null;
  if(!compact){composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.27,.32,1.2);composer.addPass(bloom);composer.addPass(new OutputPass());}
  let progress=0,targetProgress=0,time=0,last=0,paused=false,visible=true,disposed=false,raf=0,narrow=false,pointer={x:0,y:0};
  const target=new THREE.Vector3(),baseCamera=new THREE.Vector3(),flyCamera=new THREE.Vector3();
  function render(){
    if(disposed)return;
    const p=reduced||compact?0:progress;
    const opening=smooth(.08,.41,p)*(1-smooth(.87,.985,p));
    const travel=smooth(.46,.59,p)*(1-smooth(.86,.96,p));
    core.visible=p<.63||p>.87||compact;corridor.visible=p>.44&&p<.97&&!compact;
    core.position.set(compact||narrow?0:mix(2.3,.3,opening),compact?0:narrow?-1.1:0,0);
    core.rotation.y=-.36+pointer.x*.07+Math.sin(time*.12)*.035;core.rotation.z=pointer.y*.006;
    core.scale.setScalar((narrow&&!compact?.78:1)*(1-travel*.78));
    const floorOffset=narrow&&!compact?-.75*(1-travel):0;floor.position.y=-1.56+floorOffset;seams.position.y=floorOffset;
    for(const d of hardware.decks){d.group.position.y=d.baseY*(1+opening*.78);d.group.rotation.y=(d.baseY>0?1:-1)*opening*.025;}
    for(const s of hardware.shells){const r=1.51+opening*1.25;s.group.position.set(Math.sin(s.angle)*r,s.y*(1+opening*.45),Math.cos(s.angle)*r);s.group.rotation.y=s.angle+opening*.055;}
    for(const f of hardware.faces){const r=1.51+opening*.32;f.group.position.set(Math.sin(f.angle)*r,0,Math.cos(f.angle)*r);}
    for(const fan of hardware.fans)fan.rotation.z=time*.6;
    for(const packet of hardware.packets){packet.mesh.position.y=packet.base.y+Math.sin(time*.7+packet.phase)*.05;packet.mesh.rotation.set(time*.15,packet.phase,0);}
    const forward=smooth(.55,.84,p);
    baseCamera.set(compact?6.4:narrow?6.0:6.5,compact?3.5:narrow?3.6:3.9,compact?9.8:narrow?10.8:11.8);
    baseCamera.lerp(new THREE.Vector3(0,1.05,9.2),smooth(.39,.53,p)*(1-smooth(.85,.965,p)));
    flyCamera.set(Math.sin(forward*Math.PI)*.1,.10,9.2-forward*13.0);
    camera.position.copy(baseCamera).lerp(flyCamera,travel);
    target.set(compact?0:narrow?0:mix(.35,0,opening),compact?0:narrow?.95:0,0);
    target.lerp(new THREE.Vector3(0,.45,flyCamera.z-10),travel);camera.lookAt(target);
    for(let i=0;i<routePackets.length;i++){const z=8-((time*.55+i*1.35)%29);routePackets[i].position.set(-.65+Math.sin(z*.15)*.1,-1.46,z);}
    dieLight.position.set(core.position.x,.1+core.position.y,0);dieLight.intensity=.9+opening*.8;
    if(reflection)reflection.visible=!narrow&&travel<.1;
    renderer.info.autoReset=false;renderer.info.reset();
    if(composer)composer.render();else renderer.render(scene,camera);
    canvas.dataset.scene='modular-hardware';canvas.dataset.triangles=String(renderer.info.render.triangles);
  }
  function resize(){const r=canvas.parentElement.getBoundingClientRect();narrow=r.width<760;renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.fov=compact?37:narrow?43:37;camera.updateProjectionMatrix();composer?.setSize(r.width,r.height);render();}
  function frame(now){if(disposed)return;raf=requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||.016);last=now;if(!visible||paused||reduced)return;time+=dt;progress+=(targetProgress-progress)*(1-Math.exp(-dt*13));if(Math.abs(targetProgress-progress)<.0001)progress=targetProgress;render();}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'80px'});observer.observe(canvas);
  const onPointer=e=>{if(e.pointerType==='mouse'&&!paused&&!reduced&&visible){pointer.x=(e.clientX/innerWidth-.5)*2;pointer.y=(e.clientY/innerHeight-.5)*2;}};
  const onLost=e=>{e.preventDefault();cancelAnimationFrame(raf);onFailure(new Error('WebGL context lost'));};
  window.addEventListener('resize',resize);window.addEventListener('pointermove',onPointer,{passive:true});canvas.addEventListener('webglcontextlost',onLost);resize();raf=requestAnimationFrame(frame);
  return {update(p){targetProgress=clamp(p);if(reduced){progress=0;render();}},setPaused(v){paused=v;},setReduced(v){reduced=v;if(v){progress=0;time=0;pointer={x:0,y:0};render();}},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('pointermove',onPointer);canvas.removeEventListener('webglcontextlost',onLost);reflection?.getRenderTarget().dispose();composer?.dispose();environment.dispose();pmrem.dispose();const geos=new Set(),mats=new Set(),textures=new Set(Object.values(maps));scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const g of geos)g.dispose();for(const m of mats)m.dispose();for(const t of textures)t.dispose();renderer.dispose();}};
}
