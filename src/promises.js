const http = require('http');
const url = require('url');
const https = require('https');

const fetchTitle = (address, callback) => {
  // Ensure the address starts with http:// or https://
  if (!/^https?:\/\//i.test(address)) {
    address = 'http://' + address;
  }

  const parsedUrl = url.parse(address);
  const protocol = parsedUrl.protocol === 'https:' ? https : http;

  protocol.get(address, (res) => {
    let data = '';

    if (res.statusCode !== 200) {
      // Handle non-200 status codes
      callback(null, { address, title: 'NO RESPONSE' });
      return;
    }

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const match = data.match(/<title>([^<]*)<\/title>/);
      if (match && match[1]) {
        callback(null, { address, title: match[1] });
      } else {
        callback(null, { address, title: 'NO RESPONSE' });
      }
    });
  }).on('error', () => {
    // Handle request errors
    callback(null, { address, title: 'NO RESPONSE' });
  });
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  if (path === '/I/want/title') {
    const addresses = parsedUrl.query.address;
    if (!addresses) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>No addresses provided</h1></body></html>');
      return;
    }

    const addressList = Array.isArray(addresses) ? addresses : [addresses];
    let results = [];
    let completedRequests = 0;

    addressList.forEach((address) => {
      fetchTitle(address, (err, result) => {
        results.push(`<li>${result.address} - "${result.title}"</li>`);
        completedRequests++;
        if (completedRequests === addressList.length) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h1>Following are the titles of given websites:</h1><ul>${results.join('')}</ul></body></html>`);
        }
      });
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>404 Not Found</h1></body></html>');
  }
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
