import assert from 'node:assert/strict';
import test from 'node:test';
import { mountLandingLoader } from '../dist/landing-loader.js';

function harness({reduced=false,quick=false}={}){
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
  const scene={setLoadingPose:()=>events.push(['pose']),finishLoading:()=>events.push(['finish']),projectCore:()=>({x:.65,y:.5}),dispose:()=>{throw Error('Loader must never dispose the landing scene');}};
  const api=mountLandingLoader(container,scene,readiness,{reduced,quick,onReveal:()=>events.push(['reveal']),onExit:()=>events.push(['exit'])});
  const pct=()=>Number(nodes.get('.ld-pct').textContent||0);
  return {container,nodes,timers,events,api,pct,async ready(){resolve();await Promise.resolve();},tick(ms){now+=ms;const f=rafCallback;f?.(now);},run(ms,step=16){const seen=[];for(let t=0;t<ms;t+=step){this.tick(step);if(!rafCallback)break;seen.push(pct());}return seen;},reduce(){changeHandler({matches:true});}};
}

const n=(h,k)=>h.events.filter(e=>e[0]===k).length;
const steady=seen=>{for(let i=1;i<seen.length;i++){assert.ok(seen[i]>=seen[i-1],'never goes backwards');assert.ok(seen[i]-seen[i-1]<=7,`no jump: ${seen[i-1]} -> ${seen[i]}`);}};
const on=(h,s)=>h.nodes.get(s).classList.values.has('on');

test('counts 0 to 100 in about 1.6 s and hands off quickly',async()=>{
  const h=harness();await h.ready();h.tick(16);
  const seen=h.run(1500);steady(seen);assert.ok(h.pct()>80&&h.pct()<100,`mid-count: ${h.pct()}`);
  assert.ok(seen.filter(v=>v>0&&v<100).length>60,'visible intermediate values');
  h.run(1200);assert.equal(n(h,'reveal'),1);assert.equal(n(h,'finish'),1);assert.equal(n(h,'exit'),1);
  assert.equal(h.timers.size,0);assert.ok(h.container.removed);
});
test('cube layers assemble bottom-up as the counter climbs',async()=>{
  const h=harness();h.tick(16);h.run(200);
  assert.ok(on(h,'.s3')&&!on(h,'.s2')&&!on(h,'.s1'));
  h.run(500);assert.ok(on(h,'.s2')&&!on(h,'.s1'));h.run(500);assert.ok(on(h,'.s1'));
});
test('holds at 99 until the scene is ready, then finishes',async()=>{
  const h=harness();h.tick(16);h.run(16000);
  assert.equal(h.pct(),99);assert.equal(h.container.dataset.state,'waiting');assert.equal(n(h,'exit'),0);
  await h.ready();h.run(1000);assert.equal(n(h,'exit'),1);
});
test('a long frame stall never jumps the counter',async()=>{
  const h=harness();await h.ready();h.tick(16);h.tick(9000);
  assert.ok(h.pct()<=7,`stall advanced only one capped step: ${h.pct()}`);
  steady(h.run(3000));assert.equal(n(h,'exit'),1);
});
test('revisits count up faster but still visibly',async()=>{
  const h=harness({quick:true});await h.ready();h.tick(16);
  const seen=h.run(1500);assert.ok(seen.filter(v=>v>0&&v<100).length>20);assert.equal(n(h,'exit'),1);
});
test('skip while unready preserves the readiness gate',async()=>{
  const h=harness();h.api.skip();h.run(4000);
  assert.ok(h.pct()<100);assert.equal(n(h,'exit'),0);
  await h.ready();h.run(600);assert.equal(n(h,'exit'),1);
});
test('reduced motion completes and never touches the landing scene lifecycle beyond finish',async()=>{
  const h=harness({reduced:true});h.tick(16);await h.ready();h.run(2000);assert.equal(n(h,'exit'),1);assert.equal(n(h,'finish'),1);
});
