"""Extract supplied resume content and reproducible 8 fps video reference assets."""
from pathlib import Path
import subprocess, json, re, hashlib
from PIL import Image, ImageDraw, ImageFont, ImageStat, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reference-analysis'
OUT.mkdir(exist_ok=True)

def videos():
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    inventory = []
    font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 15)
    for name in ['New_1', 'New_2', 'New_3']:
        sources = list((ROOT / 'Ref_Video' / 'Folder_4' / name).glob('*.mp4'))
        for source in sources:
            folder = OUT / name
            frames = folder / 'frames'
            frames.mkdir(parents=True, exist_ok=True)
            probe = subprocess.run([ffmpeg, '-hide_banner', '-i', str(source)], capture_output=True, text=True)
            duration = re.search(r'Duration: (\d+):(\d+):([\d.]+)', probe.stderr)
            duration_s = sum(float(x)*w for x,w in zip(duration.groups(), [3600,60,1])) if duration else None
            subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), '-vf', 'fps=8', '-q:v', '2', str(frames / 'frame_%04d.jpg')], check=True)
            paths = sorted(frames.glob('frame_*.jpg'))
            data = []
            previous = None
            for i, path in enumerate(paths):
                with Image.open(path) as original:
                    small = original.resize((160,90)).convert('RGB')
                    diff = sum(ImageStat.Stat(ImageChops.difference(small, previous)).mean)/3 if previous else 0
                    data.append({'frame':i+1, 'time_s':round(i/8,3), 'path':path.relative_to(ROOT).as_posix(), 'size':original.size, 'rgb_mean':[round(x,2) for x in ImageStat.Stat(small).mean], 'mean_abs_change':round(diff,3)})
                    previous=small
            for start in range(0,len(paths),32):
                sheet = Image.new('RGB',(4*384,8*240),(15,19,25))
                draw=ImageDraw.Draw(sheet)
                for slot,path in enumerate(paths[start:start+32]):
                    i=start+slot
                    with Image.open(path) as original:
                        im=original.copy(); im.thumbnail((376,211))
                    x=(slot%4)*384+4; y=(slot//4)*240+4
                    sheet.paste(im,(x+(376-im.width)//2,y+(211-im.height)//2))
                    draw.text((x,y+214),f'{name} | {i/8:06.3f}s | frame {i+1:04}',font=font,fill=(198,214,226))
                sheet.save(folder / f'contact_{start//32+1:02}.jpg',quality=90)
            entry={'id':name,'source':str(source), 'sha256':hashlib.sha256(source.read_bytes()).hexdigest(), 'duration_s':duration_s, 'sampling_fps':8,'frame_count':len(paths), 'frames':data, 'ffmpeg_probe':probe.stderr}
            (folder/'manifest.json').write_text(json.dumps(entry,indent=2),encoding='utf-8')
            inventory.append({k:v for k,v in entry.items() if k not in ['frames','ffmpeg_probe']})
    (OUT/'video_inventory.json').write_text(json.dumps(inventory,indent=2),encoding='utf-8')
    print(json.dumps(inventory,indent=2))

def resumes():
    import pdfplumber
    names=['Resume_DE.pdf','Resume_DS.pdf','Resume_App.pdf','Bhargav_M_Resume.pdf','Bhargav_M_Cog.pdf','Bhargav_M.pdf','Bhargav_M_Resume_1.pdf','Bhargav_Resume.pdf']
    folder=OUT/'resumes'; folder.mkdir(exist_ok=True)
    inventory=[]
    poppler=Path('C:/Users/Bhargav/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
    for name in names:
        source=Path('C:/Users/Bhargav/Downloads/Resumes')/name
        with pdfplumber.open(source) as pdf:
            text='\n\n'.join(f'--- PAGE {i+1} ---\n{page.extract_text(layout=False) or ""}' for i,page in enumerate(pdf.pages))
            links=[a.get('uri') for p in pdf.pages for a in p.hyperlinks if a.get('uri')]
            pages=len(pdf.pages)
        (folder/f'{source.stem}.txt').write_text(text,encoding='utf-8')
        subprocess.run([str(poppler),'-scale-to','1500','-png',str(source),str(folder/source.stem)],check=True,capture_output=True)
        inventory.append({'source':str(source),'pages':pages,'links':links,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
    (folder/'inventory.json').write_text(json.dumps(inventory,indent=2),encoding='utf-8')
    print(json.dumps(inventory,indent=2))

if __name__=='__main__':
    import sys
    if sys.argv[1]=='videos': videos()
    elif sys.argv[1]=='resumes': resumes()
