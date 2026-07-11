import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:local.db' });
async function run() {
  await client.execute('DELETE FROM orders');
  console.log('Orders deleted');
}
run();
