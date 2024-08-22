const http = require('http');
const url = require('url');
const https = require('https');
const { from, of } = require('rxjs');
const { mergeMap, map, catchError } = require('rxjs/operators');

const fetchTitle = (address) => {
  return new Promise((resolve) => {
    if (!/^https?:\/\//i.test(address)) {
      address = 'http://' + address;
    }

    https.get(address, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const match = data.match(/<title>([^<]*)<\/title>/);
        if (match && match[1]) {
          resolve({ address, title: match[1] });
        } else {
          resolve({ address, title: 'NO RESPONSE' });
        }
      });
    }).on('error', () => {
      resolve({ address, title: 'NO RESPONSE' });
    });
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

    from(addressList).pipe(
      mergeMap((address) =>
        from(fetchTitle(address)).pipe(
          map((result) => `<li>${result.address} - "${result.title}"</li>`),
          catchError(() => of(`<li>${address} - NO RESPONSE</li>`))
        )
      )
    ).subscribe({
      next: (li) => res.write(li),
      complete: () => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('</ul></body></html>');
      },
    });

    res.write('<html><body><h1>Following are the titles of given websites:</h1><ul>');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>404 Not Found</h1></body></html>');
  }
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
