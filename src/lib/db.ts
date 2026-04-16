import { Pool, type PoolClient } from "pg";

export type QueryParam = string | number | boolean | null;
export type DbClient = Pool | PoolClient;

let pool: Pool | null = null;

function getConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    ""
  );
}

function needsSsl(connectionString: string) {
  return !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
}

export async function getDb() {
  if (pool) {
    return pool;
  }

  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "Database connection is not configured. Add DATABASE_URL in your environment variables before using Supabase/Postgres.",
    );
  }

  pool = new Pool({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });

  return pool;
}

export async function all<T>(db: DbClient, sql: string, params: QueryParam[] = []) {
  const result = await db.query(sql, params);
  return result.rows as T[];
}

export async function getOne<T>(db: DbClient, sql: string, params: QueryParam[] = []) {
  return (await all<T>(db, sql, params))[0];
}

export async function run(db: DbClient, sql: string, params: QueryParam[] = []) {
  await db.query(sql, params);
}

function isPool(db: DbClient): db is Pool {
  return "connect" in db;
}

export async function runBatch(
  db: DbClient,
  statements: Array<{ sql: string; params?: QueryParam[] }>,
) {
  if (isPool(db)) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      for (const statement of statements) {
        await client.query(statement.sql, statement.params ?? []);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  try {
    await db.query("BEGIN");
    for (const statement of statements) {
      await db.query(statement.sql, statement.params ?? []);
    }
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
