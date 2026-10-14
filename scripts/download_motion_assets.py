"""Fetch the motion libraries, fonts, extra Three.js addons and CC-BY models used by the site.

Sources: the npm registry (exact versions) and the three.js r180 repository on GitHub.
Each GLB is checked against the SHA-256 recorded in portfolio/dist/assets/live-3d/credits.json.
"""
from pathlib import Path
from urllib.request import Request, urlopen
import hashlib, io, posixpath, re, tarfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'portfolio/dist'

def fetch(url):
    return urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=120).read()

def npm(name, version):
    base = name.split('/')[-1]
    return tarfile.open(fileobj=io.BytesIO(fetch(f'https://registry.npmjs.org/{name}/-/{base}-{version}.tgz')), mode='r:gz')

def copy(archive, member, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(archive.extractfile(f'package/{member}').read())

gsap = npm('gsap', '3.15.0')
for plugin in ['gsap', 'ScrollTrigger', 'SplitText', 'CustomEase']:
    copy(gsap, f'dist/{plugin}.min.js', DIST / f'vendor/gsap/{plugin}.min.js')

lenis = npm('lenis', '1.3.26')
for member in ['dist/lenis.min.js', 'dist/lenis.css', 'LICENSE']:
    copy(lenis, member, DIST / 'vendor/lenis' / Path(member).name)

for pkg, weights in [('@fontsource/geist-sans', [400, 500, 600]), ('@fontsource/geist-mono', [400, 500])]:
    archive = npm(pkg, '5.3.0'); family = pkg.split('/')[-1]
    for w in weights:
        copy(archive, f'files/{family}-latin-{w}-normal.woff2', DIST / f'vendor/fonts/{family}-latin-{w}-normal.woff2')
    if family == 'geist-sans':
        copy(archive, 'LICENSE', DIST / 'vendor/fonts/OFL-LICENSE.txt')

three = npm('three', '0.180.0'); seen = set()
def addon(rel):
    rel = posixpath.normpath(rel)
    if rel in seen:
        return
    seen.add(rel)
    source = three.extractfile(f'package/examples/jsm/{rel}').read().decode('utf-8')
    out = DIST / 'vendor/addons' / rel; out.parent.mkdir(parents=True, exist_ok=True); out.write_text(source, encoding='utf-8')
    for dep in re.findall(r'(?:from\s*|import\s*)[\'"]([^\'"]+)[\'"]', source):
        if dep.startswith('.'):
            addon(posixpath.join(posixpath.dirname(rel), dep))
for rel in ['loaders/GLTFLoader.js', 'postprocessing/GTAOPass.js', 'postprocessing/SMAAPass.js', 'postprocessing/ShaderPass.js', 'environments/RoomEnvironment.js']:
    addon(rel)

models = {
    'space_ship_hallway.glb': '051c58dea01930b04d9d23d15f6a9a6a0628358d17954feb47dfa06e075f3bfe',
    'PrimaryIonDrive.glb': '4da2bc76db5a1f639866f05219426c9fde0ece3239c3cb054b5675a8dc1cde21',
}
for name, digest in models.items():
    data = fetch(f'https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/models/gltf/{name}')
    assert hashlib.sha256(data).hexdigest() == digest, name
    out = DIST / 'assets/models' / name; out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(data)

print({'addons': len(seen), 'models': list(models)})
