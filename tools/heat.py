# usage: heat.py render.png out.png  -> blurred abs-difference heatmap + signed luminance/saturation table
import sys, numpy as np
from PIL import Image
ref=np.asarray(Image.open('cook/refs/R01.png').convert('RGB').resize((100,67),Image.BOX)).astype(float)
ren=np.asarray(Image.open(sys.argv[1]).convert('RGB').resize((100,67),Image.BOX)).astype(float)
d=np.abs(ref-ren).mean(2)
img=np.clip(d*4,0,255).astype(np.uint8)
Image.fromarray(img).resize((1000,670),Image.NEAREST).save(sys.argv[2])
# 10x10 grid of signed differences (render - ref): R,G,B
print('grid cells 200x133 px: mean |diff| and signed RGB (render-ref)')
for gy in range(10):
    row=[]
    for gx in range(10):
        a=ref[gy*67//10:(gy+1)*67//10, gx*10:(gx+1)*10].reshape(-1,3).mean(0)
        b=ren[gy*67//10:(gy+1)*67//10, gx*10:(gx+1)*10].reshape(-1,3).mean(0)
        dd=(b-a).astype(int)
        row.append(f'{int(np.abs(b-a).mean()):3d}({dd[0]:+4d}{dd[1]:+4d}{dd[2]:+4d})')
    print(' '.join(row))
