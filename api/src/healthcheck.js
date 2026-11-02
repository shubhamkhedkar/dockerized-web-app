'use strict';

// Tiny dependency-free healthcheck used by the Docker HEALTHCHECK,
// so the runtime image doesn't need curl or wget.
const http = require('http');

const port = process.env.API_PORT || 3000;
const req = http.get({ host: '127.0.0.1', port, path: '/readyz', timeout: 3000 }, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('timeout', () => req.destroy(new Error('timeout')));
req.on('error', () => process.exit(1));
