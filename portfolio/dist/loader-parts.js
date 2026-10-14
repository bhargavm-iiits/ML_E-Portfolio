import * as THREE from './vendor/three.module.js';

// Hardware for the loading sequence: one stable, named assembly whose parts move between an exploded
// pose and their seats. Fine PCB detail is a seeded procedural texture; larger chips and pins are geometry.
export function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const GREEN=new THREE.Color(0x80ff87);

function pcbTextures(seed,{size=1024,dark=false,cpu=false}={}){
  const rand=seeded(seed);
  const base=document.createElement('canvas');base.width=base.height=size;const b=base.getContext('2d');
  const glow=document.createElement('canvas');glow.width=glow.height=size;const g=glow.getContext('2d');
  b.fillStyle=dark?'#0d2219':'#123a2b';b.fillRect(0,0,size,size);
  for(let i=0;i<1600;i++){b.fillStyle=`rgba(${20+rand()*20|0},${60+rand()*30|0},${40+rand()*20|0},.25)`;b.fillRect(rand()*size,rand()*size,1+rand()*4,1);}
  g.fillStyle='#000';g.fillRect(0,0,size,size);
  const grid=size/32,keep=cpu?[size*.32,size*.68]:null;
  // Routes: start at an edge or a chip, turn only at 45° or 90°, end on a pad.
  for(let r=0;r<70;r++){
    let x=Math.floor(rand()*32)*grid,y=Math.floor(rand()*32)*grid;const pts=[[x,y]];let dir=Math.floor(rand()*4)*Math.PI/2;
    for(let s=0;s<3+Math.floor(rand()*4);s++){const len=grid*(2+Math.floor(rand()*7));x+=Math.round(Math.cos(dir))*len;y+=Math.round(Math.sin(dir))*len;x=Math.max(grid,Math.min(size-grid,x));y=Math.max(grid,Math.min(size-grid,y));pts.push([x,y]);
      if(rand()<.5){const d=grid*(1+Math.floor(rand()*3));const diag=dir+(rand()<.5?1:-1)*Math.PI/4;x+=Math.sign(Math.round(Math.cos(diag)*10))*d;y+=Math.sign(Math.round(Math.sin(diag)*10))*d;pts.push([x,y]);}
      dir+=(rand()<.5?1:-1)*Math.PI/2;}
    const w=rand()<.2?4:2;
    for(const [ctx,col,lw] of [[b,'#2f7d55',w+1],[g,'#5dff86',w]]){ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.lineJoin='miter';ctx.beginPath();ctx.moveTo(...pts[0]);for(const p of pts.slice(1))ctx.lineTo(...p);ctx.stroke();}
    for(const [px,py] of [pts[0],pts[pts.length-1]]){b.fillStyle='#c9d1c6';b.beginPath();b.arc(px,py,w+3,0,Math.PI*2);b.fill();g.fillStyle='#b8ffc4';g.beginPath();g.arc(px,py,w+2,0,Math.PI*2);g.fill();}
  }
  for(let i=0;i<220;i++){const x=rand()*size,y=rand()*size;b.fillStyle='#b7beb3';b.beginPath();b.arc(x,y,2.2,0,Math.PI*2);b.fill();b.fillStyle='#0b1a13';b.beginPath();b.arc(x,y,1,0,Math.PI*2);b.fill();}
  for(let i=0;i<90;i++){const x=rand()*size,y=rand()*size,w=8+rand()*18,h=4+rand()*8;b.fillStyle=rand()<.5?'#1b1f1e':'#5b4f36';b.fillRect(x,y,w,h);b.fillStyle='#c4c9c0';b.fillRect(x-2,y+1,2,h-2);b.fillRect(x+w,y+1,2,h-2);}
  if(keep){g.fillStyle='#000';g.fillRect(keep[0],keep[0],keep[1]-keep[0],keep[1]-keep[0]);}
  const map=new THREE.CanvasTexture(base);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const emissiveMap=new THREE.CanvasTexture(glow);emissiveMap.colorSpace=THREE.SRGBColorSpace;emissiveMap.anisotropy=8;
  return {map,emissiveMap};
}
function boardMaterial(seed,opts){const t=pcbTextures(seed,opts);return new THREE.MeshStandardMaterial({map:t.map,emissiveMap:t.emissiveMap,emissive:GREEN.clone(),emissiveIntensity:0,metalness:.35,roughness:.55});}

