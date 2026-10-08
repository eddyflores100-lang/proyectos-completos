const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
function createServer(){return http.createServer((req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 const send=(code,data,type='application/json; charset=utf-8')=>{res.writeHead(code,{'Content-Type':type});res.end(req.method==='HEAD'?'':data);};
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return send(404,'{"error":"Not found"}');}
 if(/^\/(api(?:\/|$)|admin(?:\/|$)|dashboard(?:\/|$)|api-docs(?:\/|$)|scraping(?:\/|$))/.test(name))return send(503,JSON.stringify({available:false,message:'Esta versión ofrece demos de diseño. Scraping, administración y métricas no están implementados.'}));
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(405,'{"error":"Method not allowed"}');}
 if(name==='/health')return send(200,JSON.stringify({status:'ok',mode:'design_catalogue',scraping:false,database:false}));
 if(name.split('/').some(p=>p.startsWith('.'))||name.includes('\\')||name.includes('\0'))return send(404,'{"error":"Not found"}');
 let file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)&&file!==root)return send(404,'{"error":"Not found"}');
 try{if(fs.statSync(file).isDirectory()){if(!name.endsWith('/')){res.writeHead(308,{Location:encodeURI(name)+'/'});return res.end();}file=path.join(file,'index.html');}const data=fs.readFileSync(file);return send(200,data,types[path.extname(file)]||'application/octet-stream');}catch{return send(404,'{"error":"Not found"}');}
});}
if(require.main===module){if(!fs.existsSync(path.join(root,'index.html')))throw new Error('Ejecuta npm run build antes de iniciar.');createServer().listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('Catálogo de diseño iniciado; servicios operativos no disponibles.'));}
module.exports={createServer};
