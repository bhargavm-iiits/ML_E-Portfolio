import * as THREE from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/addons/geometries/RoundedBoxGeometry.js';

// Project gallery: glass panels floating in a dark space, each with a holographic emblem.
// Panel artwork is decorative; the readable project text lives in the DOM overlay.
export const GALLERY_Z0=-30, GALLERY_GAP=7.2;
const CYAN=0x80d8cb, LIME=0xc2ed71, AMBER=0xdfb56d;
const glow=(hex,k)=>new THREE.Color(hex).multiplyScalar(k);

function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawPanel(canvas,p,i,n,flow,art){
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'rgba(24,38,36,.92)');g.addColorStop(1,'rgba(10,16,15,.86)');
  roundRect(ctx,6,6,W-12,H-12,28);ctx.fillStyle=g;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='rgba(128,216,203,.55)';ctx.stroke();
  ctx.save();roundRect(ctx,6,6,W-12,H-12,28);ctx.clip();ctx.strokeStyle='rgba(128,216,203,.06)';ctx.lineWidth=1;
  for(let x=0;x<W;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.restore();
  // window dots and title bar
  [['#dfb56d',0],['#80d8cb',1],['#c2ed71',2]].forEach(([c,k])=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(46+k*26,46,7,0,Math.PI*2);ctx.fill();});
  ctx.font='500 22px "Geist Mono", monospace';ctx.fillStyle='#a4b0a9';ctx.textAlign='right';ctx.fillText(`${String(i+1).padStart(2,'0')} / ${String(n).padStart(2,'0')}`,W-44,54);ctx.textAlign='left';
  ctx.fillStyle='#80d8cb';ctx.font='500 22px "Geist Mono", monospace';ctx.fillText(p.category,44,118);
  ctx.fillStyle='#f0f0e6';let size=p.name.length>16?68:86;ctx.font=`500 ${size}px Geist, sans-serif`;while(ctx.measureText(p.name).width>W-90&&size>40){size-=4;ctx.font=`500 ${size}px Geist, sans-serif`;}ctx.fillText(p.name,40,118+size*1.02);
  // flow chips
  let x=44,y=118+size*1.02+38;ctx.font='500 20px "Geist Mono", monospace';
  for(const [label,kind] of flow.stages){const t=(kind==='gate'?'✓ ':kind==='in'?'› ':'')+label;const w=ctx.measureText(t).width+28;if(x+w>W-44){x=44;y+=48;}
    roundRect(ctx,x,y,w,36,6);ctx.fillStyle=kind==='gate'?'rgba(194,237,113,.14)':kind==='in'?'rgba(128,216,203,.12)':'rgba(255,255,255,.04)';ctx.fill();ctx.strokeStyle=kind==='gate'?'#c2ed71':kind==='in'?'#3d7a71':'#3a4843';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=kind==='gate'?'#c2ed71':kind==='in'?'#80d8cb':'#e4e8e1';ctx.fillText(t,x+14,y+25);x+=w+12;}
  y+=60;
  if(art){const ah=H-y-86,aw=ah*560/330;ctx.globalAlpha=.95;ctx.drawImage(art,(W-aw)/2,y,aw,ah);ctx.globalAlpha=1;}
  // stack tags
  x=44;ctx.font='500 18px "Geist Mono", monospace';
  for(const s of p.stack){const w=ctx.measureText(s).width+24;roundRect(ctx,x,H-66,w,32,5);ctx.strokeStyle='#2f3d38';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#becbc0';ctx.fillText(s,x+12,H-43);x+=w+10;}
}

