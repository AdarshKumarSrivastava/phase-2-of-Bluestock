import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ override: true });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

const tables = ['State', 'District', 'SubDistrict', 'Village'];

try {
  await client.connect();
  for (const table of tables) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    console.log(`${table}: ${result.rows[0].count}`);
  }
} finally {
  await client.end().catch(() => {});
}
