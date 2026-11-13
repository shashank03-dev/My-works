import sys
from PIL import Image, ImageDraw, ImageEnhance
# usage: gridcrop.py img x0 y0 x1 y1 scale gain step out
img,x0,y0,x1,y1,sc,gain,step,out=sys.argv[1],*map(int,sys.argv[2:6]),float(sys.argv[6]),float(sys.argv[7]),int(sys.argv[8]),sys.argv[9]
im=Image.open(img).convert('RGB').crop((x0,y0,x1,y1))
im=ImageEnhance.Brightness(im).enhance(gain)
im=im.resize((int((x1-x0)*sc),int((y1-y0)*sc)),Image.LANCZOS)
d=ImageDraw.Draw(im)
for x in range((x0//step+1)*step,x1,step):
    X=(x-x0)*sc; d.line([(X,0),(X,im.height)],fill=(0,255,0) if x%(step*5)==0 else (0,110,0)); 
    if x%(step*5)==0: d.text((X+2,2),str(x),fill=(255,255,0))
for y in range((y0//step+1)*step,y1,step):
    Y=(y-y0)*sc; d.line([(0,Y),(im.width,Y)],fill=(0,255,0) if y%(step*5)==0 else (0,110,0))
    if y%(step*5)==0: d.text((2,Y+2),str(y),fill=(255,255,0))
im.save(out)