function emblem(kind,mats){
  const g=new THREE.Group();const {line,lineLime,fill,fillLime}=mats;
  const edges=(geo,m=line)=>new THREE.LineSegments(new THREE.EdgesGeometry(geo,20),m);
  const both=(geo,f=fill,l=line)=>{const o=new THREE.Group();o.add(new THREE.Mesh(geo,f));o.add(edges(geo,l));return o;};
  const lineOf=(pts,m=lineLime)=>new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(...p))),m);
  if(kind==='plant'){
    const s=new THREE.Shape();s.moveTo(0,-.62);s.bezierCurveTo(.5,-.35,.52,.25,0,.68);s.bezierCurveTo(-.52,.25,-.5,-.35,0,-.62);
    const geo=new THREE.ShapeGeometry(s,24);const leaf=both(geo,fillLime,lineLime);g.add(leaf);
    g.add(lineOf([[0,-.75,0],[0,.6,0]]));for(let k=0;k<5;k++){const y=-.4+k*.22;g.add(lineOf([[0,y,0],[.3-k*.03,y+.16,0]]));g.add(lineOf([[0,y,0],[-.3+k*.03,y+.16,0]]));}
    g.rotation.z=-.35;
  }else if(kind==='eye'){
    g.add(edges(new THREE.TorusGeometry(.55,.04,8,48)));const iris=both(new THREE.IcosahedronGeometry(.28,1),fillLime,lineLime);g.add(iris);
    const lens=edges(new THREE.TorusGeometry(.42,.01,4,48),lineLime);lens.scale.y=.45;g.add(lens);g.userData.spin=iris;
  }else if(kind==='voice'){
    const bars=[];for(let k=0;k<13;k++){const b=both(new THREE.BoxGeometry(.06,1,.06));b.position.x=-.6+k*.1;g.add(b);bars.push(b);}g.userData.bars=bars;
    g.add(edges(new THREE.TorusGeometry(.75,.008,4,64),lineLime));
  }else if(kind==='route'){
    const grid=new THREE.GridHelper(1.4,7,CYAN,CYAN);grid.material=line;g.add(grid);
    const curve=new THREE.CatmullRomCurve3([[-.6,0,.5],[-.2,0,.2],[.1,0,.35],[.35,0,-.1],[.6,0,-.5]].map(p=>new THREE.Vector3(...p)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,48,.022,6,false),new THREE.MeshBasicMaterial({color:glow(LIME,2.2)})));
    for(const [px,pz] of [[-.6,.5],[.1,.35],[.6,-.5]]){const pin=both(new THREE.ConeGeometry(.06,.2,8),fillLime,lineLime);pin.rotation.x=Math.PI;pin.position.set(px,.14,pz);g.add(pin);}
    g.rotation.x=.45;
  }else if(kind==='excel'){
    for(let r=0;r<4;r++)for(let c=0;c<5;c++){const hot=(r===1&&c>1)||(r===2&&c===3);const cell=both(new THREE.BoxGeometry(.2,.13,.04),hot?fillLime:fill,hot?lineLime:line);cell.position.set(-.44+c*.22,.25-r*.16,0);g.add(cell);}
    g.add(lineOf([[.0,.09,.05],[.3,-.4,.25],[.44,.09,.05]]));
  }else if(kind==='claim'){
    for(let k=0;k<3;k++){const d=both(new THREE.PlaneGeometry(.6,.8));d.position.set(-.14+k*.14,.08-k*.08,-k*.12);g.add(d);}
    const seal=edges(new THREE.TorusGeometry(.18,.025,6,32),lineLime);seal.position.set(.32,-.32,.15);g.add(seal);
    for(let k=0;k<4;k++)g.add(lineOf([[.0,.3-k*.12,.02],[.36-(k%2)*.12,.3-k*.12,.02]],line));
  }else if(kind==='sticker'){
    const s=new THREE.Shape();const r=.12,w=.7;s.moveTo(-w/2+r,-w/2);s.lineTo(w/2-r,-w/2);s.quadraticCurveTo(w/2,-w/2,w/2,-w/2+r);s.lineTo(w/2,w/2-r);s.quadraticCurveTo(w/2,w/2,w/2-r,w/2);s.lineTo(-w/2+r,w/2);s.quadraticCurveTo(-w/2,w/2,-w/2,w/2-r);s.lineTo(-w/2,-w/2+r);s.quadraticCurveTo(-w/2,-w/2,-w/2+r,-w/2);
    for(let k=0;k<3;k++){const card=both(new THREE.ShapeGeometry(s,6),k===0?fillLime:fill,k===0?lineLime:line);card.position.set(k*.08,-k*.06,-k*.1);card.rotation.z=k*.12;g.add(card);}
    const spark=both(new THREE.OctahedronGeometry(.12),fillLime,lineLime);spark.position.set(.42,.42,.1);g.add(spark);g.userData.spin=spark;
  }else{ // fix
    for(let k=0;k<3;k++){const b=both(new THREE.BoxGeometry(.9-k*.12,.16,.5));b.position.y=-.28+k*.24;g.add(b);}
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-.22,.42,.3],[-.06,.28,.3],[.26,.62,.3]].map(p=>new THREE.Vector3(...p)),false,'catmullrom',0),24,.03,6,false),new THREE.MeshBasicMaterial({color:glow(LIME,2.4)})));
  }
  // holographic pedestal
  const base=new THREE.Group();base.position.y=-.95;
  base.add(edges(new THREE.CylinderGeometry(.6,.66,.08,40)));
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.012,6,64),new THREE.MeshBasicMaterial({color:glow(CYAN,2.2)}));ring.rotation.x=Math.PI/2;base.add(ring);
  const disk=new THREE.Mesh(new THREE.CircleGeometry(.6,40),new THREE.MeshBasicMaterial({color:CYAN,transparent:true,opacity:.18,depthWrite:false}));disk.rotation.x=-Math.PI/2;disk.position.y=.045;base.add(disk);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.55,.6,1.0,32,1,true),new THREE.MeshBasicMaterial({color:CYAN,transparent:true,opacity:.05,depthWrite:false,side:THREE.DoubleSide}));beam.position.y=.5;base.add(beam);
  const holder=new THREE.Group();holder.add(g);holder.add(base);holder.userData.core=g;
  return holder;
}

