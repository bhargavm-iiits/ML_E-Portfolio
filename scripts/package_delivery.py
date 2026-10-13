from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[1]
dest=ROOT/'Bhargav_Portfolio_Delivery.zip'
files=[ROOT/'MASTER PROMPT.md',ROOT/'README.md']
for folder in ['portfolio','reference-analysis','scripts','verification']:
    files.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and not any(s in p.parts for s in ['.git','node_modules','__pycache__','.sites-runtime']))
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for p in files:archive.write(p,p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(dest) as archive:
    assert archive.testzip() is None
    assert 'MASTER PROMPT.md' in archive.namelist()
    assert 'portfolio/dist/index.html' in archive.namelist()
    assert sum(x.startswith('reference-analysis/motion-boards/') for x in archive.namelist())==20
print(f'{dest}\n{len(files)} files / {dest.stat().st_size/1e6:.2f} MB / ZIP integrity passed')
