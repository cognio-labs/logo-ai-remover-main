const fs = require('fs');
const path = 'D:/logo-ai-remover-main/logo-ai-remover-main/public/gwr-engine/video-app.js';
let code = fs.readFileSync(path, 'utf8');

// 1. go(t, e) replacement
const oldGo = 'function go(t,e){return!Number.isFinite(t)||!Number.isFinite(e)||t<=0||e<=0?[]:hE([...fE(t,e),...pE(t,e)])}';
const newGo = 'function go(t,e){if(!Number.isFinite(t)||!Number.isFinite(e)||t<=0||e<=0)return[];let base=hE([...fE(t,e),...pE(t,e)]);let s_vals=[72,48,36,96];let extra=[];for(let s of s_vals){if(s>=t||s>=e)continue;let cx=Math.round((t-s)/2),cy=Math.round((e-s)/2);extra.push({id:"veo-center-"+s,label:"Center, "+s+"px",size:s,width:s,height:s,x:cx,y:cy,marginRight:t-cx-s,marginBottom:e-cy-s,videoWidth:t,videoHeight:e,sourcePriority:10,evidenceGate:"standard"});let ly=Math.round(e*0.65),lx=Math.round(t*0.74);if(ly+s<=e&&lx+s<=t){extra.push({id:"veo-lower-proj-"+s,label:"Lower projected, "+s+"px",size:s,width:s,height:s,x:lx,y:ly,marginRight:t-lx-s,marginBottom:e-ly-s,videoWidth:t,videoHeight:e,sourcePriority:9,evidenceGate:"standard"});}if(ly+s<=e){extra.push({id:"veo-lower-center-"+s,label:"Lower center, "+s+"px",size:s,width:s,height:s,x:cx,y:ly,marginRight:t-cx-s,marginBottom:e-ly-s,videoWidth:t,videoHeight:e,sourcePriority:11,evidenceGate:"standard"});}}return hE([...base,...extra]);}';

if (!code.includes(oldGo)) {
  console.error('oldGo not found');
  process.exit(1);
}
code = code.replace(oldGo, newGo);

// 2. lowConfidenceThreshold
const oldLow = 'lowConfidenceThreshold:e.lowConfidenceThreshold??ZT';
const newLow = 'lowConfidenceThreshold:(e.allowLowConfidence===!0?0:(e.lowConfidenceThreshold??ZT))';
if (!code.includes(oldLow)) {
  console.error('oldLow not found');
  process.exit(1);
}
code = code.replace(oldLow, newLow);

// 3. t1 highQualityCleanup override
const oldT1 = 'UP({windowObject:window,adaptiveAlphaInput:q.adaptiveAlpha})';
const newT1 = 'UP({windowObject:window,adaptiveAlphaInput:q.adaptiveAlpha}),typeof window.__gwrVideoOverrideHighQualityCleanup=="boolean"&&(q.highQualityCleanup.checked=window.__gwrVideoOverrideHighQualityCleanup)';
if (!code.includes(oldT1)) {
  console.error('oldT1 not found');
  process.exit(1);
}
code = code.replace(oldT1, newT1);

// 4. eT spatial score for dark & bright marks
const oldET = 's=Math.max(0,a)*.35+Math.max(0,i)*.65;return{candidate:e,alphaMap:r,spatial:a,gradient:i,confidence:s}';
const newET = 's=Math.max(Math.max(0,a),Math.abs(a)>0.08?Math.abs(a)*0.9:0)*.35+Math.max(0,i)*.65;return{candidate:e,alphaMap:r,spatial:a,gradient:i,confidence:s}';
if (!code.includes(oldET)) {
  console.error('oldET not found');
  process.exit(1);
}
code = code.replace(oldET, newET);

// 5. df with logoValue
const oldDf = 'function df(t,e,A){let r=ik(t);return YB(r,e,{x:0,y:0,width:t.width,height:t.height},{alphaGain:A}),r}';
const newDf = 'function df(t,e,A,G){let r=ik(t);return YB(r,e,{x:0,y:0,width:t.width,height:t.height},{alphaGain:A,logoValue:G}),r}';
if (!code.includes(oldDf)) {
  console.error('oldDf not found');
  process.exit(1);
}
code = code.replace(oldDf, newDf);

// 6. dk pass logoValue
const oldDkCall = 'l=df(s,n,c);';
const newDkCall = 'l=df(s,n,c,(a.spatial<-0.06?0:255));';
if (!code.includes(oldDkCall)) {
  console.error('oldDkCall not found');
  process.exit(1);
}
code = code.replace(oldDkCall, newDkCall);

// Verify syntax
new Function(code);
fs.writeFileSync(path, code, 'utf8');
console.log('Successfully updated video-app.js! New length:', code.length);

