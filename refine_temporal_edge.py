import cv2,numpy as np
raw=np.load('artifacts/watermark-validation/temporal-alpha.npy');patch=raw[168:232,168:232];p=np.mean([np.rot90(patch,k) for k in range(4)],axis=0);alpha=np.median(p[p>.25]);p[p>.20]=alpha;p[p<.015]=0;a=np.zeros_like(raw);a[168:232,168:232]=p
np.save('artifacts/watermark-validation/refined-alpha.npy',a)
edge=((cv2.dilate((a>.02).astype(np.uint8),np.ones((3,3),np.uint8))>0) & (cv2.erode((a>.25).astype(np.uint8),np.ones((3,3),np.uint8))==0)).astype(np.uint8)*255
c=cv2.VideoCapture('watermark-backend/cartoon-upload.mp4');tiles=[]
for i in [0,24,48,63,72,96,120,144,168,192,216,239]:
 c.set(cv2.CAP_PROP_POS_FRAMES,i);ok,f=c.read();f=f[960:1280,400:720];o=np.clip((f.astype(float)-255*a[:,:,None])/(1-a[:,:,None]),0,255).astype(np.uint8);o=cv2.inpaint(o,edge,2,cv2.INPAINT_NS);p=np.hstack([f[160:245,160:245],o[160:245,160:245]]);p=cv2.resize(p,(340,170));cv2.putText(p,str(i),(5,15),0,.5,(0,0,255),1);tiles.append(p)
cv2.imwrite('artifacts/watermark-validation/refined-alpha-edge.png',np.vstack([np.hstack(tiles[i:i+3]) for i in range(0,len(tiles),3)]));print(alpha)
