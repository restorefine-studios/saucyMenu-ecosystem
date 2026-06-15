import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle({ client: pool, schema: { ...schema } });
// export const db = drizzle(process.env.DATABASE_URL!, { schema: { ...schema } });