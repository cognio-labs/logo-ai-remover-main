import numpy as np,cv2
from pathlib import Path
a=np.load('artifacts/watermark-validation/temporal-alpha.npy');y,x=np.where(a>.15);print('bounds',x.min(),x.max(),y.min(),y.max(),'center',np.average(x,weights=a[y,x]),np.average(y,weights=a[y,x]),'median',np.median(a[a>.15]));cv2.imwrite('artifacts/watermark-validation/alpha-field.png',(a[165:235,165:235]*800).astype(np.uint8))
