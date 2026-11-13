# usage: python3 tools/metrics.py ref.png render.png
# Measured similarity: SSIM (grey and per channel), mean abs error, and per-region color deltas.
import sys, json
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim
ref = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
ren = np.asarray(Image.open(sys.argv[2]).convert('RGB').resize((ref.shape[1], ref.shape[0]), Image.LANCZOS)).astype(float)
def grey(a): return a @ [0.299, 0.587, 0.114]
out = {}
out['ssim_grey'] = ssim(grey(ref), grey(ren), data_range=255)
out['ssim_rgb'] = ssim(ref, ren, data_range=255, channel_axis=2)
# SSIM at quarter resolution: structure and color layout, ignoring fine texture
def down(a, f=4): return np.asarray(Image.fromarray(a.astype(np.uint8)).resize((a.shape[1]//f, a.shape[0]//f), Image.BOX)).astype(float)
out['ssim_rgb_q'] = ssim(down(ref), down(ren), data_range=255, channel_axis=2)
d8 = lambda f: np.abs(down(ref, f) - down(ren, f)).mean() / 255
out['mae'] = np.abs(ref - ren).mean() / 255
out['mae_16'] = d8(16)
out['similarity_pct_full'] = 100 * (1 - out['mae'])
out['similarity_pct_16'] = 100 * (1 - out['mae_16'])
regions = {'sky': (0, 140, 2000, 640), 'lmesa': (90, 660, 420, 880), 'rmesa': (1580, 480, 2000, 800),
           'horizon': (450, 880, 1500, 960), 'plain_L': (0, 960, 900, 1150), 'plain_R': (1100, 960, 2000, 1200),
           'outcrop': (300, 1150, 1700, 1333), 'figure': (965, 975, 1045, 1145)}
for k, (x0, y0, x1, y1) in regions.items():
    a = ref[y0:y1, x0:x1].reshape(-1, 3).mean(0); b = ren[y0:y1, x0:x1].reshape(-1, 3).mean(0)
    out['reg_' + k] = f'ref {a.astype(int).tolist()} ren {b.astype(int).tolist()} mae {np.abs(ref[y0:y1, x0:x1]-ren[y0:y1, x0:x1]).mean():.1f}'
for k, v in out.items(): print(f'{k}: {v:.4f}' if isinstance(v, float) else f'{k}: {v}')
