import numpy as np
from PIL import Image
from scipy import ndimage as nd
a=np.asarray(Image.open('cook/refs/R01.png').convert('RGB')).astype(float)
g=nd.gaussian_filter(a,(3,3,0))
L=g.mean(2)
# sky/land boundary per column
H,W=L.shape
top=np.zeros(W,int)
for x in range(W):
    col=L[400:,x]
    i=np.argmax(col>34)
    top[x]=400+i
np.save('tools/skyline_raw.npy',top)
for x in range(0,W,25): print(x,top[x],end='; ')
