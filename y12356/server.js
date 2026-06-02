const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const DIR = __dirname;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(DIR, urlPath);
    const ext = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found: ' + urlPath);
            return;
        }
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('  \x1b[32m\u2713 RC\u5145\u653E\u7535\u62DF\u5408\u5206\u6790\u7CFB\u7EDF\u5DF2\u542F\u52A8\x1b[0m');
    console.log('  \x1b[36m\u2192 \u6253\u5F00\u6D4F\u89C8\u5668: http://localhost:' + PORT + '\x1b[0m');
    console.log('  \x1b[90m\u2192 Ctrl+C \u505C\u6B62\u670D\u52A1\x1b[0m');
    console.log('');
});
