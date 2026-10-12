import { createLabServer } from './server.mjs';

createLabServer({ mode: 'vulnerable' }).listen(4185, '127.0.0.1', () => {
  console.log('本地虚构数据靶场：vulnerable http://127.0.0.1:4185');
});
