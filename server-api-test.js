const fs = require('fs');
fs.mkdirSync('server/api', { recursive: true });
fs.writeFileSync('server/api/test.ts', `
import { defineEventHandler } from 'h3';
export default defineEventHandler((event) => {
  return { hello: 'world' }
});
`);
