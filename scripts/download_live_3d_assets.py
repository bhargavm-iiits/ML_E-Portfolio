"""Fetch licensed PBR/HDR assets and the existing Three.js version's addon modules."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urljoin
import re,json,io,zipfile,hashlib,posixpath
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'portfolio/dist/assets/live-3d';ASSETS.mkdir(parents=True,exist_ok=True)
VENDOR=ROOT/'portfolio/dist/vendor/addons';VENDOR.mkdir(parents=True,exist_ok=True)
def fetch(url):
    return urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=90).read()
hdr_url='https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr'
hdr=fetch(hdr_url)
assert hashlib.md5(hdr).hexdigest()=='d5d7eb9d26d341d6aa4d11c1a54fd97c'
(ASSETS/'studio_small_09_1k.hdr').write_bytes(hdr)
metal_url='https://acg-download.struffelproductions.com/file/ambientCG-Web/download/Metal046A_iETd6QjZ/Metal046A_1K-JPG.zip'
archive=zipfile.ZipFile(io.BytesIO(fetch(metal_url)))
selected=[]
for name in archive.namelist():
    stem=Path(name).name
    if re.fullmatch(r'Metal046A_1K(?:-JPG)?_(Color|Roughness|NormalGL|Metalness)\.jpg',stem):
        normalized=stem.replace('_1K-JPG_','_1K_');(ASSETS/normalized).write_bytes(archive.read(name));selected.append(normalized)
assert len(selected)>=3,archive.namelist()
seen=set()
def module(rel):
    rel=posixpath.normpath(rel)
    assert not rel.startswith('../')
    if rel in seen:return
    seen.add(rel)
    source=fetch('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/'+rel).decode('utf-8')
    out=VENDOR/rel;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(source,encoding='utf-8')
    for dep in re.findall(r'(?:from\s*|import\s*)[\'"]([^\'"]+)[\'"]',source):
        if dep.startswith('.'):module(posixpath.join(posixpath.dirname(rel),dep))
for rel in ['loaders/RGBELoader.js','geometries/RoundedBoxGeometry.js','utils/BufferGeometryUtils.js','objects/Reflector.js','postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/UnrealBloomPass.js','postprocessing/OutputPass.js']:module(rel)
credits={'assets':[{'name':'Studio Small 09','creator':'Sergej Majboroda','source':'https://polyhaven.com/a/studio_small_09','license':'CC0','download':hdr_url,'md5':hashlib.md5(hdr).hexdigest()},{'name':'Metal 046 A','creator':'ambientCG / Lennart Demes','source':'https://ambientcg.com/view?id=Metal046A','license':'CC0','license_url':'https://docs.ambientcg.com/license/','files':selected}],'code':{'name':'Three.js 0.180.0 addon modules','license':'MIT','source':'https://github.com/mrdoob/three.js/tree/r180/examples/jsm'},'custom_geometry':'Modular AI hardware, circuits, fans and portal corridor authored for this portfolio; reference videos used only for visual analysis.'}
(ASSETS/'credits.json').write_text(json.dumps(credits,indent=2),encoding='utf-8')
print(json.dumps({'hdr_bytes':len(hdr),'metal_maps':selected,'addon_modules':len(seen)},indent=2))
