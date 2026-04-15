import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type BindParams, type Database as SqlDatabase, type SqlJsStatic } from "sql.js";

export type QueryParam = string | number | null;

let sqlPromise: Promise<SqlJsStatic> | null = null;
let databasePromise: Promise<SqlDatabase> | null = null;

function getDatabasePath() {
  return path.join(process.cwd(), "data", "app.db");
}

async function getSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
  }

  return sqlPromise;
}

export async function getDb() {
  if (databasePromise) {
    return databasePromise;
  }

  const databasePath = getDatabasePath();
  if (!fs.existsSync(databasePath)) {
    throw new Error("Database not found. Run `npm run db:init` first.");
  }

  databasePromise = getSql().then((SQL) => {
    const file = fs.readFileSync(databasePath);
    return new SQL.Database(new Uint8Array(file));
  });

  return databasePromise;
}

export async function persistDb(db: SqlDatabase) {
  const databasePath = getDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.writeFileSync(databasePath, Buffer.from(db.export()));
}

export function all<T>(db: SqlDatabase, sql: string, params: BindParams = []): T[] {
  const statement = db.prepare(sql);
  statement.bind(params);
  const rows: T[] = [];

  while (statement.step()) {
    rows.push(statement.getAsObject() as T);
  }

  statement.free();
  return rows;
}

export function getOne<T>(db: SqlDatabase, sql: string, params: BindParams = []) {
  return all<T>(db, sql, params)[0];
}

export async function run(db: SqlDatabase, sql: string, params: BindParams = []) {
  db.run(sql, params);
  await persistDb(db);
}

export async function runBatch(
  db: SqlDatabase,
  statements: Array<{ sql: string; params?: BindParams }>,
) {
  db.exec("BEGIN");
  try {
    for (const statement of statements) {
      db.run(statement.sql, statement.params ?? []);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  await persistDb(db);
}
