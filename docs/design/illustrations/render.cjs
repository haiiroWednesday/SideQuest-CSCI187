// node render.cjs scene style scale out.png
const http = require('http'), fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const [,, scene, style, scale, out] = process.argv; const root = __dirname;
const srv = http.createServer((q, s) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': f.endsWith('.mjs') ? 'text/javascript' : 'text/html' }); s.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch(); const p = await b.newPage(); p.on('pageerror', e => { console.log('ERR', e.message); process.exit(1); }); p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await p.goto(`http://localhost:${srv.address().port}/page.html?scene=${scene}&style=${style}&s=${scale}`); await p.waitForFunction('window.done', null, { timeout: 900000 });
  const png = await p.evaluate('window.png'), ms = await p.evaluate('window.ms'); fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64')); console.log(scene, style, Math.round(ms) + 'ms'); await b.close(); srv.close(); });
