import fs from 'node:fs/promises';
const data=JSON.parse(await fs.readFile('docs/seo/after-local.json','utf8'));
const xml=await fs.readFile('public/sitemap.xml','utf8');
const paths=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
const errors=[];
for(const path of paths){
 const r=data.rows.find(r=>r.path===path);
 if(!r){errors.push(`${path}: not crawled`);continue;}
 if(r.status!==200)errors.push(`${path}: status ${r.status}`);
 if(!r.canonical||new URL(r.canonical).pathname!==path)errors.push(`${path}: canonical`);
 if(/noindex/.test(r.robots||''))errors.push(`${path}: noindex`);
 if(r.headings.filter(h=>h.level==='h1').length!==1)errors.push(`${path}: H1 count`);
 if((r.title?.match(/Bellix/g)||[]).length!==1)errors.push(`${path}: brand count`);
 if(r.structuredData.includes('invalid JSON'))errors.push(`${path}: invalid JSON-LD`);
}
const missing=data.rows.find(r=>r.path==='/seo-missing-page-check');if(missing?.status!==404)errors.push('Missing page must return 404');
for(const path of ['/remove/image','/video']){if(data.rows.find(r=>r.path===path)?.status!==308)errors.push(`${path}: expected 308`);}
console.log(JSON.stringify({checkedSitemapPaths:paths.length,errors},null,2));if(errors.length)process.exitCode=1;
