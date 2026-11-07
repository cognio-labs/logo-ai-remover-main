import sys,cv2,numpy as np,time
from pathlib import Path
sys.path.insert(0,'watermark-backend')
from logo_target import detect_target
from temporal_inpainter import TemporalInpainter,logo_mask
c=cv2.VideoCapture('watermark-backend/cartoon-upload.mp4');frames=[];masks=[];box=None
while True:
 ok,f=c.read()
 if not ok:break
 q=detect_target(f,box)
 if q:box=q
 x,y,w,h=box
 frames.append(f[960:1280,400:720].copy())
 masks.append(logo_mask((320,320),(x-400,y-960,max(49,w),max(49,h))))
r=TemporalInpainter(frames,masks);tiles=[];coverage=[]
for i in [0,1,24,48,63,72,96,120,144,168,192,216,239]:
 o,v=r.reconstruct(i);coverage.append((i,round(v,3)));p=np.hstack([frames[i][160:245,160:245],o[160:245,160:245]]);p=cv2.resize(p,(340,170));cv2.putText(p,f'{i} coverage {v:.2f}',(5,15),0,.5,(0,0,255),1);tiles.append(p)
while len(tiles)%3:tiles.append(np.zeros_like(tiles[0]))
Path('artifacts/watermark-validation').mkdir(parents=True,exist_ok=True)
cv2.imwrite('artifacts/watermark-validation/temporal-experiment.png',np.vstack([np.hstack(tiles[i:i+3]) for i in range(0,len(tiles),3)]));print(coverage)
