# usage: cropcmp.py render.png x0 y0 x1 y1 out.png [scale] [gain]
import sys
from PIL import Image, ImageEnhance
r, x0, y0, x1, y1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
sc = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
gain = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0
a = Image.open('cook/refs/R01.png').convert('RGB').crop((x0, y0, x1, y1))
b = Image.open(r).convert('RGB').crop((x0, y0, x1, y1))
w, h = int((x1 - x0) * sc), int((y1 - y0) * sc)
a = ImageEnhance.Brightness(a.resize((w, h), Image.LANCZOS)).enhance(gain)
b = ImageEnhance.Brightness(b.resize((w, h), Image.LANCZOS)).enhance(gain)
o = Image.new('RGB', (w, h * 2 + 4), (255, 255, 255)); o.paste(a, (0, 0)); o.paste(b, (0, h + 4)); o.save(out)
