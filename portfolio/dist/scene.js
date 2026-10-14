import * as THREE from './vendor/three.module.js';
import { HDRLoader } from './vendor/addons/loaders/HDRLoader.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { Reflector } from './vendor/addons/objects/Reflector.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { GTAOPass } from './vendor/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { SMAAPass } from './vendor/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from './vendor/addons/postprocessing/ShaderPass.js';
import { makeHardware } from './hardware.js';
import { makeGallery, GALLERY_Z0, GALLERY_GAP } from './gallery.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const damp=(a,b,lambda,dt)=>a+(b-a)*(1-Math.exp(-lambda*dt));
const easeOut=t=>1-Math.pow(1-t,3),easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,easeBack=t=>{const c=1.4;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};

// Final grade in display space: lens-edge chromatic split that grows with scroll speed, vignette and fine grain.
const FinishShader={
  uniforms:{tDiffuse:{value:null},time:{value:0},fade:{value:0},aberration:{value:.0015},vignette:{value:.32},grain:{value:.035},resolution:{value:new THREE.Vector2(1,1)}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float time,fade,aberration,vignette,grain;uniform vec2 resolution;varying vec2 vUv;
  float rand(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}
  void main(){vec2 d=vUv-.5;float r=dot(d,d);vec2 off=d*aberration*(.35+r*3.0);
  vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
  col*=1.0-vignette*smoothstep(.12,.62,r*1.55);
  col+=(rand(vUv*resolution+fract(time)*91.7)-.5)*grain;
  col*=1.0-fade;
  gl_FragColor=vec4(col,1.0);}`
};

// Journey timeline in scroll units (one unit = one viewport of scroll). G0 is the first project stop.
export const JOURNEY={T:13,G0:4.2};
export const DECK_LABELS=['INGEST','PARSE','RETRIEVE','REASON','VERIFY','REVIEW'];

export function createScene(canvas,{reduced=false,compact=false,onFailure=()=>{},onProgress=()=>{},onHover=()=>{},onPanelHover=()=>{},content=null}={}){
  const noop={update(){},setPaused(){},setReduced(){},setVelocity(){},dispose(){},ready:Promise.resolve()};
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:compact,powerPreference:'high-performance',stencil:false});}catch(e){onFailure(e);return noop;}
  const BG=0x0d1312;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.07,120);
  scene.background=new THREE.Color(BG);scene.fog=new THREE.FogExp2(BG,.026);
  let dpr=Math.min(devicePixelRatio,compact?1:1.35);
  renderer.setPixelRatio(dpr);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;
  renderer.shadowMap.enabled=!compact;renderer.localClippingEnabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  canvas.dataset.renderer='live-webgl';

  const manager=new THREE.LoadingManager();
  manager.onProgress=(url,loaded,total)=>onProgress(total?loaded/total:1);
  const textureLoader=new THREE.TextureLoader(manager);
  const maps={};
  for(const name of ['Color','NormalGL','Roughness','Metalness']){
    maps[name]=textureLoader.load(`assets/live-3d/Metal046A_1K_${name}.jpg`,()=>{if(!disposed)dirty=true;});
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
  // Light cards give immediate reflections while the HDR loads.
  const studio=new THREE.Scene();studio.background=new THREE.Color(0x0f171d);
  for(const [x,y,z,w,h,intensity] of [[-4,5,3,4,7,5],[5,3,-3,3,6,3],[0,6,0,5,4,4]]){
    const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity*.98,intensity*.95)}));card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);
  }
  let environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;scene.environmentIntensity=.7;
  const hdrReady=new Promise(resolve=>new HDRLoader(manager).load('assets/live-3d/studio_small_09_1k.hdr',texture=>{if(disposed){texture.dispose();resolve();return;}const next=pmrem.fromEquirectangular(texture);environment.dispose();environment=next;scene.environment=next.texture;texture.dispose();canvas.dataset.hdr='studio_small_09';dirty=true;resolve();},undefined,()=>{canvas.dataset.hdr='light-card-fallback';resolve();}));

  scene.add(new THREE.HemisphereLight(0xaabac3,0x283038,.48));
  const key=new THREE.DirectionalLight(0xeef5ff,4.7);key.position.set(-3.5,7.4,4.5);key.castShadow=!compact;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:34});key.shadow.bias=-.0005;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
  const rim=new THREE.DirectionalLight(0x91d8e9,2.7);rim.position.set(6,4,-5);scene.add(rim);
  const back=new THREE.PointLight(0x5bc2d4,8,9);back.position.set(1,1,-3);scene.add(back);
  const dieLight=new THREE.PointLight(0xaad95f,1.4,4);dieLight.position.set(2.35,.1,0);scene.add(dieLight);

  const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0x3f4a49,metalness:.35,roughness:.58,roughnessMap:maps.Roughness}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.56;floor.receiveShadow=true;scene.add(floor);
  const floorLines=[];for(let i=-10;i<=10;i++){floorLines.push(-30,-1.558,i*3,30,-1.558,i*3,i*3,-1.558,-40,i*3,-1.558,30);}
  const seams=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(floorLines,3)),new THREE.LineBasicMaterial({color:0x34403e,transparent:true,opacity:.3}));scene.add(seams);
  let reflection=null;
  if(!compact){
    const shader={...Reflector.ReflectorShader,uniforms:THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('blendOverlay( base.rgb, color ), 1.0','blendOverlay( base.rgb, color ), 0.16')};
    reflection=new Reflector(new THREE.PlaneGeometry(45,55),{textureWidth:512,textureHeight:512,color:0x627e87,clipBias:.003,shader,multisample:0});reflection.rotation.x=-Math.PI/2;reflection.position.set(0,-1.554,-5);reflection.material.transparent=true;reflection.material.depthWrite=false;scene.add(reflection);
  }
  // Entrance shockwave: two rings that ripple across the floor as the core lands.
  const waves=[0xc2ed71,0x80d8cb].map((c,k)=>{const m=new THREE.Mesh(new THREE.RingGeometry(.96,1,128),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(2.2),transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=-1.545;m.visible=false;m.userData.delay=k*.12;scene.add(m);return m;});
  const hardware=makeHardware(materials),core=hardware.root;scene.add(core);
  const {block,label,mergedRoutes}=hardware;
  for(const d of hardware.decks){d.hover=0;d.group.traverse(o=>{o.userData.deck=d.index;});}

  // Verification corridor: a licensed hallway model restyled to the portfolio palette, with authored gates and routes inside it.
  const corridor=new THREE.Group();scene.add(corridor);corridor.visible=false;
  function portalGeometry(w,h){
    const points=[[-w/2,-h/2],[-w/2,h/2-.28],[-w/2+.28,h/2],[w/2-.28,h/2],[w/2,h/2-.28],[w/2,-h/2]];
    const shape=new THREE.Shape();shape.moveTo(...points[0]);for(const p of points.slice(1))shape.lineTo(...p);shape.closePath();
    const iw=w-.27,ih=h-.23,hole=new THREE.Path();const inner=[[-iw/2,-ih/2],[-iw/2,ih/2-.25],[-iw/2+.25,ih/2],[iw/2-.25,ih/2],[iw/2,ih/2-.25],[iw/2,-ih/2]];hole.moveTo(...inner[inner.length-1]);for(const p of inner.slice(0,-1).reverse())hole.lineTo(...p);hole.closePath();shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape,{depth:.19,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025});
  }
  const GATE_Z=[1.2,-3.4,-8,-12.6];
  if(!compact)for(let i=0;i<4;i++){
    const gate=new THREE.Group();gate.position.set(0,.2,GATE_Z[i]);gate.scale.setScalar(.8);corridor.add(gate);
    const frame=new THREE.Mesh(portalGeometry(4.7,4.1),materials.metal);frame.castShadow=true;gate.add(frame);
    for(let lane=0;lane<3;lane++){
      const x=2.18-lane*.13,top=1.86-lane*.1,bottom=-1.95;const path=[[-x,bottom,.24],[-x,top-.22,.24],[-x+.22,top,.24],[x-.22,top,.24],[x,top-.22,.24],[x,bottom,.24]];
      mergedRoutes(gate,[path],i===0?materials.cyan:materials.lime,.014);
    }
    label(gate,['SOURCE','RETRIEVE','VALIDATE','REVIEW'][i],0,2.22,.24,1.45,.23,i===0?'#b8e7ef':'#d5ed9c');
    for(const x of [-2.22,2.22])for(const y of [-1.7,-.8,.2,1.2]){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.015,8),materials.silver);bolt.rotation.x=Math.PI/2;bolt.position.set(x,y,.24);gate.add(bolt);}
    const side=i%2?1:-1;
    const panel=new THREE.Group();panel.position.set(side*1.75,.15,-1.6);panel.rotation.y=-side*.55;panel.scale.setScalar(.72);gate.add(panel);
    block(panel,1.55,1.55,.025,materials.glass,0,0,0,.03);block(panel,1.44,.03,.025,materials.metal,0,.71,.018);label(panel,i%2?'CONTEXT':'EVIDENCE',0,.51,.036,.98,.14);
    for(let k=0;k<6;k++)block(panel,.99-k%3*.12,.016,.02,k===2?materials.cyan:materials.silver,-.10,.26-k*.16,.033,.001);
  }
  const accepted=[[-.5,-1.53,8],[-.5,-1.53,1.5],[-.35,-1.53,1.1],[-.15,-1.53,.8],[-.15,-1.53,-7.4],[-.3,-1.53,-7.8],[-.45,-1.53,-8.2],[-.45,-1.53,-16]];
  if(!compact){
    mergedRoutes(corridor,[accepted],materials.lime,.028);
    mergedRoutes(corridor,[accepted.map(([x,y,z])=>[x-.16,y,z])],materials.softCyan,.012);
    mergedRoutes(corridor,[[[-.15,-1.51,-7.4],[.45,-1.51,-7.4],[1.0,-1.51,-7.9],[1.75,-1.51,-7.9]]],materials.amber,.021);
    const output=new THREE.Group();output.position.set(1.95,-.7,-8.3);output.rotation.y=-.9;output.scale.setScalar(.7);corridor.add(output);block(output,1.3,1.35,.075,materials.dark);label(output,'REVIEW',0,.3,.044,.9,.2,'#f1c389');label(output,'EXCEPTION',0,0,.044,.9,.14,'#f1c389');
  }
  const routePackets=[];if(!compact)for(let i=0;i<22;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.12),i%4===0?materials.lime:materials.cyan);corridor.add(mesh);routePackets.push(mesh);}
  const corridorLights=[];if(!compact)for(const [z,c] of [[2,0x80d8cb],[-5,0xc2ed71],[-12,0x80d8cb]]){const l=new THREE.PointLight(c,3.2,9,1.6);l.position.set(0,1.4,z);corridor.add(l);corridorLights.push(l);}

  const gallery=!compact&&content?makeGallery({...content,materials,renderer}):null;
  if(gallery)scene.add(gallery.root);
  const N=gallery?gallery.count:0;
  const stopCam=new THREE.Vector3(),stopCam2=new THREE.Vector3(),stopLook=new THREE.Vector3(),stopLook2=new THREE.Vector3(),warpLook=new THREE.Vector3();
  let hoverPanel=-1;
  function stopView(k,outPos,outLook){
    const side=k%2===0?1:-1,z=GALLERY_Z0-k*GALLERY_GAP;
    if(narrow){outPos.set(0,-.35,z+5.6);outLook.set(0,-.62,z-1);}
    else{outPos.set(side*.06,.42,z+4.4);outLook.set(side*.06,.26,z-2);}
  }
  const gltf=new GLTFLoader(manager);
  let hallway=null,ionDrive=null;
  const credits=[];
  const panelMaps={normal:maps.NormalGL.clone(),rough:maps.Roughness.clone()};for(const t of Object.values(panelMaps)){t.repeat.set(3,3);t.needsUpdate=true;}
  const modelsReady=compact?Promise.resolve():Promise.allSettled([
    gltf.loadAsync('assets/models/space_ship_hallway.glb').then(g=>{
      if(disposed)return;hallway=g.scene;credits.push(g.asset?.extras?.title);
      const restyle={
        Wall_Roof_White:new THREE.MeshPhysicalMaterial({color:0x1f2826,metalness:.72,roughness:.4,normalMap:panelMaps.normal,normalScale:new THREE.Vector2(.25,.25),roughnessMap:panelMaps.rough,clearcoat:.25,clearcoatRoughness:.3}),
        Wall_Black:new THREE.MeshStandardMaterial({color:0x0b0f0e,metalness:.6,roughness:.5}),
        lambert1:new THREE.MeshStandardMaterial({color:0x3a4543,metalness:.5,roughness:.5}),
        Wall_blue:new THREE.MeshStandardMaterial({color:0x80d8cb,emissive:0x80d8cb,emissiveIntensity:1.8,roughness:.3}),
        Floor_and_vent:new THREE.MeshStandardMaterial({color:0x111716,metalness:.7,roughness:.35,normalMap:panelMaps.normal,normalScale:new THREE.Vector2(.18,.18)}),
        Floor_vent:new THREE.MeshStandardMaterial({color:0x1c2423,metalness:.8,roughness:.32}),
        Vent_light:new THREE.MeshStandardMaterial({color:0xdff6f2,emissive:0xcfeee8,emissiveIntensity:1.25}),
        Glass:new THREE.MeshPhysicalMaterial({color:0x9fd6cf,transparent:true,opacity:.18,roughness:.05,metalness:0,depthWrite:false})
      };
      hallway.traverse(o=>{if(o.isMesh){const m=restyle[o.material?.name];if(m){o.material.dispose();o.material=m;}o.receiveShadow=true;o.castShadow=false;}});
      const s=.75;hallway.scale.setScalar(s);hallway.position.set(-20.116*s,-1.56+3.0796*s,5-3.5788*s);corridor.add(hallway);dirty=true;
    }),
    gltf.loadAsync('assets/models/PrimaryIonDrive.glb').then(g=>{
      if(disposed)return;ionDrive=g.scene;credits.push(g.asset?.extras?.title);
      const lime=new THREE.Color(0xc2ed71).multiplyScalar(2.4),cyan=new THREE.Color(0x80d8cb).multiplyScalar(1.8);
      ionDrive.traverse(o=>{if(!o.isMesh)return;const name=o.material?.name;let m;
        if(name==='constant2')m=new THREE.MeshBasicMaterial({color:lime});
        else if(name==='constant1')m=new THREE.MeshBasicMaterial({color:cyan});
        else m=new THREE.MeshBasicMaterial({color:0x0b1a17,transparent:true,opacity:.5,depthWrite:false});
        o.material.dispose();o.material=m;});
      const pivot=new THREE.Group();pivot.position.set(0,.16,-15);pivot.rotation.y=Math.PI/2;pivot.scale.setScalar(.62);pivot.add(ionDrive);corridor.add(pivot);dirty=true;
    })
  ]);
  const ready=Promise.allSettled([hdrReady,modelsReady]).then(()=>{canvas.dataset.models=credits.filter(Boolean).join(' | ')||'none';onProgress(1);});

  let composer=null,gtao=null,finish=null,smaa=null;
  if(!compact){
    composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType}));
    composer.addPass(new RenderPass(scene,camera));
    gtao=new GTAOPass(scene,camera,1,1);gtao.updateGtaoMaterial({radius:.35,distanceExponent:1.2,thickness:1,scale:1.1,samples:12,distanceFallOff:1,screenSpaceRadius:false});gtao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:4,rings:2,samples:12});gtao.blendIntensity=.85;composer.addPass(gtao);
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1),.36,.5,.9));
    composer.addPass(new OutputPass());
    smaa=new SMAAPass();composer.addPass(smaa);
    finish=new ShaderPass(FinishShader);composer.addPass(finish);
  }

  let progress=0,targetProgress=0,U=0,introT=1,time=0,last=0,paused=false,visible=true,disposed=false,dirty=true,raf=0,narrow=false;
  let velocity=0,smoothVelocity=0,hoverIndex=-1,pointerInside=false;
  const pointer={x:0,y:0},pointerTarget={x:0,y:0},ndc=new THREE.Vector2(),raycaster=new THREE.Raycaster();
  const target=new THREE.Vector3(),baseCamera=new THREE.Vector3(),flyCamera=new THREE.Vector3(),tmp=new THREE.Vector3();
  const frameTimes=[];let quality=2;

  function pick(){
    if(gallery&&!reduced&&pointerInside&&U>JOURNEY.G0-.3&&U<JOURNEY.T-1){
      raycaster.setFromCamera(ndc,camera);const hit=raycaster.intersectObjects(gallery.panels.map(p=>p.slab),false)[0];
      const next=hit?hit.object.userData.panel:-1;if(next!==hoverPanel){hoverPanel=next;onPanelHover(next);}
    }else if(hoverPanel!==-1){hoverPanel=-1;onPanelHover(-1);}
    if(compact||reduced||U>1.3||!pointerInside){if(hoverIndex!==-1){hoverIndex=-1;onHover(-1);}return;}
    raycaster.setFromCamera(ndc,camera);
    const hit=raycaster.intersectObject(core,true).find(h=>h.object.userData.deck!==undefined);
    const next=hit?hit.object.userData.deck:-1;
    if(next!==hoverIndex){hoverIndex=next;onHover(next,hit?hit.point:null);}
  }
  function render(dt=0){
    if(disposed)return;
    U=reduced||compact?0:progress;
    const opening=smooth(.25,1.25,U);
    const align=smooth(1.2,1.8,U);
    const travel=smooth(1.6,2.05,U);
    const forward=smooth(1.9,3.3,U);
    const exit=smooth(3.3,JOURNEY.G0,U);
    const warpT=smooth(JOURNEY.T-1,JOURNEY.T,U);
    const inGallery=gallery&&U>3.5;
    core.visible=U<2.4||compact;corridor.visible=U>1.5&&U<4.3&&!compact;
    core.position.set(compact||narrow?0:mix(2.3,.3,opening),compact?0:narrow?-1.1:0,0);
    core.rotation.y=-.36+pointer.x*.07+Math.sin(time*.12)*.035;core.rotation.z=pointer.y*.006;
    core.scale.setScalar((narrow&&!compact?.78:1)*(1-travel*.78));
    const floorOffset=narrow&&!compact?-.75*(1-travel):0;floor.position.y=-1.56+floorOffset;seams.position.y=floorOffset;floor.visible=seams.visible=U<3.6;
    for(const d of hardware.decks){
      d.hover=damp(d.hover,d.index===hoverIndex?1:0,10,dt||.016);
      const drop=0; // the loading screen now performs the assembly
      d.group.position.y=d.baseY*(1+opening*.78)+d.hover*(.08+opening*.14)*(d.baseY>0?1:-1)+drop*(3.2+d.index*.35);
      d.group.rotation.y=(d.baseY>0?1:-1)*opening*.025+d.hover*.04;
      d.edge.emissiveIntensity=1.65+d.hover*4.5;
    }
    const shut=introT<1?1-easeOut(clamp((introT-.42)/.38)):0;
    for(const s of hardware.shells){const r=1.51+opening*1.25+shut*2.4;s.group.position.set(Math.sin(s.angle)*r,s.y*(1+opening*.45),Math.cos(s.angle)*r);s.group.rotation.y=s.angle+opening*.055;}
    for(const f of hardware.faces){const r=1.51+opening*.32;f.group.position.set(Math.sin(f.angle)*r,0,Math.cos(f.angle)*r);}
    for(const fan of hardware.fans)fan.rotation.z=time*.6;
    for(const packet of hardware.packets){packet.mesh.position.y=packet.base.y+Math.sin(time*.7+packet.phase)*.05;packet.mesh.rotation.set(time*.15,packet.phase,0);}
    // 1. orbit the core, 2. align to its interior, 3. fly the corridor, 4. pass through the drive, 5. glide between projects, 6. warp out.
    baseCamera.set(compact?6.4:narrow?6.0:6.5,compact?3.5:narrow?3.6:3.9,compact?9.8:narrow?10.8:11.8);
    baseCamera.lerp(tmp.set(0,1.05,9.2),align);
    flyCamera.set(Math.sin(forward*Math.PI)*.12,.05+Math.sin(forward*Math.PI*2)*.04,9.2-forward*18.5);
    camera.position.copy(baseCamera).lerp(flyCamera,travel);
    target.set(compact?0:narrow?0:mix(.35,0,opening),compact?0:narrow?.95:0,0);
    target.lerp(tmp.set(0,.35,flyCamera.z-10),travel);
    let fov=compact?37:narrow?43:37,fade=0;
    if(gallery&&U>3.3){
      stopView(0,stopCam,stopLook);
      camera.position.lerp(stopCam,exit);camera.position.y=mix(.05,stopCam.y,smooth(3.75,JOURNEY.G0,U));
      target.set(0,camera.position.y,camera.position.z-10).lerp(stopLook,smooth(3.8,JOURNEY.G0,U));
      fade=Math.max(0,1-Math.abs(U-3.66)/.17)*.92;
      if(U>=JOURNEY.G0){
        const idx=clamp((U-JOURNEY.G0)/(N-1))*(N-1),k=Math.min(N-2,Math.floor(idx)),f=idx-k,m=smooth(.62,1,f);
        stopView(k,stopCam,stopLook);stopView(k+1,stopCam2,stopLook2);
        camera.position.copy(stopCam).lerp(stopCam2,m);camera.position.z+=Math.sin(m*Math.PI)*1.3;camera.position.y+=Math.sin(m*Math.PI)*.18;
        target.copy(stopLook).lerp(stopLook2,m);
        camera.position.x+=pointer.x*.12;camera.position.y-=pointer.y*.06;
      }
      if(warpT>0){
        stopView(N-1,stopCam,stopLook);
        camera.position.copy(stopCam).lerp(tmp.set(0,1.75,stopCam.z),smooth(0,.3,warpT));camera.position.z-=warpT*warpT*62;
        warpLook.set(0,1.6,camera.position.z-10);target.copy(stopLook).lerp(warpLook,smooth(0,.35,warpT));
        fov=mix(fov,78,smooth(.1,.9,warpT));fade=smooth(.72,1,warpT);
      }
    }
    if(introT<1&&!compact){const k=1-easeInOut(clamp(introT/.9));camera.position.lerp(tmp.set(narrow?3:9.5,narrow?9:8.5,narrow?17:21),k);fade=Math.max(fade,1-clamp(introT/.18));}
    for(const w of waves){const e=clamp((introT-.62-w.userData.delay)/.38);w.visible=introT<1&&e>0&&!compact;if(w.visible){const r=.6+easeOut(e)*15;w.scale.setScalar(r);w.position.x=core.position.x;w.material.opacity=(1-e)*.85;}}
    camera.lookAt(target);
    if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}
    if(gallery){
      gallery.root.visible=inGallery;gallery.warp.visible=U>JOURNEY.T-1.4;
      if(inGallery){
        const focus=clamp((U-JOURNEY.G0)/(N-1))*(N-1);
        gallery.panels.forEach((pn,i)=>{const side=i%2===0?1:-1;pn.group.position.x=narrow?0:side*1.32;pn.group.rotation.y=narrow?0:-side*.32;pn.group.scale.setScalar(narrow?.7:1);
          const h=pn.hover;pn.tilt.rotation.x=damp(pn.tilt.rotation.x,h*-pointer.y*.18+Math.sin(time*.5+i)*.015,6,dt||.016);pn.tilt.rotation.y=damp(pn.tilt.rotation.y,h*pointer.x*.22+Math.sin(time*.4+i)*.02,6,dt||.016);});
        gallery.update(time,camera.position,focus,hoverPanel,dt||.016,U-JOURNEY.G0);
      }
    }
    if(hallway)hallway.visible=camera.position.z>-17.5;
    if(finish)finish.uniforms.fade.value=fade;
    // Scroll speed adds a slight banking roll and lens split; both settle to zero at rest.
    camera.rotateZ(THREE.MathUtils.clamp(smoothVelocity*.0009,-.02,.02));
    for(let i=0;i<routePackets.length;i++){const z=8-((time*.55+i*1.35)%24);routePackets[i].position.set(-.45+Math.sin(z*.15)*.08,-1.46,z);}
    if(ionDrive)ionDrive.rotation.x=time*.35;
    for(let i=0;i<corridorLights.length;i++)corridorLights[i].intensity=3+Math.sin(time*1.3+i*2)*.7;
    dieLight.position.set(core.position.x,.1+core.position.y,0);dieLight.intensity=.9+opening*.8;
    if(reflection)reflection.visible=!narrow&&travel<.1;
    scene.environmentIntensity=.7-travel*.34+(gallery?smooth(3.6,4.2,U)*.3:0);
    if(finish){finish.uniforms.time.value=time;finish.uniforms.aberration.value=.0012+Math.min(.006,Math.abs(smoothVelocity)*.00012);}
    if(composer)composer.render(dt);else renderer.render(scene,camera);
    canvas.dataset.scene='modular-hardware';
    dirty=false;
  }
  function resize(){const r=canvas.parentElement.getBoundingClientRect();narrow=r.width<760;renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.fov=compact?37:narrow?43:37;camera.updateProjectionMatrix();composer?.setSize(r.width,r.height);finish?.uniforms.resolution.value.set(r.width*dpr,r.height*dpr);dirty=true;render();}
  function adapt(dt){
    // Lower cost on slower devices: drop ambient occlusion first, then pixel density.
    if(!composer||quality===0)return;frameTimes.push(dt);if(frameTimes.length<90)return;
    const avg=frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length;frameTimes.length=0;
    if(avg>1/34){quality--;if(quality===1)gtao.enabled=false;else{dpr=1;renderer.setPixelRatio(1);resize();}canvas.dataset.quality=String(quality);}
  }
  function frame(now){
    if(disposed)return;raf=requestAnimationFrame(frame);
    const dt=Math.min(.05,(now-last)/1000||.016);last=now;if(!visible)return;
    const animate=!paused&&!reduced;
    if(animate)time+=dt;
    if(introT<1){introT=Math.min(1,introT+dt/3.2);dirty=true;}
    const before=progress;
    progress=reduced?0:damp(progress,targetProgress,11,dt);if(Math.abs(targetProgress-progress)<.0005)progress=targetProgress;
    smoothVelocity=damp(smoothVelocity,velocity,6,dt);velocity*=Math.exp(-dt*8);
    if(animate){pointer.x=damp(pointer.x,pointerTarget.x,4,dt);pointer.y=damp(pointer.y,pointerTarget.y,4,dt);}
    pick();
    const settling=hardware.decks.some(d=>d.hover>.001&&d.hover<.999)||Math.abs(smoothVelocity)>.05;
    if(animate||dirty||settling||before!==progress){render(dt);adapt(dt);}
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'80px'});observer.observe(canvas);
  const onPointer=e=>{
    if(e.pointerType!=='mouse'||reduced)return;
    pointerTarget.x=(e.clientX/innerWidth-.5)*2;pointerTarget.y=(e.clientY/innerHeight-.5)*2;
    const r=canvas.getBoundingClientRect();pointerInside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
    ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
  };
  const onLeave=()=>{pointerInside=false;};
  const onLost=e=>{e.preventDefault();cancelAnimationFrame(raf);onFailure(new Error('WebGL context lost'));};
  window.addEventListener('resize',resize);window.addEventListener('pointermove',onPointer,{passive:true});document.addEventListener('pointerleave',onLeave);canvas.addEventListener('webglcontextlost',onLost);resize();raf=requestAnimationFrame(frame);
  return {
    ready,camera,
    projectDeck(index){const d=hardware.decks[index];if(!d)return null;tmp.set(0,0,0);d.group.localToWorld(tmp);tmp.project(camera);return {x:(tmp.x+1)/2,y:(1-tmp.y)/2};},
    update(u){targetProgress=Math.max(0,Math.min(JOURNEY.T,u));if(reduced){progress=0;dirty=true;}},
    setVelocity(v){velocity=v||0;},
    playIntro(){if(!reduced&&!compact){introT=0;dirty=true;}},
    setPaused(v){paused=v;dirty=true;},
    setReduced(v){reduced=v;if(v){progress=0;time=0;pointer.x=pointer.y=pointerTarget.x=pointerTarget.y=0;hoverIndex=-1;}dirty=true;},
    dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('pointermove',onPointer);document.removeEventListener('pointerleave',onLeave);canvas.removeEventListener('webglcontextlost',onLost);reflection?.getRenderTarget().dispose();composer?.dispose();environment.dispose();pmrem.dispose();const geos=new Set(),mats=new Set(),textures=new Set([...Object.values(maps),...Object.values(panelMaps)]);scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const g of geos)g.dispose();for(const m of mats)m.dispose();for(const t of textures)t.dispose();renderer.dispose();}
  };
}
