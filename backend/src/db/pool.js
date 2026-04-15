import pg from 'pg';

const { Pool, types } = pg;

// Return NUMERIC/DECIMAL as JS numbers instead of strings
types.setTypeParser(types.builtins.NUMERIC, parseFloat);
// Return INT8 (bigint) as JS numbers
types.setTypeParser(types.builtins.INT8, parseInt);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export default pool;
