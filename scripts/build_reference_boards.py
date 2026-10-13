"""Create timestamped motion boards, native-resolution crops and per-pixel deltas."""
from pathlib import Path
import json,csv
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reference-analysis'
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',17)
sequences=[
 ('M01','New_2',[1,7,13,17],'Assembled core / idle',(490,140,1000,590)),
 ('M02','New_3',[1,5,9,13],'Circuit propagation',(425,350,1120,690)),
 ('M03','New_2',[17,19,22,25],'Shell separation',(420,100,1120,670)),
 ('M04','New_3',[18,22,27,31],'Vertical exploded layers',(410,70,1150,690)),
 ('M05','New_2',[25,29,33,37],'Camera push-in / Q K V',(570,150,1080,660)),
 ('M06','New_3',[34,38,42,46],'Enter the data corridor',(480,70,1080,690)),
 ('M07','New_2',[41,45,49,53],'Floating evidence / parallax',(210,90,1160,650)),
 ('M08','New_3',[49,53,57,61],'Attention gate / forward travel',(300,115,1000,660)),
 ('M09','New_2',[53,57,61,65],'Verify gate / amber branch',(350,170,1230,690)),
 ('M10','New_3',[63,67,70,73],'Dissolve and core reassembly',(400,130,1150,690)),
 ('M11','New_2',[70,73,76,80],'Contact ending / REST panel',(690,280,1200,590)),
 ('M12','New_1',[1,5,9,13],'Ingestion / waveform signal',(285,255,925,670)),
 ('M13','New_1',[14,18,21,24],'First vertical scroll transition',(120,100,1170,710)),
 ('M14','New_1',[24,27,30,33],'Token selection / retrieval branches',(415,95,1140,450)),
 ('M15','New_1',[32,35,38,41],'Neural planes / depth parallax',(530,310,1170,690)),
 ('M16','New_1',[35,38,41,44],'Active plane scan / node illumination',(650,330,985,620)),
 ('M17','New_1',[44,49,54,59],'Second scroll / static gates',(120,95,1170,695)),
 ('M18','New_1',[55,60,65,69],'Sandbox checks / REST response',(125,250,1140,640)),
 ('M19','New_1',[64,68,72,76],'Final scroll / contact reveal',(330,440,1010,710)),
 ('M20','New_3',[1,25,49,73],'Persistent nav / chapter indicators',(55,0,1240,70)),
]
boarddir=OUT/'motion-boards';boarddir.mkdir(exist_ok=True)
cropdir=OUT/'detail-crops';cropdir.mkdir(exist_ok=True)
records=[]
for ident,clip,indices,title,crop in sequences:
    board=Image.new('RGB',(1280,788),(12,17,16));draw=ImageDraw.Draw(board)
    draw.text((16,10),f'{ident} | {title} | {clip}',font=font,fill='#c2ed71')
    frame_refs=[]
    for pos,idx in enumerate(indices):
        path=OUT/clip/'frames'/f'frame_{idx:04}.jpg'
        im=Image.open(path)
        x=(pos%2)*640;y=44+(pos//2)*372
        board.paste(im.resize((632,355)),(x+4,y))
        draw.text((x+10,y+357),f'{clip} / {(idx-1)/8:.3f}s / frame {idx:04}',font=font,fill='#b9c6bc')
        frame_refs.append({'frame':idx,'time_s':(idx-1)/8,'path':path.relative_to(ROOT).as_posix()})
    boardpath=boarddir/f'{ident}-{clip}.jpg';board.save(boardpath,quality=93)
    crops=[]
    for idx in [indices[0],indices[-1]]:
        path=cropdir/f'{ident}-{clip}-f{idx:04}.png'
        Image.open(OUT/clip/'frames'/f'frame_{idx:04}.jpg').crop(crop).save(path)
        crops.append(path.relative_to(ROOT).as_posix())
    records.append({'id':ident,'clip':clip,'title':title,'board':boardpath.relative_to(ROOT).as_posix(),'frames':frame_refs,'crops':crops,'crop_xyxy':crop})
(OUT/'motion_reference_index.json').write_text(json.dumps(records,indent=2),encoding='utf-8')

rows=[]
phases={
 'New_1':[(0,2,'Ingestion and moving connector pulses'),(2,2.9,'Vertical scroll into token retrieval'),(2.9,4,'Token selection and context branches'),(4,5.5,'Neural plane activation and depth scene'),(5.5,8,'Verification and REST diagram'),(8,10.1,'Vertical scroll into contact')],
 'New_2':[(0,2,'Assembled cyan core'),(2,3.9,'Shell and layer explosion'),(3.9,5.5,'Camera push through QKV interior'),(5.5,6.8,'Source and verification corridor'),(6.8,8.3,'Gate approach with amber rejection branch'),(8.3,10.1,'Crossfade into assembled contact core')],
 'New_3':[(0,2,'Assembled core with outward circuit traces'),(2,3.9,'Shell and layer explosion with circuit detail'),(3.9,5.5,'Camera push through circuit interior'),(5.5,6.8,'Attention portal corridor'),(6.8,8.3,'Verify portal and amber warning branch'),(8.3,10.1,'Crossfade into assembled contact core')]
}
for clip in ['New_1','New_2','New_3']:
    previous=None
    for idx,path in enumerate(sorted((OUT/clip/'frames').glob('*.jpg')),1):
        a=np.asarray(Image.open(path).convert('RGB'),dtype=np.int16)
        t=(idx-1)/8;phase=next(v for lo,hi,v in phases[clip] if lo<=t<hi)
        r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
        delta=np.abs(a-previous) if previous is not None else np.zeros_like(a)
        rows.append({'clip':clip,'frame':idx,'time_s':t,'phase_visual_estimate':phase,'width':a.shape[1],'height':a.shape[0],'mean_pixel_abs_delta_0_255':round(float(delta.mean()),5),'percent_pixels_delta_over_12':round(float((delta.max(axis=2)>12).mean()*100),4),'dark_pixels_pct':round(float((a.max(axis=2)<65).mean()*100),4),'lime_mask_pct':round(float(((g>110)&(r>75)&(g>r*.85)&(b<g*.65)).mean()*100),4),'cyan_mask_pct':round(float(((g>90)&(b>80)&(r<g*.9)&(b>r*1.05)).mean()*100),4),'sample_file':path.relative_to(ROOT).as_posix()})
        previous=a
with (OUT/'frame_by_frame_analysis.csv').open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
print(json.dumps({'boards':len(records),'detail_crops':len(records)*2,'full_resolution_pixel_comparisons':len(rows),'pixels_per_frame':1280*720,'rgb_channel_values_compared':len(rows)*1280*720*3},indent=2))
