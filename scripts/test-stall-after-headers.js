// scripts/test-stall-after-headers.js
const http = require('http');
const aiAdvisor = require('../services/ai-advisor');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  // Never write body, never end, never destroy
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log(`Server listening on ${port}`);

  const t0 = Date.now();
  console.log('Testing stall after headers with 1000ms timeout...');

  const safetyTimer = new Promise((_, rej) => setTimeout(() => rej(new Error('STALL_HANG: requestLlm hung past timeout!')), 2500));

  try {
    const result = await Promise.race([
      aiAdvisor.requestLlm({
        apiUrl: `http://127.0.0.1:${port}/v1`,
        prompt: 'test stall',
        timeout: 1000
      }),
      safetyTimer
    ]);
    console.log('Result:', result);
  } catch (err) {
    console.log(`Caught after ${Date.now() - t0}ms:`, err.message);
  } finally {
    server.close();
    process.exit(0);
  }
});
