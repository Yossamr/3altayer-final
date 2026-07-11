import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './db/schema.ts';

async function main() {
  const dbClient = createClient({ url: "file:local.db" });
  const db = drizzle(dbClient, { schema });
  try {
    const res = await db.select().from(schema.users);
    console.log("Success! Users count:", res.length);
  } catch (e) {
    console.error("Error:", e.name, e.message);
  }
}
main();
