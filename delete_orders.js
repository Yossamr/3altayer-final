import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './dist/db/schema.js'; // wait, need correct path. Maybe use raw libsql?
