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

# Use a stable screen-space support for this static-logo experiment.
fixed=logo_mask((320,320),(175,176,49,49))
masks=[fixed.copy() for _ in frames]
r=TemporalInpainter(frames,masks);observations=[]
for i in range(0,len(frames),12):
 o,v=r.reconstruct(i)
 obs=np.median((frames[i].astype(float)-o)/(255-o.astype(float)+1e-3),axis=2)
 obs[~r.last_valid]=np.nan
 observations.append(obs)
 print(i,round(v,2),flush=True)
a=np.nanmedian(np.stack(observations),axis=0)
a=np.nan_to_num(a);a=np.clip(a,0,.65)
a=cv2.medianBlur(a.astype(np.float32),3)
a[fixed==0]=0
tiles=[]
for i in [0,24,48,63,72,96,120,144,168,192,216,239]:
 o=np.clip((frames[i].astype(float)-255*a[:,:,None])/(1-a[:,:,None]),0,255).astype(np.uint8)
 p=np.hstack([frames[i][160:245,160:245],o[160:245,160:245]]);p=cv2.resize(p,(340,170));cv2.putText(p,str(i),(5,15),0,.5,(0,0,255),1);tiles.append(p)
cv2.imwrite('artifacts/watermark-validation/temporal-alpha.png',np.vstack([np.hstack(tiles[i:i+3]) for i in range(0,len(tiles),3)]))
np.save('artifacts/watermark-validation/temporal-alpha.npy',a)
print('alpha max',a.max(), 'support', np.count_nonzero(a))
