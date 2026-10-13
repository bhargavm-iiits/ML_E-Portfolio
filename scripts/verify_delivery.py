"""Validate the master prompt evidence links and delivered PDF/file integrity."""
from pathlib import Path
import re,json,csv,hashlib
ROOT=Path(__file__).resolve().parents[1]
md=(ROOT/'MASTER PROMPT.md').read_text(encoding='utf-8')
images=re.findall(r'!\[[^\]]*\]\(([^)]+)\)',md)
assert len(images)==60,(len(images),'expected 20 boards + 40 crops')
assert all((ROOT/p).is_file() for p in images),'Broken master prompt image reference'
rows=list(csv.DictReader((ROOT/'reference-analysis/frame_by_frame_analysis.csv').open(encoding='utf-8')))
assert len(rows)==240
for clip in ['New_1','New_2','New_3']:
    frames=sorted((ROOT/'reference-analysis'/clip/'frames').glob('*.jpg'))
    assert len(frames)==80
    sample=[r for r in rows if r['clip']==clip]
    assert [float(r['time_s']) for r in sample]==[i/8 for i in range(80)]
for name in ['Resume_DE.pdf','Resume_DS.pdf','Resume_App.pdf','Bhargav_M_Cog.pdf']:
    original=Path('C:/Users/Bhargav/Downloads/Resumes')/name
    delivered=ROOT/'portfolio/dist/assets/resumes'/name
    assert hashlib.sha256(original.read_bytes()).digest()==hashlib.sha256(delivered.read_bytes()).digest(),name
for path in ['index.html','styles.css','scene.css','app.js','art.js','scene.js','hardware.js','data.js','vendor/three.module.js','vendor/three.core.js','vendor/THREE-LICENSE.txt','assets/live-3d/studio_small_09_1k.hdr','assets/live-3d/credits.json']:
    assert (ROOT/'portfolio/dist'/path).is_file(),path
dist=ROOT/'portfolio/dist'
assert not any(dist.rglob('*.mp4')),'Production contains video'
assert not (dist/'assets/cinematic').exists()
for name in ['index.html','app.js','scene.js','hardware.js']:
    source=(dist/name).read_text(encoding='utf-8')
    assert '<video' not in source and 'createCinematic' not in source
    assert 'reference-analysis/' not in source,'Reference imagery embedded in production'
for name in ['Color','Metalness','NormalGL','Roughness']:
    assert (dist/f'assets/live-3d/Metal046A_1K_{name}.jpg').is_file()
print(json.dumps({'master_prompt_words':len(md.split()),'resolved_embedded_images':len(images),'motion_boards':20,'native_detail_crops':40,'samples':len(rows),'sample_rate':8,'original_resume_hashes_matched':4,'required_website_files_present':True,'production_video_files':0,'live_3d_assets_present':True},indent=2))