export function makeGallery({projects,flows,artwork,materials,renderer}){
  const root=new THREE.Group();root.visible=false;
  const mats={
    line:new THREE.LineBasicMaterial({color:glow(CYAN,1.6),transparent:true,opacity:.85}),
    lineLime:new THREE.LineBasicMaterial({color:glow(LIME,2.0),transparent:true,opacity:.95}),
    fill:new THREE.MeshBasicMaterial({color:CYAN,transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide}),
    fillLime:new THREE.MeshBasicMaterial({color:LIME,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide})
  };
  const slabGeo=new RoundedBoxGeometry(2.7,1.7,.06,3,.05);
  const glass=new THREE.MeshPhysicalMaterial({color:0xcff3ee,metalness:0,roughness:.12,transmission:.9,thickness:.08,ior:1.4,clearcoat:1,clearcoatRoughness:.05,transparent:true,opacity:.55,envMapIntensity:.9});
  const panels=[];const n=projects.length;
  projects.forEach((p,i)=>{
    const side=i%2===0?1:-1;
    const group=new THREE.Group();group.position.set(side*1.32,.25,GALLERY_Z0-i*GALLERY_GAP);group.rotation.y=-side*.32;root.add(group);
    const tilt=new THREE.Group();group.add(tilt);
    const slab=new THREE.Mesh(slabGeo,glass.clone());slab.userData.panel=i;tilt.add(slab);
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=806;
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
    // The face is revealed top-down by a world-space clipping plane, led by a glowing scan line.
    const clip=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(2.62,1.65),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,clippingPlanes:[clip]}));face.position.z=.035;face.userData.panel=i;tilt.add(face);
    const frame=new THREE.LineSegments(new THREE.EdgesGeometry(slabGeo,30),new THREE.LineBasicMaterial({color:glow(CYAN,1.4),transparent:true,opacity:.5}));tilt.add(frame);
    const scan=new THREE.Mesh(new THREE.PlaneGeometry(2.74,.016),new THREE.MeshBasicMaterial({color:glow(LIME,3),transparent:true,depthWrite:false}));scan.position.z=.045;tilt.add(scan);
    const scanGlow=new THREE.Mesh(new THREE.PlaneGeometry(2.74,.22),new THREE.MeshBasicMaterial({color:LIME,transparent:true,opacity:.12,depthWrite:false}));scanGlow.position.z=.042;tilt.add(scanGlow);
    const holo=emblem(p.art,mats);holo.position.set(-side*.78,-.42,.55);holo.scale.setScalar(.62);group.add(holo);
    // small floating cubes around each panel
    for(let k=0;k<4;k++){const c=new THREE.Mesh(new THREE.BoxGeometry(.09,.09,.09),k===0?materials.lime:materials.softCyan);c.position.set(side*(1.6+Math.random()*.6),-.8+Math.random()*1.9,-.4+Math.random()*.8);c.userData.float=Math.random()*6;group.add(c);}
    const draw=img=>{drawPanel(canvas,p,i,n,flows[p.id],img);tex.needsUpdate=true;};
    draw(null);
    const img=new Image();img.onload=()=>draw(img);img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(artwork(p.art));
    document.fonts?.ready.then(()=>draw(img.complete&&img.naturalWidth?img:null));
    panels.push({group,tilt,slab,face,frame,holo,side,hover:0,clip,scan,scanGlow,reveal:0,shatter:0});
  });
  // drifting dust across the whole gallery
  const count=900,pos=new Float32Array(count*3);const span=n*GALLERY_GAP+30;
  for(let k=0;k<count;k++){pos[k*3]=(Math.random()-.5)*16;pos[k*3+1]=(Math.random()-.5)*8;pos[k*3+2]=GALLERY_Z0+12-Math.random()*span;}
  const dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(pos,3)),new THREE.PointsMaterial({color:glow(CYAN,1.2),size:.025,transparent:true,opacity:.7,depthWrite:false}));root.add(dust);
  // faint floor grid under the gallery
  const grid=new THREE.GridHelper(span+20,Math.round((span+20)/1.2),0x1d3a35,0x14231f);grid.position.set(0,-1.75,GALLERY_Z0-span/2+12);grid.material.transparent=true;grid.material.opacity=.55;root.add(grid);

  // Project transitions: the card you are leaving shatters into glass shards while light rings swirl
  // around the camera path. Everything is driven by scroll position, so scrolling back reassembles it.
  const SHARDS=150,GLINTS=36;
  const shardGeo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.42,0,.55,-.3,0,-.05,.58,0, -.5,-.42,-.012,-.05,.58,-.012,.55,-.3,-.012],3));shardGeo.computeVertexNormals();
  const shardMat=new THREE.MeshPhysicalMaterial({color:0xa8e6dc,metalness:.1,roughness:.03,clearcoat:1,clearcoatRoughness:.02,transparent:true,opacity:.34,envMapIntensity:1.2,side:THREE.DoubleSide,depthWrite:false});
  const shards=new THREE.InstancedMesh(shardGeo,shardMat,SHARDS),glints=new THREE.InstancedMesh(shardGeo,new THREE.MeshBasicMaterial({color:glow(LIME,2.6),side:THREE.DoubleSide,transparent:true,depthWrite:false}),GLINTS);
  shards.frustumCulled=glints.frustumCulled=false;shards.visible=glints.visible=false;root.add(shards,glints);
  const rand=(a,b)=>a+Math.random()*(b-a);
  const pieces=Array.from({length:SHARDS+GLINTS},(_,k)=>{const glint=k>=SHARDS;
    const o=new THREE.Vector3(rand(-1.3,1.3),rand(-.8,.8),.04);
    return {o,glint,v:new THREE.Vector3(o.x*rand(.5,1.4)+rand(-.6,.6),o.y*rand(.5,1.4)+rand(-.4,.6),rand(1.2,3.6)),axis:new THREE.Vector3(rand(-1,1),rand(-1,1),rand(-1,1)).normalize(),spin:rand(2,7),size:glint?rand(.018,.04):rand(.04,.13),delay:rand(0,.12)};});
  const rings=new THREE.Group();rings.visible=false;root.add(rings);
  for(let k=0;k<3;k++){const r=new THREE.Mesh(new THREE.TorusGeometry(1,k===1?.006:.01,6,160,Math.PI*(1.3+k*.25)),new THREE.MeshBasicMaterial({color:glow(k===1?CYAN:LIME,2.4),transparent:true,depthWrite:false}));r.userData.k=k;rings.add(r);}
  const tm=new THREE.Matrix4(),tq=new THREE.Quaternion(),tv=new THREE.Vector3(),ts=new THREE.Vector3();
  function transition(raw,time){
    // The card holds while its copy is on screen, then bursts as the copy fades and the camera moves on.
    const k=Math.floor(raw),f=raw-k,live=k>=0&&k<n-1&&f>.43&&f<.97,b=Math.min(1,Math.max(0,(f-.43)/.54));
    shards.visible=glints.visible=rings.visible=live;
    panels.forEach((pn,i)=>{pn.shatter=i===k&&k<n-1?sm(.45,.62,f):i<k?1:0;});
    if(!live)return;
    const pn=panels[k];pn.tilt.updateWorldMatrix(true,false);
    let si=0,gi=0;
    for(const p of pieces){
      const t=Math.max(0,b-p.delay)/(1-p.delay),e=1-Math.pow(1-sm(0,.8,t),2),fade=1-sm(.6,.97,b);
      tv.copy(p.o).addScaledVector(p.v,e*1.5);tv.y-=e*e*.35;tv.applyMatrix4(pn.tilt.matrixWorld);
      tq.setFromAxisAngle(p.axis,p.spin*e+time*.2);ts.setScalar(p.size*fade*(b<.02?0:1));tm.compose(tv,tq,ts);
      if(p.glint)glints.setMatrixAt(gi++,tm);else shards.setMatrixAt(si++,tm);
    }
    shards.instanceMatrix.needsUpdate=glints.instanceMatrix.needsUpdate=true;
    // rings sit halfway to the next card and open up as the camera passes through them
    const pa=panels[k].group.position,pb=panels[k+1].group.position,o=sm(.45,.62,f)*(1-sm(.92,.98,f));
    rings.position.set(0,.35,(pa.z+pb.z)/2+1.5);
    rings.children.forEach(r=>{const j=r.userData.k;r.scale.setScalar(1.3+j*.45+f*1.2);r.rotation.z=(j%2?-1:1)*(f*5+j*1.7)+time*.15;r.material.opacity=o*(.75-j*.15);});
  }

  // warp field: streaking circuit lines past the last panel
  const warp=new THREE.Group();warp.visible=false;root.add(warp);
  const lastZ=GALLERY_Z0-(n-1)*GALLERY_GAP;
  const streakGeo=new THREE.BoxGeometry(1,1,1);
  const streakMats=[new THREE.MeshBasicMaterial({color:glow(LIME,3.2),fog:false}),new THREE.MeshBasicMaterial({color:glow(CYAN,2.6),fog:false})];
  const streaks=[];
  for(const m of streakMats){const N=260;const mesh=new THREE.InstancedMesh(streakGeo,m,N);const mat=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),v=new THREE.Vector3();
    for(let k=0;k<N;k++){const a=Math.random()*Math.PI*2,r=1.2+Math.random()*5;const horiz=Math.random()<.5;
      v.set(Math.cos(a)*r,1.6+Math.sin(a)*r*.7,lastZ-4-Math.random()*70);
      s.set(horiz?.4+Math.random()*1.4:.022,.022,horiz?.022:1.2+Math.random()*3.5);mat.compose(v,q,s);mesh.setMatrixAt(k,mat);}
    warp.add(mesh);streaks.push(mesh);}

  const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  function update(time,cameraPos,focus,hoverIdx,dt,raw=focus){
    const active=Math.round(focus);
    transition(raw,time);
    panels.forEach((pn,i)=>{
      pn.hover+=((i===hoverIdx?1:0)-pn.hover)*(1-Math.exp(-dt*8));
      const near=Math.max(0,1-Math.abs(focus-i)*1.4);
      pn.frame.material.opacity=.25+near*.45+pn.hover*.3;
      // Print-in: reveal as the camera approaches; panels already passed stay printed.
      const r=sm(i-.62,i-.06,raw);pn.reveal=r;
      const s=pn.group.scale.y,half=.83*s,top=pn.group.position.y+half,th=top-r*(2*half+.04);
      pn.clip.constant=-th;
      const ly=(th-pn.group.position.y)/s,on=r>.002&&r<.995;
      pn.scan.visible=pn.scanGlow.visible=on;pn.scan.position.y=ly;pn.scanGlow.position.y=ly+.1;
      pn.scan.material.opacity=on?Math.min(1,Math.sin(r*Math.PI)*2):0;
      const keep=1-(pn.shatter||0);pn.slab.material.opacity=.55*keep;pn.slab.visible=pn.face.visible=pn.frame.visible=keep>.01;pn.face.material.opacity=keep;pn.frame.material.opacity*=keep;
      const core=pn.holo.userData.core;core.rotation.y=time*.5+i;core.position.y=.05+Math.sin(time*1.1+i)*.06;
      if(core.userData.bars)core.userData.bars.forEach((b,k)=>{b.scale.y=.25+Math.abs(Math.sin(time*2.2+k*.6))*.9;});
      if(core.userData.spin)core.userData.spin.rotation.x=time*.8;
      pn.holo.scale.setScalar(.62*(1+pn.hover*.1+near*.06)*keep);pn.holo.visible=keep>.01;
      pn.group.children.forEach(c=>{if(c.userData.float!==undefined){c.position.y+=Math.sin(time*.8+c.userData.float)*.0015;c.rotation.set(time*.3+c.userData.float,time*.2,0);}});
    });
    dust.rotation.z=time*.01;
  }
  return {root,panels,warp,streaks,update,lastZ,count:n};
}
