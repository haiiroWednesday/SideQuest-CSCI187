# python3 export.py scene scale tag,tag,...  -> assets/<name>-ink.png, -<tag>.png masks, and <name>-color.webp preview
import sys, subprocess, json, numpy as np
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
scene, scale, tags = sys.argv[1], sys.argv[2], [t for t in (sys.argv[3] if len(sys.argv) > 3 else '').split(',') if t]
COL = {'petal': '#b8263d', 'center': '#e8aa24', 'leaf': '#8fa58f', 'tile': '#2b4f93', 'tile2': '#5b86c9', 'clay': '#c9704c'}
if scene in ('wisteria', 'strand'): COL['petal'] = '#a993cf'
def run(tag):
  out = f'assets/_{scene}-{tag or "ink"}.png'
  subprocess.run(['node', 'render.cjs', scene, 'ink', scale, out] + ([tag] if tag else []), check=True, capture_output=True); return out
with ThreadPoolExecutor(4) as ex: files = list(ex.map(run, [None] + tags))
crops = json.loads(subprocess.run(['node', '-e', f"import('./scenes/{scene}.mjs').then(m=>console.log(JSON.stringify(m.crops||[['{scene}',0,0,m.size[0],m.size[1]]])))"], capture_output=True, text=True).stdout)
S = float(scale); ink = np.asarray(Image.open(files[0]).convert('L')).astype(float)
paper, inkv = 244.0, 38.0
a_ink = np.clip((paper - ink) / (paper - inkv), 0, 1); a_ink[a_ink < .1] = 0
plates = {t: 1 - np.asarray(Image.open(f).convert('L')).astype(float) / 255 for t, f in zip(tags, files[1:])}
def rgba(alpha, hexc):
  c = tuple(int(hexc[i:i + 2], 16) for i in (1, 3, 5)); h, w = alpha.shape; o = np.zeros((h, w, 4), np.uint8); o[..., 0], o[..., 1], o[..., 2] = c; o[..., 3] = (alpha * 255).astype(np.uint8); return Image.fromarray(o, 'RGBA')
for name, x0, y0, x1, y1 in crops:
  b = tuple(int(v * S) for v in (x0, y0, x1, y1))
  rgba(a_ink, '#2b211f').crop(b).save(f'assets/{name}-ink.png', optimize=True)
  comp = Image.new('RGBA', (b[2] - b[0], b[3] - b[1]), '#fbf6ed')
  for t in tags:
    m = plates[t]
    if m[b[1]:b[3], b[0]:b[2]].max() < .5: continue
    pl = rgba(m * .92, COL[t]).crop(b); pl.save(f'assets/{name}-{t}.png', optimize=True)
    sh = int(2 * S); comp.alpha_composite(pl, (sh, sh // 2))
  comp.alpha_composite(rgba(a_ink, '#2b211f').crop(b)); comp.convert('RGB').save(f'assets/{name}-color.webp', quality=88)
  print(name, b)
