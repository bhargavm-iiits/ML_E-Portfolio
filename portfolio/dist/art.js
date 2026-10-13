// Original vector diagrams. All are illustrative, not screenshots of project UIs.
const C={lime:'#c2ed71',cyan:'#80d8cb',muted:'#81998b',amber:'#dfb56d',line:'#344d3f',panel:'#17241c'};
const text=(x,y,t,size=11,color=C.muted)=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}">${t}</text>`;
const line=(d,color=C.cyan,dashed=false)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="1.4" ${dashed?'stroke-dasharray="3 5"':''}/>`;
const flow=(d,color=C.lime)=>line(d,C.line)+`<path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 84" class="flow-dot"/>`;
const panel=(x,y,w,h,title,color=C.line)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${C.panel}" stroke="${color}"/>${text(x+12,y+23,title,10,C.cyan)}`;
const chip=(x,y,t,color=C.lime)=>`<rect x="${x}" y="${y}" width="58" height="62" rx="3" fill="#172a1d" stroke="${color}"/>${Array.from({length:6},(_,i)=>line(`M${x-9} ${y+8+i*9}h9 M${x+58} ${y+8+i*9}h9`,color)).join('')}${text(x+13,y+36,t,18,color)}`;
const document=(x,y)=>`<path d="M${x} ${y}h47l13 13v67h-60Z" fill="#283c30" stroke="#6a8b76"/>${Array.from({length:6},(_,i)=>line(`M${x+10} ${y+20+i*8}h${i===5?19:36}`,C.muted)).join('')}`;

