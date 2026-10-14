import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf','.jpg':'image/jpeg','.png':'image/png','.json':'application/json','.txt':'text/plain','.glb':'model/gltf-binary','.woff2':'font/woff2','.hdr':'application/octet-stream','.map':'application/json'};
http.createServer((req,res)=>{
  let filename;
  try { filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)); } catch {res.writeHead(400).end();return;}
  if(!filename.startsWith(root+path.sep) && filename!==root){res.writeHead(403).end();return;}
  if(filename===root || fs.existsSync(filename) && fs.statSync(filename).isDirectory())filename=path.join(filename,'index.html');
  fs.stat(filename,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}
    const headers={'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):stat.size-1,stat.size-1);if(start> end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});if(req.method==='HEAD'){res.end();return;}fs.createReadStream(filename,{start,end}).pipe(res);return;}
    res.writeHead(200,{...headers,'Content-Length':stat.size});if(req.method==='HEAD'){res.end();return;}fs.createReadStream(filename).pipe(res);
  });
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
