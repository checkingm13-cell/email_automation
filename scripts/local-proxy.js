// scripts/local-proxy.js
// Ultra-lightweight native residential proxy for Windows (Zero WSL/Squid required)
const http = require('http');
const net = require('net');
const url = require('url');

const PORT = process.env.PROXY_PORT || 3128;

const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url);
    const options = {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.path,
        method: req.method,
        headers: { ...req.headers }
    };
    delete options.headers['proxy-connection'];
    delete options.headers['via'];
    delete options.headers['x-forwarded-for'];

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });
    proxyReq.on('error', (err) => {
        res.writeHead(502);
        res.end('Proxy Error: ' + err.message);
    });
    req.pipe(proxyReq, { end: true });
});

server.on('connect', (req, clientSocket, head) => {
    const { port, hostname } = url.parse('//' + req.url, false, true);
    const serverSocket = net.connect(port || 443, hostname, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
    });
    serverSocket.on('error', () => {
        clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        clientSocket.end();
    });
    clientSocket.on('error', () => serverSocket.end());
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log('✅ Native Windows Residential Proxy is LIVE on port ' + PORT);
    console.log('🌐 Ready to route Oracle VPS traffic through this PC');
    console.log('====================================================');
});
