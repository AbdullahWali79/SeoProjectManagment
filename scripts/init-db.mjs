import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import initSqlJs from "sql.js";

const dataDir = path.join(process.cwd(), "data");
const databasePath = path.join(dataDir, "app.db");

fs.mkdirSync(dataDir, { recursive: true });
const SQL = await initSqlJs({
  locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
});

const db = fs.existsSync(databasePath)
  ? new SQL.Database(new Uint8Array(fs.readFileSync(databasePath)))
  : new SQL.Database();

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planning', 'active', 'review', 'done')),
  due_date TEXT,
  summary TEXT NOT NULL,
  is_archived INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  objective TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  strategy_id TEXT REFERENCES strategies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'done')),
  assignee_id TEXT NOT NULL REFERENCES users(id),
  estimated_hours REAL NOT NULL DEFAULT 0,
  actual_hours REAL NOT NULL DEFAULT 0,
  due_date TEXT,
  result_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_updates (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'done')),
  time_spent_hours REAL NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT '',
  blockers TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  report_date TEXT NOT NULL,
  summary TEXT NOT NULL,
  next_steps TEXT NOT NULL,
  total_hours REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_id ON daily_reports(project_id);
`);

const projectColumnsResult = db.exec("PRAGMA table_info(projects);");
const projectColumns = new Set((projectColumnsResult[0]?.values ?? []).map((column) => String(column[1])));

if (!projectColumns.has("is_archived")) {
  db.exec("ALTER TABLE projects ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;");
}

if (!projectColumns.has("archived_at")) {
  db.exec("ALTER TABLE projects ADD COLUMN archived_at TEXT;");
}

if (!projectColumns.has("updated_at")) {
  db.exec("ALTER TABLE projects ADD COLUMN updated_at TEXT;");
  db.exec("UPDATE projects SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL;");
}

function getRow(sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const row = statement.step() ? statement.getAsObject() : undefined;
  statement.free();
  return row;
}

function run(sql, params = []) {
  db.run(sql, params);
}

const existingAdmin = getRow("SELECT id FROM users WHERE email = ?", ["admin@agency.local"]);

if (!existingAdmin?.id) {
  const insertUser = (id, fullName, email, passwordHash, role) =>
    run(
      `
        INSERT INTO users (id, full_name, email, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `,
      [id, fullName, email, passwordHash, role],
    );

  const adminId = crypto.randomUUID();
  const intern1Id = crypto.randomUUID();
  const intern2Id = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync("Passw0rd!", 10);

  insertUser(adminId, "Agency Admin", "admin@agency.local", passwordHash, "admin");
  insertUser(intern1Id, "Ali Intern", "ali@agency.local", passwordHash, "employee");
  insertUser(intern2Id, "Sara Intern", "sara@agency.local", passwordHash, "employee");

  const projectId = crypto.randomUUID();
  const strategyId = crypto.randomUUID();
  const task1Id = crypto.randomUUID();
  const task2Id = crypto.randomUUID();

  run(
    `
      INSERT INTO projects (id, name, client_name, source_channel, status, due_date, summary, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      projectId,
      "Maple Dental SEO Sprint",
      "Maple Dental",
      "Fiverr",
      "active",
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      "Local SEO project with citation cleanup, on-page updates, and Google Business Profile optimization.",
      adminId,
    ],
  );

  run(
    `
      INSERT INTO strategies (id, project_id, title, summary, objective, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      strategyId,
      projectId,
      "Local SEO Recovery Plan",
      "Fix local presence and improve calls from Google Maps and branded search.",
      "Clean citations, optimize location pages, and publish weekly GBP updates.",
      adminId,
    ],
  );

  run(
    `
      INSERT INTO tasks (id, project_id, strategy_id, title, description, priority, status, assignee_id, estimated_hours, actual_hours, due_date, result_note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      task1Id,
      projectId,
      strategyId,
      "Audit top 25 local citations",
      "Check NAP consistency, mark wrong listings, and prepare correction sheet.",
      "high",
      "in_progress",
      intern1Id,
      3,
      1.5,
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      "12 directories audited, 4 issues found.",
      adminId,
    ],
  );

  run(
    `
      INSERT INTO tasks (id, project_id, strategy_id, title, description, priority, status, assignee_id, estimated_hours, actual_hours, due_date, result_note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      task2Id,
      projectId,
      strategyId,
      "Write GBP weekly post",
      "Prepare a promotional Google Business Profile post with tracked CTA.",
      "medium",
      "todo",
      intern2Id,
      1.5,
      0,
      new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      "",
      adminId,
    ],
  );

  run(
    `
      INSERT INTO task_updates (id, task_id, user_id, status, time_spent_hours, outcome, blockers)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      crypto.randomUUID(),
      task1Id,
      intern1Id,
      "in_progress",
      1.5,
      "Spreadsheet prepared with current NAP data.",
      "Need client approval to fix two listings.",
    ],
  );

  run(
    `
      INSERT INTO daily_reports (id, project_id, user_id, report_date, summary, next_steps, total_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      crypto.randomUUID(),
      projectId,
      intern1Id,
      new Date().toISOString().slice(0, 10),
      "Citation audit started and inconsistencies documented.",
      "Finalize correction list and send to admin for review.",
      1.5,
    ],
  );
}

fs.writeFileSync(databasePath, Buffer.from(db.export()));
db.close();

console.log(`Database initialized at ${databasePath}`);
