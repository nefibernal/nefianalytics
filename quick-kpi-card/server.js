const https = require('https');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const port = Number(process.env.PORT || 8765);
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.trex':'application/xml','.svg':'image/svg+xml'};
const options = process.env.SSL_KEY && process.env.SSL_CERT ? {key:fs.readFileSync(process.env.SSL_KEY),cert:fs.readFileSync(process.env.SSL_CERT)} : null;
const handler=(req,res)=>{let url=decodeURIComponent(req.url.split('?')[0]); if(url==='/') url='/index.html'; const file=path.normalize(path.join(root,url)); if(!file.startsWith(root)){res.writeHead(403);return res.end('Forbidden');} fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end('Not found');} res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(b);});};
if(options) https.createServer(options,handler).listen(port,()=>console.log(`Quick KPI Card: https://localhost:${port}`)); else require('http').createServer(handler).listen(port,()=>console.log(`Quick KPI Card: http://localhost:${port} (use HTTPS for Tableau)`));
