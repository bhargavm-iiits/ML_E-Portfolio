import * as THREE from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './vendor/addons/utils/BufferGeometryUtils.js';

const cache=new Map();
function geometry(w,h,d,r=.025){const key=[w,h,d,r].join('/');if(!cache.has(key))cache.set(key,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.2,h*.2,d*.2)));return cache.get(key);}
function seeded(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

export function makeHardware(materials){
  const {metal,dark,glass,cyan,softCyan,lime,silver,board}=materials;
  const root=new THREE.Group(),decks=[],shells=[],faces=[],fans=[],packets=[];
  function block(parent,w,h,d,material,x=0,y=0,z=0,r=.018){const mesh=new THREE.Mesh(geometry(w,h,d,r),material);mesh.position.set(x,y,z);mesh.castShadow=material!==glass&&material!==cyan&&material!==softCyan;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function instance(parent,poses,material){const mesh=new THREE.InstancedMesh(geometry(1,1,1,.035),material,poses.length);const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();for(let i=0;i<poses.length;i++){const [x,y,z,w,h,d]=poses[i];position.set(x,y,z);scale.set(w,h,d);matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);}mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function label(parent,text,x,y,z,w=.56,h=.4,color='#ccf3f1'){
    const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${text.length>3?48:170}px Arial`;ctx.fillText(text,256,136);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function pcbTexture(seed){
    const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d'),rand=seeded(seed);
    ctx.fillStyle='#152127';ctx.fillRect(0,0,1024,512);
    for(let i=0;i<4000;i++){const q=Math.floor(28+rand()*25);ctx.fillStyle=`rgba(${q},${q+8},${q+12},.3)`;ctx.fillRect(rand()*1024,rand()*512,rand()*13+1,1);}
    for(let side=0;side<2;side++)for(let i=0;i<38;i++){
      const y=23+i*12.1,startX=side?648:376,endX=side?1000:24,bendX=side?735+(i%8)*22:291-(i%8)*22;
      ctx.beginPath();ctx.moveTo(startX,152+(i%18)*12);ctx.lineTo(side?680:344,152+(i%18)*12);ctx.lineTo(bendX,y);ctx.lineTo(endX,y);ctx.strokeStyle=i%5===0?'#9fc6ca':'#70868c';ctx.lineWidth=i%7===0?4:2;ctx.stroke();
      ctx.beginPath();ctx.arc(endX,y,3.8,0,Math.PI*2);ctx.strokeStyle='#a7b7b9';ctx.lineWidth=1.5;ctx.stroke();
    }
    for(let i=0;i<140;i++){const x=22+rand()*978,y=20+rand()*474;if(x>365&&x<659&&y>80&&y<433)continue;ctx.fillStyle='#080e12';ctx.fillRect(x,y,8+rand()*16,4+rand()*5);ctx.fillStyle='#bec0b6';ctx.fillRect(x-3,y+1,3,3);}
    ctx.font='13px Consolas';ctx.fillStyle='#8ca2a8';ctx.fillText('NEURAL COMPUTE / MODULAR ARCHITECTURE',31,491);ctx.fillText('DATA • RETRIEVE • VERIFY',32,18);
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    const bump=new THREE.CanvasTexture(c);bump.colorSpace=THREE.NoColorSpace;
    return new THREE.MeshStandardMaterial({map,bumpMap:bump,bumpScale:.006,color:0xc1d0d4,metalness:.66,roughness:.37,envMapIntensity:.9});
  }
  function mergedRoutes(parent,paths,material,r=.006){const geos=paths.map(points=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)),false,'centripetal',.05),points.length*4,r,5,false));if(!geos.length)return;const merged=mergeGeometries(geos);for(const g of geos)g.dispose();const mesh=new THREE.Mesh(merged,material);parent.add(mesh);return mesh;}

  // The base stays grounded, rather than floating inside decorative wire rings.
  block(root,3.12,.13,3.12,dark,0,-1.48,0,.045);
  const ys=[-1.37,-.7,-.46,.46,.7,1.37];
  for(let l=0;l<ys.length;l++){
    const group=new THREE.Group();group.position.y=ys[l];root.add(group);decks.push({group,baseY:ys[l]});
    block(group,3.02,.11,3.02,metal,0,0,0,.035);
    block(group,2.9,.025,2.9,board,0,.067,0,.015);
    block(group,2.84,.012,.022,cyan,0,-.036,1.516,.002);block(group,2.84,.012,.022,cyan,0,-.036,-1.516,.002);
    block(group,.022,.012,2.84,cyan,1.516,-.036,0,.002);block(group,.022,.012,2.84,cyan,-1.516,-.036,0,.002);
    const rand=seeded(200+l*71),chips=[],pins=[];
    for(let row=0;row<5;row++)for(let col=0;col<7;col++){
      const x=-1.25+col*.4,z=-1.17+row*.56;if(Math.abs(x)<.65&&Math.abs(z)<.65)continue;
      const w=.12+rand()*.16,d=.1+rand()*.22;chips.push([x,.13,z,w,.09,d]);
      for(let n=0;n<4;n++)pins.push([x-w/2-.015,.1,z-d/2+n*d/3,.035,.035,.017],[x+w/2+.015,.1,z-d/2+n*d/3,.035,.035,.017]);
    }
    instance(group,chips,dark);instance(group,pins,silver);
    const fins=[];for(let i=0;i<13;i++)fins.push([-.64+i*.10,.18,-.85,.027,.19,.5]);instance(group,fins,metal);
    const routes=[];
    for(let i=0;i<18;i++){const x=-1.34+i*.155;routes.push([[x,.085,-1.4],[x,.085,-.53],[x+.08,.085,-.4],[x+.08,.085,.28],[x-.12,.085,.46],[x-.12,.085,1.4]]);}mergedRoutes(group,routes,silver,.004);
    const bolts=[];for(const x of [-1.34,1.34])for(const z of [-1.34,1.34])bolts.push([x,.079,z,.07,.022,.07]);instance(group,bolts,silver);
    if(l===ys.length-1){for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)block(group,.965,.045,.965,glass,x,.255,z,.016);}
  }
  const die=new THREE.Group();root.add(die);
  block(die,.94,.65,.94,dark,0,0,0,.05);block(die,.74,.075,.74,metal,0,.36,0,.035);block(die,.55,.026,.55,lime,0,.412,0,.015);
  const diePins=[];for(let i=0;i<20;i++){const a=-.47+i*.049;diePins.push([a,.15,.55,.022,.06,.19],[a,.15,-.55,.022,.06,.19],[.55,.15,a,.19,.06,.022],[-.55,.15,a,.19,.06,.022]);}instance(die,diePins,silver);
  label(die,'AI',0,.08,.487,.47,.39);

  for(let s=0;s<4;s++){
    const angle=s*Math.PI/2,g=new THREE.Group();g.rotation.y=angle;g.position.set(Math.sin(angle)*1.51,0,Math.cos(angle)*1.51);root.add(g);faces.push({group:g,angle});
    block(g,2.96,1.17,.052,pcbTexture(810+s),0,0,0,.025);
    const rim=[];for(let i=0;i<25;i++){const x=-.6+i*.05;rim.push([x,.47,.07,.021,.065,.038],[x,-.47,.07,.021,.065,.038]);}instance(g,rim,silver);
    block(g,.87,.98,.075,silver,0,0,.067,.045);block(g,.76,.86,.078,dark,0,0,.116,.025);block(g,.63,.70,.052,metal,0,0,.172,.02);
    label(g,['AI','V','K','Q'][s],0,.015,.203,.50,.52);
    const components=[];for(let i=0;i<8;i++){const x=i%2===0?-1.16:1.16,y=-.41+Math.floor(i/2)*.27;components.push([x,y,.083,.18,.13,.11]);}instance(g,components,dark);
    const raised=[];for(let i=0;i<16;i++){const x=(i%2===0?-1:1),y=-.5+Math.floor(i/2)*.14;raised.push([[x*.52,y,.063],[x*.85,y,.063],[x*1.00,y+.1,.063],[x*1.4,y+.1,.063]]);}mergedRoutes(g,raised,silver,.005);

    // Separate thick glass cartridges above and below the exposed motherboard band.
    for(const direction of [-1,1]){
      const shell=new THREE.Group();shell.rotation.y=angle;shell.position.set(Math.sin(angle)*1.51,direction*1.04,Math.cos(angle)*1.51);root.add(shell);shells.push({group:shell,angle,y:direction*1.04});
      for(let j=0;j<3;j++){
        const x=-1+j;
        block(shell,.955,.59,.125,glass,x,0,.035,.024);
        block(shell,.88,.032,.032,silver,x,.288,.08,.005);block(shell,.88,.017,.028,softCyan,x,-.288,.08,.003);
        block(shell,.055,.48,.042,metal,x-.447,0,.022,.01);block(shell,.055,.48,.042,metal,x+.447,0,.022,.01);
        const traces=[];for(let k=0;k<5;k++){const q=x-.32+k*.16;traces.push([[q,-.24,.108],[q,-.06,.108],[q+.04,.02,.108],[q+.04,.25,.108]]);}mergedRoutes(shell,traces,softCyan,.003);
        if(j===1&&direction===1){
          const fan=new THREE.Group();fan.position.set(0,0,.147);shell.add(fan);
          const housing=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.065,32),dark);housing.rotation.x=Math.PI/2;fan.add(housing);
          const ring=new THREE.Mesh(new THREE.TorusGeometry(.185,.018,8,40),metal);ring.position.z=.04;fan.add(ring);
          const rotor=new THREE.Group();rotor.position.z=.05;fan.add(rotor);fans.push(rotor);
          for(let blade=0;blade<7;blade++){const b=block(rotor,.052,.145,.017,metal,0,.1,0,.01);const a=blade*Math.PI*2/7;b.position.set(Math.sin(a)*.09,Math.cos(a)*.09,0);b.rotation.z=-a+.35;}
          const hub=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),metal);hub.scale.z=.28;hub.position.z=.058;fan.add(hub);
        } else if(direction===-1&&j!==1){const connector=block(shell,.26,.22,.16,dark,x,-.03,.14,.045);block(shell,.17,.12,.02,metal,x,-.03,.23,.02);}
      }
    }
  }
  const spine=[];for(const x of [-1.43,1.43])for(const z of [-1.43,1.43])spine.push([x,0,z,.07,2.68,.07]);instance(root,spine,metal);
  const tracers=[];
  for(let i=0;i<7;i++){const x=-1.04+i*.34;tracers.push([[x,-1.548,1.5],[x,-1.548,2.0],[x+.3,-1.548,2.35],[x+.3,-1.548,2.7]]);}mergedRoutes(root,tracers,softCyan,.008);
  for(let i=0;i<20;i++){const angle=i*2.399,mesh=new THREE.Mesh(geometry(.055,.055,.055,.008),i%6===0?lime:cyan);mesh.position.set(Math.cos(angle)*(1.9+i%3*.35),Math.sin(i*1.2)*1.25,Math.sin(angle)*(1.9+i%3*.35));root.add(mesh);packets.push({mesh,base:mesh.position.clone(),phase:i});}
  return {root,decks,shells,faces,fans,packets,block,label,mergedRoutes};
}
