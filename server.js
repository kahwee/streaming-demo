const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Set your API key here
const API_KEY = "";

http.createServer((req, res) => {
  // Serve HTML
  if (req.method === 'GET' && req.url === '/') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
      if (err) return res.end(`Error: ${err.message}`);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
  }
  // Proxy to Anthropic
  else if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);

    req.on('end', () => {
      const messages = JSON.parse(body).messages || [];

      const apiReq = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'Accept': 'text/event-stream'
        }
      }, apiRes => {
        // Handle errors
        if (apiRes.statusCode !== 200) {
          res.writeHead(apiRes.statusCode, {
            'Content-Type': 'application/json'
          });
          apiRes.pipe(res);
          return;
        }

        // Stream successful response
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        apiRes.pipe(res);
      });

      apiReq.on('error', e => {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: true, message: e.message}));
      });

      apiReq.write(JSON.stringify({
        model: "claude-3-haiku-20240307",
        messages,
        max_tokens: 1000,
        stream: true
      }));

      apiReq.end();
    });
  }
  else {
    res.writeHead(404);
    res.end();
  }
}).listen(3000, () => console.log('Server running on port 3000'));
