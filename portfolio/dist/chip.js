import * as THREE from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/addons/geometries/RoundedBoxGeometry.js';

// A realistic AI accelerator chip: green FR4 substrate with gold pads and silkscreen, an iridescent
// silicon die with faintly glowing logic, and SMD capacitors. Textures are drawn on canvases.
function canvas(size,draw){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);return c;}
function rng(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};}

function substrateMaps(){
  const S=1024,r=rng(7),pad=[];
  const color=canvas(S,(g,s)=>{
    g.fillStyle='#0d2a1c';g.fillRect(0,0,s,s);
    for(let i=0;i<9000;i++){g.fillStyle=`rgba(${20+r()*30|0},${70+r()*50|0},${45+r()*30|0},.10)`;g.fillRect(r()*s,r()*s,2,2);}
    // copper traces under solder mask
    g.strokeStyle='rgba(60,120,80,.55)';g.lineWidth=3;
    for(let i=0;i<70;i++){const side=i%4,t=.18+r()*.64;let x=side<2?t*s:(side===2?40:s-40),y=side<2?(side===0?40:s-40):t*s;g.beginPath();g.moveTo(x,y);
      const tx=s/2+(r()-.5)*s*.36,ty=s/2+(r()-.5)*s*.36;g.lineTo(side<2?x:(x+tx)/2,side<2?(y+ty)/2:y);g.lineTo(tx,ty);g.stroke();}
    // gold pads around the edge
    for(let k=0;k<26;k++){const p=86+k*(s-172)/25;pad.push([p,22],[p,s-22],[22,p],[s-22,p]);}
    for(const [x,y] of pad){g.fillStyle='#c9a24a';g.fillRect(x-9,y-9,18,18);}
    // silkscreen
    g.fillStyle='rgba(235,240,230,.85)';g.font='600 30px "Geist Mono", monospace';g.fillText('BM-NPU01',92,128);g.font='500 22px "Geist Mono", monospace';g.fillText('AI CORE · 7NM',92,160);
    g.textAlign='right';g.fillText('IIITS 2627',s-92,s-104);g.fillText('X1 · REV B',s-92,s-74);
    g.strokeStyle='rgba(235,240,230,.75)';g.lineWidth=3;g.beginPath();g.arc(118,s-118,14,0,Math.PI*2);g.stroke();
  });
  const metal=canvas(S,(g,s)=>{g.fillStyle='#000';g.fillRect(0,0,s,s);g.fillStyle='#fff';for(const [x,y] of pad)g.fillRect(x-9,y-9,18,18);});
  const rough=canvas(S,(g,s)=>{g.fillStyle='#8a8a8a';g.fillRect(0,0,s,s);g.fillStyle='#3a3a3a';for(const [x,y] of pad)g.fillRect(x-9,y-9,18,18);});
  return {color,metal,rough};
}

function dieMaps(){
  const S=1024,r=rng(21);
  const blocks=[];
  const color=canvas(S,(g,s)=>{
    g.fillStyle='#16191d';g.fillRect(0,0,s,s);
    // functional blocks: tensor cores, cache, I/O ring
    const cols=8,rows=8,m=70,cw=(s-2*m)/cols,ch=(s-2*m)/rows;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const cx=m+x*cw,cy=m+y*ch,inner=x>1&&x<6&&y>1&&y<6;
      g.fillStyle=inner?`rgb(${34+r()*10|0},${40+r()*12|0},${46+r()*12|0})`:`rgb(${26+r()*8|0},${30+r()*8|0},${36+r()*8|0})`;g.fillRect(cx+4,cy+4,cw-8,ch-8);
      g.strokeStyle='rgba(120,140,150,.18)';g.lineWidth=1;for(let k=8;k<cw-8;k+=7){g.beginPath();g.moveTo(cx+k,cy+6);g.lineTo(cx+k,cy+ch-6);g.stroke();}
      if(inner)blocks.push([cx,cy,cw,ch]);
    }
    g.strokeStyle='rgba(170,180,190,.35)';g.lineWidth=6;g.strokeRect(36,36,s-72,s-72);
    for(let k=0;k<48;k++){const p=60+k*(s-120)/47;g.fillStyle='rgba(190,200,205,.5)';g.fillRect(p-4,14,8,14);g.fillRect(p-4,s-28,8,14);g.fillRect(14,p-4,14,8);g.fillRect(s-28,p-4,14,8);}
    g.fillStyle='rgba(200,210,215,.55)';g.font='600 34px "Geist Mono", monospace';g.textAlign='center';g.fillText('AI',s/2,s/2+12);
  });
  // Emissive: thin logic traces between the inner blocks.
  const glow=canvas(S,(g,s)=>{
    g.fillStyle='#000';g.fillRect(0,0,s,s);g.lineWidth=2.5;
    for(let i=0;i<90;i++){const [x,y,w,h]=blocks[(r()*blocks.length)|0];const x0=x+r()*w,y0=y+r()*h;g.strokeStyle=r()<.7?'rgba(194,237,113,.9)':'rgba(128,216,203,.9)';
      g.beginPath();g.moveTo(x0,y0);const hz=r()<.5;g.lineTo(hz?x0+(r()-.5)*240:x0,hz?y0:y0+(r()-.5)*240);g.stroke();}
    g.strokeStyle='rgba(194,237,113,.95)';g.lineWidth=3;g.strokeRect(s*.3,s*.3,s*.4,s*.4);
    g.fillStyle='rgba(194,237,113,1)';g.font='600 34px "Geist Mono", monospace';g.textAlign='center';g.fillText('AI',s/2,s/2+12);
  });
  return {color,glow};
}

