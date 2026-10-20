const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4321;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  let parsedUrl = req.url.split('?')[0];
  if (parsedUrl === '/') parsedUrl = '/index.html';

  let filePath = path.join(DIST_DIR, parsedUrl);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const potentialFile = filePath + '.html';
    if (fs.existsSync(potentialFile)) {
      filePath = potentialFile;
    } else {
      filePath = path.join(DIST_DIR, 'index.html');
    }
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`RentLedger Web Server running at http://127.0.0.1:${PORT}`);
});
