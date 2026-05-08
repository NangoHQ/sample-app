import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '../migrate.sql'), 'utf8');

try {
    await pool.query(sql);
    console.log('Migration complete');
} catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
} finally {
    await pool.end();
}