function chamferRect(w,h,c){const s=new THREE.Shape();s.moveTo(-w/2+c,-h/2);s.lineTo(w/2-c,-h/2);s.lineTo(w/2,-h/2+c);s.lineTo(w/2,h/2-c);s.lineTo(w/2-c,h/2);s.lineTo(-w/2+c,h/2);s.lineTo(-w/2,h/2-c);s.lineTo(-w/2,-h/2+c);s.closePath();return s;}
function holeRect(w,h,x=0,y=0){const p=new THREE.Path();p.moveTo(x-w/2,y-h/2);p.lineTo(x-w/2,y+h/2);p.lineTo(x+w/2,y+h/2);p.lineTo(x+w/2,y-h/2);p.closePath();return p;}
function holeCircle(r,x=0,y=0){const p=new THREE.Path();p.absarc(x,y,r,0,Math.PI*2,true);return p;}
function extrude(shape,depth){const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,curveSegments:24});g.translate(0,0,-depth/2);return g;}

// Armour face: dark brushed plate whose emissive layer carries circuit traces that radiate from the
// centre (around the iris on the front face) out to the edges, turning only at 45° or 90° and ending on pads.
function traceTextures(seed,{iris=false,size=512}={}){
  const rand=seeded(seed),c=document.createElement('canvas'),e=document.createElement('canvas');c.width=c.height=e.width=e.height=size;
  const b=c.getContext('2d'),g=e.getContext('2d');
  b.fillStyle='#2b3236';b.fillRect(0,0,size,size);
  for(let i=0;i<900;i++){const y=rand()*size;b.fillStyle=`rgba(${rand()<.5?200:20},${rand()<.5?210:24},${rand()<.5?214:28},${.03+rand()*.05})`;b.fillRect(0,y,size,1);}
  for(const y of [size*.17,size*.83]){b.fillStyle='rgba(0,0,0,.35)';b.fillRect(0,y-2,size,4);b.fillStyle='rgba(255,255,255,.08)';b.fillRect(0,y+2,size,1);}
  g.fillStyle='#000';g.fillRect(0,0,size,size);
  const C=size/2,R0=iris?size*.31:size*.12,unit=size/48;
  const lines=[];
  for(let side=0;side<4;side++){const n=iris?7:5;
    for(let k=0;k<n;k++){const off=(k-(n-1)/2)*unit*1.6;
      const dir=[[1,0],[-1,0],[0,1],[0,-1]][side],perp=[-dir[1],dir[0]];
      let x=C+dir[0]*R0+perp[0]*off,y=C+dir[1]*R0+perp[1]*off;const pts=[[x,y]];
      const run1=unit*(2+rand()*4);x+=dir[0]*run1;y+=dir[1]*run1;pts.push([x,y]);
      const fan=(off/unit)*.9;x+=dir[0]*Math.abs(fan)*unit+perp[0]*fan*unit;y+=dir[1]*Math.abs(fan)*unit+perp[1]*fan*unit;pts.push([x,y]);
      const run2=unit*(3+rand()*6);x+=dir[0]*run2;y+=dir[1]*run2;pts.push([x,y]);
      if(rand()<.6){const d=unit*(1+rand()*2)*(rand()<.5?1:-1);x+=dir[0]*Math.abs(d)+perp[0]*d;y+=dir[1]*Math.abs(d)+perp[1]*d;pts.push([x,y]);}
      lines.push(pts);}}
  for(const pts of lines){
    for(const [ctx,col,w] of [[b,'#2c3a36',4],[g,'#62ff8a',2.6]]){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineJoin='miter';ctx.beginPath();ctx.moveTo(...pts[0]);for(const p of pts.slice(1))ctx.lineTo(...p);ctx.stroke();}
    const [px,py]=pts[pts.length-1];g.fillStyle='#c4ffd0';g.beginPath();g.arc(px,py,4,0,Math.PI*2);g.fill();b.fillStyle='#8f9a95';b.beginPath();b.arc(px,py,4.5,0,Math.PI*2);b.fill();}
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const emissiveMap=new THREE.CanvasTexture(e);emissiveMap.colorSpace=THREE.SRGBColorSpace;emissiveMap.anisotropy=8;
  return {map,emissiveMap};
}
function faceMaterial(seed,opts){const t=traceTextures(seed,opts);return new THREE.MeshStandardMaterial({map:t.map,emissiveMap:t.emissiveMap,emissive:GREEN.clone(),emissiveIntensity:0,metalness:.85,roughness:.4,envMapIntensity:.45});}
// Extruded shapes use world units as UVs; rescale them to 0–1 across the plate so face textures fit.
function fitUV(geo,w,h){const uv=geo.attributes.uv,p=geo.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);uv.needsUpdate=true;return geo;}