export function artwork(kind,step=0){
  let s='';
  if(kind==='fix'){
    s=panel(35,105,107,105,'CANDIDATE')+text(48,154,'- return x',11,C.amber)+text(48,176,'+ return y',11,C.lime)+flow('M142 158H218');
    for(let i=0;i<4;i++)s+=`<rect x="${214+i*12}" y="${75+i*12}" width="${115-i*12}" height="${168-i*24}" rx="12" fill="#17231b30" stroke="${i===0?C.lime:C.line}"/>`;
    s+=chip(245,128,'✓')+text(220,58,'NINE STATIC CHECKS',9,C.lime)+flow('M329 158H383')+panel(384,105,135,105,'DOCKER SANDBOX')+text(397,156,'baseline → tests',10,C.cyan)+text(397,180,'no network',10,C.muted)+line('M385 238H518',C.line)+text(385,259,'ACCEPT ONLY IF TESTS PASS',8,C.lime);
  }else if(kind==='claim'){
    s=document(38,111)+document(53,123)+text(37,218,'PDF EVIDENCE',9)+flow('M113 161H186')+panel(186,102,135,119,'RECONCILIATION')+text(199,147,'page provenance',10,C.cyan)+text(199,170,'record matching',10)+text(199,192,'conflict checks',10)+flow('M321 161H382')+panel(382,79,144,81,'CITED DRAFT',C.lime)+text(395,124,'[source: page 3]',10,C.lime)+line('M343 161V228H382',C.amber)+panel(382,199,144,71,'HUMAN REVIEW',C.amber)+text(395,241,'approve / correct',10,C.amber)+text(184,265,'EVIDENCE STAYS ATTACHED',9);
  }else if(kind==='excel'){
    s=panel(37,84,160,164,'SPREADSHEET');
    for(let row=0;row<5;row++)for(let col=0;col<4;col++)s+=`<rect x="${49+col*34}" y="${120+row*22}" width="30" height="18" rx="1" fill="${row===2&&col>0?'#a9d663':'#23382b'}"/>${text(53+col*34,132+row*22,row===2&&col===2?'ƒ':'·',9,row===2&&col>0?'#15200d':C.muted)}`;
    s+=flow('M197 165H250');
    for(const [x,y,t] of [[260,100,'A'],[300,155,'B'],[260,210,'C']])s+=`<circle cx="${x}" cy="${y}" r="17" fill="#203527" stroke="${C.cyan}"/>${text(x-4,y+4,t,12,C.cyan)}`;
    s+=line('M273 114L289 142M273 196L289 168')+flow('M319 155H382')+panel(383,105,144,109,'VERSIONED API')+text(396,154,'POST /calculate',11,C.lime)+text(396,178,'immutable version',9)+text(37,284,'66 FUNCTIONS',10,C.lime)+text(383,257,'481 / 481',22,C.lime)+text(383,275,'COMPARISONS · 37 FIXTURE CASES',7);
  }else if(kind==='eye'){
    s=`<circle cx="174" cy="166" r="78" fill="#16362c" stroke="#45765b"/><circle cx="174" cy="166" r="61" fill="none" stroke="#80d8cb50"/><circle cx="174" cy="166" r="21" fill="#326651" stroke="${C.cyan}"/>`;
    for(let i=0;i<20;i++){const a=i*.78;const x=174+Math.cos(a)*70,y=166+Math.sin(a)*70;s+=line(`M174 166Q${174+Math.cos(a+.3)*35} ${166+Math.sin(a+.3)*35} ${x} ${y}`,'#80d8cb45');}
    s+=`<rect x="102" y="92" width="144" height="144" fill="none" stroke="${C.lime}" stroke-dasharray="5 4"/>`+flow('M259 166H326')+panel(327,96,179,143,'VISION TRANSFORMER')+text(341,143,'preprocess → train',10,C.cyan)+text(341,168,'ROC-AUC · F1',11,C.lime)+text(341,196,'precision · recall',10)+text(95,278,'ILLUSTRATIVE IMAGE PIPELINE',9);
  }else if(kind==='voice'){
    s=panel(35,105,148,113,'SPEECH INPUT');
    for(let i=0;i<32;i++){const h=8+Math.abs(Math.sin(i*2.7))*38;s+=line(`M${48+i*3.8} ${169-h/2}v${h}`,C.cyan);}
    s+=flow('M183 164H236')+chip(241,133,'RAG',C.cyan)+flow('M307 164H383')+panel(383,105,143,113,'GROUNDED ANSWER')+text(396,152,'Whisper',10,C.cyan)+text(396,175,'ChromaDB → Gemini',9,C.lime)+text(396,196,'context + response',9)+text(239,251,'RETRIEVE COMPANY CONTEXT',9);
  }else if(kind==='route'){
    for(let i=0;i<9;i++)s+=line(`M35 ${105+i*13}Q135 ${10+i*17} 230 ${115+i*14}T526 ${104+i*15}`,'#33563c');
    s+=`<path d="M78 225Q135 215 180 164T284 140" fill="none" stroke="${C.cyan}" stroke-width="3"/>`+line('M284 140Q340 65 393 119',C.amber,true)+flow('M393 119Q450 145 482 79');
    for(const [x,y] of [[78,225],[180,164],[284,140],[393,119],[482,79]])s+=`<circle cx="${x}" cy="${y}" r="5" fill="${C.lime}"/><circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${C.cyan}"/>`;
    s+=panel(320,212,205,55,'1.17 KM GAP · INTERPOLATED',C.amber)+text(35,61,'OFFLINE AR / A* WAYPOINT ROUTING',10,C.cyan)+text(35,289,'GPS + VISUAL-INERTIAL LOCALIZATION',9);
  }else if(kind==='sticker'){
    for(let i=0;i<3;i++)s+=`<rect x="${45+i*12}" y="${94+i*12}" width="115" height="133" rx="8" fill="#223f2a" stroke="#628870"/>`;
    s+=`<circle cx="124" cy="162" r="31" fill="#b2d87d"/><path d="M108 169Q124 187 140 169" fill="none" stroke="#24391c" stroke-width="3"/><circle cx="113" cy="154" r="3" fill="#24391c"/><circle cx="135" cy="154" r="3" fill="#24391c"/>`+flow('M195 166H250')+panel(253,95,116,130,'DURABLE JOB')+text(265,143,'lease · recover',9,C.cyan)+text(265,167,'SSE progress',10)+text(265,192,'cancel / retry',9)+flow('M369 166H406')+panel(408,113,113,96,'SAVED VERSIONS')+text(420,157,'compare',11,C.lime)+text(420,182,'restore →',11,C.cyan)+text(45,284,'VERSIONED PORTRAIT-TO-STICKER WORKFLOW',9);
  }else if(kind==='plant'){
    s=`<path d="M116 225Q65 102 202 74Q258 204 116 225Z" fill="#254b2a" stroke="#9bbd66"/><path d="M110 241Q140 154 200 86" fill="none" stroke="${C.lime}" stroke-width="2"/>`;
    for(let i=0;i<5;i++)s+=line(`M${130+i*12} ${202-i*22}l${-35+i*2} -26M${130+i*12} ${202-i*22}l36 -4`,'#719451');
    s+=flow('M251 162H322')+panel(326,102,195,128,'LEAF CLASSIFICATION')+text(340,148,'segment → enhance',10,C.cyan)+text(340,173,'TensorFlow / Keras',10,C.lime)+text(340,199,'ranked predictions',10)+text(85,282,'TEXTURE · PREPROCESSING · CLASSIFICATION',9);
  }else if(kind==='pipeline'){
    const colors=[C.cyan,C.lime,C.amber];
    s=document(34,123)+text(31,240,'SOURCE',9)+flow('M97 166H164',colors[step])+panel(165,111,110,110,'CONTEXT',step===1?C.lime:C.line)+text(177,151,'retrieve',11,C.cyan)+text(177,174,'reconcile',11)+text(177,198,'structure',10)+flow('M275 166H339',colors[step]);
    for(let i=0;i<3;i++)s+=`<rect x="${338+i*12}" y="${84+i*14}" width="${125-i*24}" height="${160-i*28}" rx="6" fill="#17271c50" stroke="${step===2?C.lime:C.cyan}"/>`;
    s+=chip(368,135,step===2?'✓':'AI',step===2?C.lime:C.cyan)+text(343,269,'CHECKS + REVIEW',10,C.lime)+line('M400 244V284H490V215',C.amber,true)+text(469,199,'AUDIT',8,C.amber);
    s+=`<circle cx="${[70,220,397][step]}" cy="${[107,95,68][step]}" r="4" fill="${colors[step]}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 330" aria-hidden="true" style="font-family:Consolas,monospace"><defs><pattern id="grid-${kind}" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#8bbb9c" stroke-opacity=".07" stroke-width=".7"/></pattern></defs><rect width="560" height="330" fill="url(#grid-${kind})"/>${s}</svg>`;
}
