async function run() {
  const pg = await import('pg');
  console.log('pg.Pool:', !!pg.Pool);
  console.log('pg.default?.Pool:', !!pg.default?.Pool);
  console.log('pg.default?.default?.Pool:', !!pg.default?.default?.Pool);
  
  const PoolClass = pg.Pool || pg.default?.Pool;
  const pool = new PoolClass();
  console.log('Pool instantiated successfully!');
  pool.end();
}
run().catch(console.error);
