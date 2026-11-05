import { createLabApp } from './app.js';

const host = process.env.LAB_HOST ?? '127.0.0.1';
if (!['127.0.0.1', 'localhost', '::1'].includes(host))
  throw new Error('Security lab may only bind to loopback');
const vulnerable = process.env.ENABLE_VULNERABLE_LAB === 'true';
createLabApp({ vulnerable }).listen(3100, host, () =>
  console.log(`Security lab listening at http://${host}:3100; vulnerable routes: ${vulnerable}`)
);
