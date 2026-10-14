import assert from 'node:assert/strict';
import test from 'node:test';
import { mountLandingLoader } from '../dist/landing-loader.js';

function harness({reduced=false}={}){
  let now=0,next=0,rafCallback,changeHandler;
  const timers=new Map(),listeners=new Map(),nodes=new Map(),events=[];
  const node=()=>({dataset:{},textContent:'',hidden:false,removed:false,style:{},children:[],attributes:{},
    classList:{values:new Set(),add(...v){v.forEach(x=>this.values.add(x));},remove(...v){v.forEach(x=>this.values.delete(x));},toggle(v,on){on?this.values.add(v):this.values.delete(v);}},
    setAttribute(k,v){this.attributes[k]=v;},append(v){this.children.push(v);},remove(){this.removed=true;},addEventListener(){},removeEventListener(){}});
  const container=node();container.querySelector=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);};
  globalThis.document={hidden:false,documentElement:node(),createElementNS:()=>node()};
  globalThis.innerWidth=1280;globalThis.innerHeight=720;
  globalThis.matchMedia=()=>({matches:reduced,addEventListener(k,f){changeHandler=f;},removeEventListener(){}});
  globalThis.addEventListener=(k,f)=>listeners.set(k,f);globalThis.removeEventListener=k=>listeners.delete(k);
  globalThis.requestAnimationFrame=f=>{rafCallback=f;return ++next;};globalThis.cancelAnimationFrame=()=>{rafCallback=null;};
  globalThis.setTimeout=(f,ms)=>{timers.set(++next,{f,ms});return next;};globalThis.clearTimeout=id=>timers.delete(id);
  Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
  let resolve;const readiness=new Promise(r=>{resolve=r;});
  const scene={setLoadingPose:t=>events.push(['pose',t]),finishLoading:()=>events.push(['finish']),projectCore:()=>({x:.65,y:.5}),dispose:()=>{throw Error('Loader must never dispose the landing scene');}};
  const api=mountLandingLoader(container,scene,readiness,{reduced,onReveal:()=>events.push(['reveal']),onExit:()=>events.push(['exit'])});
  return {container,nodes,timers,events,api,async ready(){resolve();await Promise.resolve();},tick(ms){now+=ms;const f=rafCallback;f?.(now);},reduce(){changeHandler({matches:true});}};
}

test('waits for real readiness, reuses the scene, then reveals once without disposing it',async()=>{
  const h=harness();h.tick(16);h.tick(16000);
  assert.equal(h.container.dataset.state,'waiting');assert.equal(h.api.time,7.35);
  assert.ok(Number(h.nodes.get('.ld-pct').textContent)<100);assert.equal(h.events.filter(e=>e[0]==='exit').length,0);
  assert.ok(h.nodes.get('.ld-canvas').removed);
  await h.ready();h.tick(3000);h.tick(500);
  assert.equal(h.events.filter(e=>e[0]==='reveal').length,1);assert.equal(h.events.filter(e=>e[0]==='finish').length,1);assert.equal(h.events.filter(e=>e[0]==='exit').length,1);
  assert.equal(h.events.filter(e=>e[0]==='pose').at(-1)[1],10);assert.equal(h.timers.size,0);assert.ok(h.container.removed);
});
test('skip while unready preserves the readiness gate',async()=>{
  const h=harness();h.api.skip();h.tick(16);h.tick(4000);
  assert.equal(h.api.time,7.35);assert.equal(h.events.filter(e=>e[0]==='exit').length,0);
  await h.ready();h.tick(16);h.tick(500);assert.equal(h.events.filter(e=>e[0]==='exit').length,1);
});
test('reduced motion goes to the same landing pose and completes without motion-event dependence',async()=>{
  const h=harness({reduced:true});h.tick(16);assert.equal(h.api.time,10);
  assert.equal(h.events.filter(e=>e[0]==='exit').length,0);
  await h.ready();h.tick(16);h.tick(200);assert.equal(h.events.filter(e=>e[0]==='exit').length,1);
});
test('changing the reduced-motion preference settles the shared object safely',async()=>{
  const h=harness();h.tick(16);h.tick(1500);h.reduce();assert.equal(h.api.time,10);
  await h.ready();h.tick(16);h.tick(200);assert.equal(h.events.filter(e=>e[0]==='exit').length,1);
});
