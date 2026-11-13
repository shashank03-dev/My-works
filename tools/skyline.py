import numpy as np
from PIL import Image
from scipy import ndimage as nd
a=np.asarray(Image.open('cook/refs/R01.png').convert('RGB')).astype(float)
g=nd.gaussian_filter(a,(2,2,0))
R,G,B=g[...,0],g[...,1],g[...,2]
L=g.mean(2)
land=(L>34)|((R>B+3)&(R>13))
land=nd.binary_opening(land,iterations=2)
H,W=L.shape
top=np.zeros(W,int)
for x in range(W):
    col=land[440:,x]
    # require run of 6 land px
    run=np.convolve(col.astype(int),np.ones(6,int),'valid')>=6
    top[x]=440+np.argmax(run)
np.save('tools/skyline.npy',top)
print(' '.join(f'{x}:{top[x]}' for x in range(0,W,20)))