export function buildAssembly(M){
  const root=new THREE.Group();root.name='ComputeAssembly';
  const parts=[];// {obj, from:{p,r}, to:{p,r}, win:[t0,t1], bob, show}
  const add=(obj,from,to,win,bob=.05,show=-1)=>{root.add(obj);parts.push({obj,from,to,win,bob,show,phase:parts.length*1.7});return obj;};
  const V=(x,y,z)=>new THREE.Vector3(x,y,z),E=(x=0,y=0,z=0)=>new THREE.Euler(x,y,z);
  const inst=(geo,mat,poses,parent)=>{const m=new THREE.InstancedMesh(geo,mat,poses.length);const o=new THREE.Object3D();poses.forEach((p,i)=>{o.position.set(p[0],p[1],p[2]);o.rotation.set(0,p[3]||0,0);o.updateMatrix();m.setMatrixAt(i,o.matrix);});parent.add(m);return m;};

  // Silver aperture plates (outer cap, carriers, base): chamfered square, central square hole, corner holes, tabs.
  function aperturePlate(w,hole,thick,mat,tabs=true){
    const s=chamferRect(w,w,.16);s.holes.push(holeRect(hole,hole));for(const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1]])s.holes.push(holeCircle(.05,x*(w/2-.17),y*(w/2-.17)));
    const g=new THREE.Group();const m=new THREE.Mesh(extrude(s,thick),mat);m.rotation.x=-Math.PI/2;g.add(m);
    if(tabs)for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const t=new THREE.Mesh(new THREE.BoxGeometry(.34,thick*.8,.12),mat);t.position.set(Math.sin(a)*(w/2+.05),0,Math.cos(a)*(w/2+.05));t.rotation.y=a;g.add(t);}
    return g;
  }
  function pcb(seed,w,thick,opts={}){
    const mat=boardMaterial(seed,opts);M.boards.push(mat);
    const g=new THREE.Group();const m=new THREE.Mesh(new THREE.BoxGeometry(w,thick,w),[M.boardEdge,M.boardEdge,mat,M.boardEdge,M.boardEdge,M.boardEdge]);g.add(m);
    const rand=seeded(seed*7+3),chips=[],caps=[];
    for(let i=0;i<(opts.chips??7);i++){const x=(rand()-.5)*(w-.5),z=(rand()-.5)*(w-.5);if(opts.cpu&&Math.abs(x)<.75&&Math.abs(z)<.75)continue;chips.push([x,thick/2+.025,z,Math.floor(rand()*2)*Math.PI/2]);}
    for(let i=0;i<(opts.caps??14);i++){const x=(rand()-.5)*(w-.3),z=(rand()-.5)*(w-.3);if(opts.cpu&&Math.abs(x)<.75&&Math.abs(z)<.75)continue;caps.push([x,thick/2+.03,z]);}
    if(chips.length)inst(M.chipGeo,M.chip,chips,g);if(caps.length)inst(M.capGeo,M.cap,caps,g);
    if(opts.die){const d=new THREE.Mesh(new THREE.BoxGeometry(opts.die,.05,opts.die),M.chip);d.position.y=thick/2+.03;g.add(d);}
    return g;
  }
  const shield=w=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(w,.025,w),M.silverDim));return g;};
  // Layer stack: exploded y (spread about 6 units, as in the opening frame) → seated y inside a 2.4-unit module.
  const STACK=[
    ['TopOuterPlate',()=>aperturePlate(2.42,.82,.07,M.silver),2.95,1.22,[7.2,8.2]],
    ['UpperBoardA',()=>pcb(11,2.28,.05,{chips:9,die:.62}),2.4,.99,[5.25,6.05]],
    ['UpperCarrier',()=>aperturePlate(2.34,1.2,.05,M.silver,false),1.88,.82,[5.35,6.15]],
    ['UpperShield',()=>shield(2.24),1.42,.64,[5.45,6.25]],
    ['UpperInterposer',()=>pcb(13,1.8,.04,{chips:6,caps:10,die:.5}),.78,.4,[5.55,6.3]],
    ['LowerInterposer',()=>pcb(29,1.8,.04,{chips:6,caps:10}),-.74,-.38,[5.55,6.3]],
    ['LowerShield',()=>shield(2.24),-1.3,-.64,[5.45,6.25]],
    ['LowerBoardA',()=>pcb(23,2.28,.05,{chips:10,die:.55}),-1.85,-.82,[5.35,6.15]],
    ['LowerCarrier',()=>pcb(37,2.3,.06,{chips:5,dark:true}),-2.35,-.99,[5.25,6.05]],
    ['BottomOuterPlate',()=>aperturePlate(2.42,.82,.07,M.silver),-2.95,-1.22,[7.2,8.2]]
  ];
  const stack={};
  for(const [name,make,y0,y1,win] of STACK){const o=make();o.name=name;stack[name]=add(o,{p:V(0,y0,0),r:E(0,0,0)},{p:V(0,y1,0),r:E()},win,.06);}
  // CPU board, socket, heat spreader and brass pins (centre of the module).
  const cpu=pcb(5,2.26,.06,{cpu:true,chips:8});cpu.name='CPUBoard';
  const socket=new THREE.Mesh(new THREE.BoxGeometry(1.35,.08,1.35),M.chip);socket.position.y=.07;cpu.add(socket);
  const spreader=new THREE.Mesh(new THREE.BoxGeometry(.95,.06,.95),M.spreader);spreader.position.y=.14;spreader.name='CPUHeatSpreader';cpu.add(spreader);
  const pins=[];for(let i=0;i<20;i++){const a=-.62+i*.065;pins.push([a,.07,.72,0],[a,.07,-.72,0],[.72,.07,a,Math.PI/2],[-.72,.07,a,Math.PI/2]);}inst(M.pinGeo,M.brass,pins,cpu);
  add(cpu,{p:V(0,0,0),r:E()},{p:V(0,0,0),r:E()},[0,1],.02);
  // Loose fragments beside the layers (small chips, rails, standoffs) that tuck inside the module as it closes.
  const fr=seeded(77);
  for(let i=0;i<16;i++){const side=i%2?1:-1,y=[2.3,1.85,1.4,.75,-.75,-1.3,-1.85,-2.3][i>>1];
    const w=.18+fr()*.42,h=.03+fr()*.05,d=.12+fr()*.22;const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),fr()<.5?M.silverDim:M.chip);m.name='Fragment'+i;
    add(m,{p:V(side*(1.45+fr()*.55),y+(fr()-.5)*.12,(fr()-.5)*1.1),r:E(0,fr()*.6-.3,0)},{p:V(side*(.3+fr()*.5),y*.33,(fr()-.5)*.8),r:E()},[5.3+fr()*.3,6.1+fr()*.3],.08);}
  // Vertical PCB band around the CPU. Left and right modules float beside the CPU from the first frame;
  // front and rear swing in from the sides so the core stays readable until assembly.
  const sides=[],sideEdges=[];
  const SIDE_FROM=[[-2.4,.05,1.35,-.95],[2.55,0,0,Math.PI/2],[2.45,-.05,-1.4,-.9],[-2.5,0,0,-Math.PI/2]];
  for(let k=0;k<4;k++){const a=k*Math.PI/2;const g=new THREE.Group();g.name=['VerticalPCBFront','VerticalPCBRight','VerticalPCBRear','VerticalPCBLeft'][k];
    const mat=boardMaterial(60+k,{size:512,chips:0});M.boards.push(mat);M.sideBoards.push(mat);
    const panel=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.12,.05),[M.boardEdge,M.boardEdge,M.boardEdge,M.boardEdge,mat,M.boardEdge]);g.add(panel);
    const chip=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.05),M.chip);chip.position.z=.05;g.add(chip);
    const backing=new THREE.Mesh(new THREE.BoxGeometry(2.08,1.04,.03),M.silverDim);backing.position.z=-.045;g.add(backing);
    const rand=seeded(90+k);for(let i=0;i<6;i++){const c=new THREE.Mesh(M.chipGeo,M.chip);c.rotation.x=Math.PI/2;c.position.set((rand()-.5)*1.7,(rand()-.5)*.8,.04);g.add(c);}
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.22,1.14,.07)),M.edgeGlow);g.add(edge);sideEdges.push(edge);
    const [fx,fy,fz,fr0]=SIDE_FROM[k],r1=1.235;
    sides.push(add(g,{p:V(fx,fy,fz),r:E(0,a+fr0,0)},{p:V(Math.sin(a)*r1,0,Math.cos(a)*r1),r:E(0,a,0)},[5.45+k*.1,6.35+k*.1],.05));}
  // Segmented armour: per side a dark face plate carrying circuit traces, top and bottom straps, and
  // curved corner shells. Every piece starts outside the frame and is only shown once it flies in (~5.1 s).
  const armor=[],faces=[];
  for(let k=0;k<4;k++){const a=k*Math.PI/2,front=k===0;
    const W=2.04,H=1.9;const plateShape=chamferRect(W,H,.06);
    if(front)plateShape.holes.push(holeCircle(.64));
    const mat=faceMaterial(140+k,{iris:front});faces.push(mat);
    const plate=new THREE.Group();const pm=new THREE.Mesh(fitUV(extrude(plateShape,.07),W,H),[mat,M.armorDark]);plate.add(pm);plate.name=['ArmorFrontSegments','ArmorRightSegments','ArmorRearSegments','ArmorLeftSegments'][k];
    const strapGeo=fitUV(extrude(chamferRect(2.12,.26,.04),.09),2.12,.26);
    const topS=new THREE.Mesh(strapGeo,[M.strap,M.armorDark]),botS=new THREE.Mesh(strapGeo,[M.strap,M.armorDark]);
    const seatD=1.33,spin=(k%2?1:-1);
    const place=(obj,y0,y1,dist0,rot0,win)=>armor.push(add(obj,{p:V(Math.sin(a+spin*.35)*dist0,y0,Math.cos(a+spin*.35)*dist0),r:E(rot0,a+spin*.9,spin*.3)},{p:V(Math.sin(a)*seatD,y1,Math.cos(a)*seatD),r:E(0,a,0)},win,.07,win[0]-.6));
    place(plate,.6*spin,0,5.2+k*.25,.35*spin,[6.0+k*.06,7.25+k*.03]);
    place(topS,3.1+k*.15,1.07,4.8,-.5,[6.05+k*.06,7.3]);
    place(botS,-3.1-k*.15,-1.07,4.8,.5,[6.0+k*.06,7.28]);
  }
  // Curved corner shells (bent sheet metal) give the closed module its rounded vertical edges.
  const shellGeo=new THREE.CylinderGeometry(.33,.33,2.3,20,1,true,0,Math.PI/2);
  [[1,1],[-1,1],[-1,-1],[1,-1]].forEach(([x,z],k)=>{const s=new THREE.Mesh(shellGeo,M.armorShell);s.name='ArmorCornerShell'+k;
    const ry=Math.atan2(x,z)-Math.PI/4;
    armor.push(add(s,{p:V(x*3.9,(k%2?1:-1)*1.5,z*3.9),r:E(.5*(k%2?1:-1),ry+.8,.4)},{p:V(x*1.0,0,z*1.0),r:E(0,ry,0)},[5.85+k*.08,7.15+k*.04],.06,5.2));});
  // Mechanical iris on the front face: nine overlapping curved petals around a small open centre.
  const iris=new THREE.Group();iris.name='FrontIrisHousing';iris.position.z=1.34;root.add(iris);
  const housing=new THREE.Mesh(new THREE.TorusGeometry(.655,.04,10,64),M.armor);iris.add(housing);
  const back=new THREE.Mesh(new THREE.CircleGeometry(.64,48),M.irisBack);back.position.z=-.05;iris.add(back);
  const centre=new THREE.Mesh(new THREE.CircleGeometry(.17,32),M.coreGlow);centre.position.z=-.045;iris.add(centre);
  const petals=[];
  for(let k=0;k<9;k++){
    const s=new THREE.Shape();const P=(r,ph)=>[Math.cos(ph)*r,Math.sin(ph)*r];
    s.moveTo(...P(.66,0));for(let i=1;i<=8;i++)s.lineTo(...P(.66,i/8*.95));s.quadraticCurveTo(...P(.42,1.25),...P(.17,1.62));s.quadraticCurveTo(...P(.4,.55),...P(.66,0));
    const geo=new THREE.ExtrudeGeometry(s,{depth:.014,bevelEnabled:false,curveSegments:12});
    const pivot=new THREE.Group();pivot.rotation.z=k*Math.PI*2/9;iris.add(pivot);
    const hinge=new THREE.Group();hinge.position.set(.66,0,-.03+k*.0016);pivot.add(hinge);
    const blade=new THREE.Mesh(geo,k%2?M.petal:M.petalAlt);blade.position.set(-.66,0,0);hinge.add(blade);
    petals.push(hinge);
  }
  return {root,parts,stack,sides,sideEdges,armor,faces,iris,petals,spreader,centre};
}
