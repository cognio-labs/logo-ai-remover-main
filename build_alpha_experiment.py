from pathlib import Path
p=Path('temporal_experiment.py');s=p.read_text(encoding='utf8');a=s.index('r=TemporalInpainter');s=s[:a]+'''
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
''';Path('temporal_alpha_experiment.py').write_text(s,encoding='utf8')
