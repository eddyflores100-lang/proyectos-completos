const {test,after,before}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createServer}=require('../server');
let server,url;const originals={};
before(async()=>{for(const p of ['package.json','vercel.json']) originals[p]=fs.readFileSync(p,'utf8');server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(r=>server.close(r));for(const [p,s] of Object.entries(originals))assert.equal(fs.readFileSync(p,'utf8'),s);});
test('catalogue and ten demos serve correctly, with working CSS and honest status',async()=>{
 const redirect=await fetch(url+'/consulting-agency',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/consulting-agency/');
 const root=await fetch(url);assert.equal(root.status,200);assert.match(await root.text(),/Adaptamos/);
 const items=JSON.parse(fs.readFileSync('dist/catalog.json'));assert.equal(items.length,10);
 for(const item of items){const r=await fetch(url+'/'+item.slug+'/');const html=await r.text();assert.equal(r.status,200);assert.match(html,/DEMO DE DISEÑO/);assert.match(html,/noindex/);assert.equal((html.match(/<script\b/g)||[]).length,1);assert.doesNotMatch(html,/\son\w+\s*=|javascript:/i);assert.equal((await fetch(url+'/'+item.slug+'/style.css')).status,200);}
});
test('fake operations are unavailable and files outside dist cannot be read',async()=>{
 for(const p of ['/api/scraping','/api/scraping/status/job_1','/admin','/dashboard','/api-docs']) assert.equal((await fetch(url+p)).status,503);
 assert.equal((await fetch(url+'/api/scraping/start',{method:'POST',body:'{}'})).status,503);
 for(const p of ['/package.json','/archive/legacy/server.js','/.env','/%2e%2e%2fpackage.json','/unknown','/%zz'])assert.equal((await fetch(url+p)).status,404);
 assert.equal((await fetch(url+'/',{method:'POST'})).status,405);
 assert.equal((await fetch(url+'/',{method:'HEAD'})).headers.get('content-type'),'text/html; charset=utf-8');
 const health=await(await fetch(url+'/health')).json();assert.equal(health.mode,'design_catalogue');assert.equal(health.scraping,false);
});