export function makeChip(renderer){
  const tex=(c,srgb)=>{const t=new THREE.CanvasTexture(c);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;};
  const sub=substrateMaps(),die=dieMaps();
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const substrate=new THREE.Mesh(new RoundedBoxGeometry(.8,.8,.045,3,.012),new THREE.MeshPhysicalMaterial({map:tex(sub.color,true),metalnessMap:tex(sub.metal),roughnessMap:tex(sub.rough),metalness:1,roughness:1,clearcoat:.6,clearcoatRoughness:.35,envMapIntensity:1.1}));
  body.add(substrate);
  // underfill and silicon die
  const underfill=new THREE.Mesh(new RoundedBoxGeometry(.47,.47,.014,2,.004),new THREE.MeshStandardMaterial({color:0x0a0c0d,roughness:.35,metalness:.2}));underfill.position.z=.028;body.add(underfill);
  const dieMat=new THREE.MeshPhysicalMaterial({map:tex(die.color,true),emissiveMap:tex(die.glow,true),emissive:new THREE.Color(1,1,1),emissiveIntensity:.9,metalness:.55,roughness:.16,clearcoat:1,clearcoatRoughness:.04,iridescence:.85,iridescenceIOR:1.35,iridescenceThicknessRange:[220,620],envMapIntensity:1.5});
  const dieMesh=new THREE.Mesh(new RoundedBoxGeometry(.42,.42,.022,2,.003),dieMat);dieMesh.position.z=.044;body.add(dieMesh);
  // SMD capacitors: ceramic body with tin ends
  const capBody=new THREE.InstancedMesh(new RoundedBoxGeometry(.034,.018,.016,1,.003),new THREE.MeshStandardMaterial({color:0x8b7653,roughness:.55,metalness:.05}),16);
  const capEnd=new THREE.InstancedMesh(new RoundedBoxGeometry(.009,.019,.017,1,.002),new THREE.MeshStandardMaterial({color:0xc9cdd0,roughness:.25,metalness:1}),32);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1),v=new THREE.Vector3(),zAxis=new THREE.Vector3(0,0,1);let n=0;
  for(const side of [0,1,2,3])for(let k=0;k<4;k++){
    const t=-.15+k*.1,ang=side*Math.PI/2;const x=side%2===0?t:(side===1?.3:-.3),y=side%2===0?(side===0?.3:-.3):t;
    q.setFromAxisAngle(zAxis,side%2?Math.PI/2:0);v.set(x,y,.031);m.compose(v,q,one);capBody.setMatrixAt(n,m);
    for(const e of [-1,1]){const d=new THREE.Vector3(e*.0205,0,0).applyQuaternion(q);v.set(x+d.x,y+d.y,.031);m.compose(v,q,one);capEnd.setMatrixAt(n*2+(e>0?1:0),m);}
    n++;
  }
  body.add(capBody,capEnd);
  // a soft lime light spill under the chip, like an active board
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),new THREE.MeshBasicMaterial({map:tex(canvas(256,(g,s)=>{const gr=g.createRadialGradient(s/2,s/2,s*.18,s/2,s/2,s/2);gr.addColorStop(0,'rgba(194,237,113,.2)');gr.addColorStop(1,'rgba(194,237,113,0)');g.fillStyle=gr;g.fillRect(0,0,s,s);}),true),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  halo.position.z=-.04;root.add(halo);
  const key=new THREE.SpotLight(0xffffff,0,3,.6,.6,1.5);key.position.set(-.6,.8,1.4);key.target=body;root.add(key);
  function update(time){
    body.rotation.y=Math.sin(time*.45)*.42;body.rotation.x=-.18+Math.sin(time*.31)*.08;
    dieMat.emissiveIntensity=.75+Math.sin(time*2.2)*.25;
  }
  return {root,update,light:key};
}
