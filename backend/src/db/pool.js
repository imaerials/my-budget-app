import pg from 'pg';

const { Pool, types } = pg;

// Return NUMERIC/DECIMAL as JS numbers instead of strings
types.setTypeParser(types.builtins.NUMERIC, parseFloat);
// Return INT8 (bigint) as JS numbers
types.setTypeParser(types.builtins.INT8, parseInt);
// Keep DATE as "YYYY-MM-DD" string — pg defaults to returning Date objects,
// which JSON-serialize to full ISO timestamps and break date parsing on the client.
types.setTypeParser(types.builtins.DATE, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export default pool;
