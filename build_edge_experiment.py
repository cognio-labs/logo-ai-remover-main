from pathlib import Path
s=Path('refine_temporal_alpha.py').read_text(encoding='utf8');s=s.replace("c=cv2.VideoCapture", "edge=((cv2.dilate((a>.02).astype(np.uint8),np.ones((3,3),np.uint8))>0) & (cv2.erode((a>.25).astype(np.uint8),np.ones((3,3),np.uint8))==0)).astype(np.uint8)*255\nc=cv2.VideoCapture")
s=s.replace(';p=np.hstack([f[160:', ';o=cv2.inpaint(o,edge,2,cv2.INPAINT_NS);p=np.hstack([f[160:')
s=s.replace('refined-alpha.png','refined-alpha-edge.png');Path('refine_temporal_edge.py').write_text(s,encoding='utf8')
