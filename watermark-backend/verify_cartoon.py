import cv2,numpy as np,sys,hashlib,json,subprocess
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from logo_target import detect_target
source=Path('watermark-backend/cartoon-upload.mp4');output=Path('watermark-backend/cartoon-clean.mp4')
a,b=cv2.VideoCapture(str(source)),cv2.VideoCapture(str(output));tiles=[];p=None;n=0;residual=[];maxdiff=[]
while True:
 ok,f=a.read();ok2,g=b.read()
 if not ok:break
 if not ok2:raise RuntimeError('Output decode/frame count failure')
 q=detect_target(f,p)
 if q:p=q
 x,y,w,h=p
 residual.append(detect_target(g,(x,y,w,h)) is not None)
 if n%24==0:
  aa=f[y-12:y+h+12,x-12:x+w+12];bb=g[y-12:y+h+12,x-12:x+w+12]
  tile=cv2.resize(np.hstack([aa,bb]),(340,180));cv2.putText(tile,f'frame {n}: original | output',(3,15),cv2.FONT_HERSHEY_SIMPLEX,.4,(0,0,255),1);tiles.append(tile)
 n+=1
while len(tiles)%2:tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite('watermark-backend/cartoon-contact-sheet.png',np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]))
report={'frames_decoded':n,'output_frames_with_sparkle_detection':[i for i,v in enumerate(residual) if v]}
for path in [source,output]:
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames,duration,sample_aspect_ratio,display_aspect_ratio','-show_entries','format=duration','-of','json',str(path)],text=True))
 audio=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:a:0','-c:a','copy','-f','adts','-'])
 report[str(path)]={'probe':probe,'audio_sha256':hashlib.sha256(audio).hexdigest(),'file_sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
Path('watermark-backend/cartoon-verification.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report,indent=2))
