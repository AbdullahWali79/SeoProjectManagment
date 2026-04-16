import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import { all, getDb, getOne, persistDb, run, runBatch } from "@/lib/db";
import type { AppRole } from "@/lib/auth";
import { type TaskWorkflowStatus } from "@/lib/task-workflow";

export type DashboardTaskRow = {
  id: string;
  projectName: string;
  strategyTitle: string | null;
  title: string;
  status: string;
  priority: string;
  assigneeName: string;
  dueDate: string | null;
  estimatedHours: number;
  actualHours: number;
  resultNote: string;
  currentBlockers: string;
};

export type AdminDailyReportRow = {
  id: string;
  reportDate: string;
  totalHours: number;
  summary: string;
  nextSteps: string;
  userName: string;
  projectName: string;
};

export type AdminProjectRow = {
  id: string;
  name: string;
  clientName: string;
  sourceChannel: string;
  status: string;
  displayStatus: string;
  dueDate: string | null;
  summary: string;
  totalTasks: number;
  completedTasks: number | null;
  activeTasks: number | null;
  blockedTasks: number | null;
  overdueTasks: number | null;
};

export type ArchivedProjectRow = {
  id: string;
  name: string;
  clientName: string;
  archivedAt: string | null;
  totalTasks: number;
};

export type AdminEmployeeWorkloadRow = {
  id: string;
  fullName: string;
  email: string;
  activeTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  activeProjects: number;
  queuedHours: number;
  reportCount: number;
  reportHours: number;
};

export type AdminTaskAlertRow = {
  id: string;
  title: string;
  projectName: string;
  assigneeName: string;
  priority: string;
  dueDate: string | null;
  resultNote: string;
  blockers?: string;
};

export type AdminReportMonitorRow = {
  id: string;
  fullName: string;
  email: string;
  reportCount: number;
  totalHours: number;
  projectNames: string | null;
  status: "submitted" | "missing";
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function ensureProjectSchema() {
  const db = await getDb();
  const columns = all<{ name: string }>(db, "PRAGMA table_info(projects)");
  const names = new Set(columns.map((column) => String(column.name)));

  const statements: string[] = [];

  if (!names.has("is_archived")) {
    statements.push("ALTER TABLE projects ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0");
  }

  if (!names.has("archived_at")) {
    statements.push("ALTER TABLE projects ADD COLUMN archived_at TEXT");
  }

  if (!names.has("updated_at")) {
    statements.push("ALTER TABLE projects ADD COLUMN updated_at TEXT");
  }

  for (const statement of statements) {
    await run(db, statement);
  }

  if (!names.has("updated_at")) {
    await run(
      db,
      `
        UPDATE projects
        SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
        WHERE updated_at IS NULL
      `,
    );
  }

  return db;
}

async function ensureTaskWorkflowSchema(db: Awaited<ReturnType<typeof getDb>>) {
  const taskColumns = all<{ name: string }>(db, "PRAGMA table_info(tasks)");
  const taskColumnNames = new Set(taskColumns.map((column) => String(column.name)));
  const taskTableSql =
    getOne<{ sql: string }>(db, "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")?.sql ?? "";
  const taskUpdateTableSql =
    getOne<{ sql: string }>(db, "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'task_updates'")?.sql ??
    "";

  const needsTaskWorkflowMigration =
    !taskTableSql ||
    taskTableSql.includes("'blocked'") ||
    taskTableSql.includes("'done'") ||
    !taskTableSql.includes("'backlog'") ||
    !taskTableSql.includes("'completed'");
  const needsTaskUpdateWorkflowMigration =
    !taskUpdateTableSql ||
    taskUpdateTableSql.includes("'blocked'") ||
    taskUpdateTableSql.includes("'done'") ||
    !taskUpdateTableSql.includes("'backlog'") ||
    !taskUpdateTableSql.includes("'completed'");
  const needsCurrentBlockers = !taskColumnNames.has("current_blockers");

  if (!needsTaskWorkflowMigration && !needsTaskUpdateWorkflowMigration && !needsCurrentBlockers) {
    return;
  }

  const latestLegacyBlockerSql = `
    (
      SELECT tu.blockers
      FROM task_updates_legacy tu
      WHERE tu.task_id = tasks_legacy.id
        AND TRIM(tu.blockers) != ''
      ORDER BY tu.created_at DESC
      LIMIT 1
    )
  `;
  const currentBlockersSelect = taskColumnNames.has("current_blockers")
    ? `
        COALESCE(
          NULLIF(TRIM(tasks_legacy.current_blockers), ''),
          ${latestLegacyBlockerSql},
          CASE
            WHEN tasks_legacy.status = 'blocked' THEN 'Blocked without detail saved.'
            ELSE ''
          END
        )
      `
    : `
        COALESCE(
          ${latestLegacyBlockerSql},
          CASE
            WHEN tasks_legacy.status = 'blocked' THEN 'Blocked without detail saved.'
            ELSE ''
          END
        )
      `;

  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("BEGIN");

  try {
    db.exec("ALTER TABLE task_updates RENAME TO task_updates_legacy");
    db.exec("ALTER TABLE tasks RENAME TO tasks_legacy");

    db.exec(`
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        strategy_id TEXT REFERENCES strategies(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT NOT NULL CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'completed')),
        assignee_id TEXT NOT NULL REFERENCES users(id),
        estimated_hours REAL NOT NULL DEFAULT 0,
        actual_hours REAL NOT NULL DEFAULT 0,
        due_date TEXT,
        result_note TEXT NOT NULL DEFAULT '',
        current_blockers TEXT NOT NULL DEFAULT '',
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE task_updates (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id),
        status TEXT NOT NULL CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'completed')),
        time_spent_hours REAL NOT NULL DEFAULT 0,
        outcome TEXT NOT NULL DEFAULT '',
        blockers TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      INSERT INTO tasks (
        id,
        project_id,
        strategy_id,
        title,
        description,
        priority,
        status,
        assignee_id,
        estimated_hours,
        actual_hours,
        due_date,
        result_note,
        current_blockers,
        created_by,
        created_at,
        updated_at
      )
      SELECT
        tasks_legacy.id,
        tasks_legacy.project_id,
        tasks_legacy.strategy_id,
        tasks_legacy.title,
        tasks_legacy.description,
        tasks_legacy.priority,
        CASE tasks_legacy.status
          WHEN 'done' THEN 'completed'
          WHEN 'blocked' THEN 'in_progress'
          ELSE tasks_legacy.status
        END,
        tasks_legacy.assignee_id,
        tasks_legacy.estimated_hours,
        tasks_legacy.actual_hours,
        tasks_legacy.due_date,
        tasks_legacy.result_note,
        ${currentBlockersSelect},
        tasks_legacy.created_by,
        tasks_legacy.created_at,
        tasks_legacy.updated_at
      FROM tasks_legacy
    `);

    db.exec(`
      INSERT INTO task_updates (
        id,
        task_id,
        user_id,
        status,
        time_spent_hours,
        outcome,
        blockers,
        created_at
      )
      SELECT
        task_updates_legacy.id,
        task_updates_legacy.task_id,
        task_updates_legacy.user_id,
        CASE task_updates_legacy.status
          WHEN 'done' THEN 'completed'
          WHEN 'blocked' THEN 'in_progress'
          ELSE task_updates_legacy.status
        END,
        task_updates_legacy.time_spent_hours,
        task_updates_legacy.outcome,
        task_updates_legacy.blockers,
        task_updates_legacy.created_at
      FROM task_updates_legacy
    `);

    db.exec("DROP TABLE task_updates_legacy");
    db.exec("DROP TABLE tasks_legacy");
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON task_updates(task_id)");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }

  await persistDb(db);
}

async function ensureAppSchema() {
  const db = await ensureProjectSchema();
  await ensureTaskWorkflowSchema(db);
  return db;
}

export async function getAdminDashboardData(reportDate?: string) {
  const db = await ensureProjectSchema();
  const currentDate = todayDate();

  const availableReportDates = all<{ reportDate: string }>(
    db,
    `
      SELECT DISTINCT dr.report_date AS reportDate
      FROM daily_reports dr
      INNER JOIN projects p ON p.id = dr.project_id
      WHERE IFNULL(p.is_archived, 0) = 0
      ORDER BY dr.report_date DESC
    `,
  ).map((row) => row.reportDate);

  const activeReportDate =
    reportDate && availableReportDates.includes(reportDate)
      ? reportDate
      : (availableReportDates[0] ?? currentDate);

  const reportDateOptions = availableReportDates.includes(activeReportDate)
    ? availableReportDates
    : [activeReportDate, ...availableReportDates];

  const stats = getOne<{
    totalProjects: number;
    openTasks: number;
    activeEmployees: number;
    todayHours: number;
    blockedTasks: number;
    overdueTasks: number;
    missingReports: number;
    archivedProjects: number;
  }>(
    db,
    `
      SELECT
        (SELECT COUNT(*) FROM projects WHERE IFNULL(is_archived, 0) = 0) AS totalProjects,
        (
          SELECT COUNT(*)
          FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          WHERE t.status != 'done' AND IFNULL(p.is_archived, 0) = 0
        ) AS openTasks,
        (SELECT COUNT(*) FROM users WHERE role = 'employee' AND is_active = 1) AS activeEmployees,
        (
          SELECT IFNULL(SUM(dr.total_hours), 0)
          FROM daily_reports dr
          INNER JOIN projects p ON p.id = dr.project_id
          WHERE dr.report_date = ? AND IFNULL(p.is_archived, 0) = 0
        ) AS todayHours,
        (
          SELECT COUNT(*)
          FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          WHERE t.status = 'blocked' AND IFNULL(p.is_archived, 0) = 0
        ) AS blockedTasks,
        (
          SELECT COUNT(*)
          FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          WHERE t.status != 'done'
            AND t.due_date IS NOT NULL
            AND t.due_date < ?
            AND IFNULL(p.is_archived, 0) = 0
        ) AS overdueTasks,
        (
          (SELECT COUNT(*) FROM users WHERE role = 'employee' AND is_active = 1)
          -
          (
            SELECT COUNT(DISTINCT dr.user_id)
            FROM daily_reports dr
            INNER JOIN projects p ON p.id = dr.project_id
            WHERE dr.report_date = ? AND IFNULL(p.is_archived, 0) = 0
          )
        ) AS missingReports,
        (SELECT COUNT(*) FROM projects WHERE IFNULL(is_archived, 0) = 1) AS archivedProjects
    `,
    [currentDate, currentDate, activeReportDate],
  ) ?? {
    totalProjects: 0,
    openTasks: 0,
    activeEmployees: 0,
    todayHours: 0,
    blockedTasks: 0,
    overdueTasks: 0,
    missingReports: 0,
    archivedProjects: 0,
  };

  const projects = all<AdminProjectRow>(
    db,
    `
      SELECT
        p.id,
        p.name,
        p.client_name AS clientName,
        p.source_channel AS sourceChannel,
        p.status,
        CASE
          WHEN p.status != 'done' AND p.due_date IS NOT NULL AND p.due_date < ? THEN 'overdue'
          ELSE p.status
        END AS displayStatus,
        p.due_date AS dueDate,
        p.summary,
        COUNT(t.id) AS totalTasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completedTasks,
        SUM(CASE WHEN t.status != 'done' THEN 1 ELSE 0 END) AS activeTasks,
        SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END) AS blockedTasks
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE IFNULL(p.is_archived, 0) = 0
      GROUP BY p.id
      ORDER BY
        CASE
          WHEN p.status != 'done' AND p.due_date IS NOT NULL AND p.due_date < ? THEN 0
          WHEN p.status = 'active' THEN 1
          WHEN p.status = 'review' THEN 2
          WHEN p.status = 'planning' THEN 3
          ELSE 4
        END,
        p.due_date ASC,
        p.created_at DESC
    `,
    [currentDate, currentDate],
  );

  const archivedProjects = all<ArchivedProjectRow>(
    db,
    `
      SELECT
        p.id,
        p.name,
        p.client_name AS clientName,
        p.archived_at AS archivedAt,
        COUNT(t.id) AS totalTasks
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE IFNULL(p.is_archived, 0) = 1
      GROUP BY p.id
      ORDER BY p.archived_at DESC, p.created_at DESC
    `,
  );

  const employees = all<{ id: string; fullName: string; email: string; role: AppRole }>(
    db,
    `
      SELECT id, full_name AS fullName, email, role
      FROM users
      WHERE is_active = 1
      ORDER BY role ASC, full_name ASC
    `,
  );

  const strategies = all<{ id: string; title: string; projectId: string; projectName: string }>(
    db,
    `
      SELECT s.id, s.title, s.project_id AS projectId, p.name AS projectName
      FROM strategies s
      INNER JOIN projects p ON p.id = s.project_id
      WHERE IFNULL(p.is_archived, 0) = 0
      ORDER BY s.created_at DESC
    `,
  );

  const tasks = all<DashboardTaskRow>(
    db,
    `
      SELECT
        t.id,
        p.name AS projectName,
        s.title AS strategyTitle,
        t.title,
        t.status,
        t.priority,
        u.full_name AS assigneeName,
        t.due_date AS dueDate,
        t.estimated_hours AS estimatedHours,
        t.actual_hours AS actualHours,
        t.result_note AS resultNote
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      LEFT JOIN strategies s ON s.id = t.strategy_id
      INNER JOIN users u ON u.id = t.assignee_id
      WHERE IFNULL(p.is_archived, 0) = 0
      ORDER BY CASE t.status
        WHEN 'blocked' THEN 0
        WHEN 'in_progress' THEN 1
        WHEN 'review' THEN 2
        WHEN 'todo' THEN 3
        ELSE 4
      END, t.due_date ASC
    `,
  );

  const updates = all<{
    id: string;
    createdAt: string;
    status: string;
    timeSpentHours: number;
    outcome: string;
    blockers: string;
    userName: string;
    taskTitle: string;
    projectName: string;
  }>(
    db,
    `
      SELECT
        tu.id,
        tu.created_at AS createdAt,
        tu.status,
        tu.time_spent_hours AS timeSpentHours,
        tu.outcome,
        tu.blockers,
        u.full_name AS userName,
        t.title AS taskTitle,
        p.name AS projectName
      FROM task_updates tu
      INNER JOIN users u ON u.id = tu.user_id
      INNER JOIN tasks t ON t.id = tu.task_id
      INNER JOIN projects p ON p.id = t.project_id
      WHERE IFNULL(p.is_archived, 0) = 0
      ORDER BY tu.created_at DESC
      LIMIT 10
    `,
  );

  const reportSummary = getOne<{
    totalHours: number;
    reportsCount: number;
    employeeCount: number;
    projectCount: number;
  }>(
    db,
    `
      SELECT
        IFNULL(SUM(dr.total_hours), 0) AS totalHours,
        COUNT(*) AS reportsCount,
        COUNT(DISTINCT dr.user_id) AS employeeCount,
        COUNT(DISTINCT dr.project_id) AS projectCount
      FROM daily_reports dr
      INNER JOIN projects p ON p.id = dr.project_id
      WHERE dr.report_date = ? AND IFNULL(p.is_archived, 0) = 0
    `,
    [activeReportDate],
  ) ?? {
    totalHours: 0,
    reportsCount: 0,
    employeeCount: 0,
    projectCount: 0,
  };

  const reports = all<AdminDailyReportRow>(
    db,
    `
      SELECT
        dr.id,
        dr.report_date AS reportDate,
        dr.total_hours AS totalHours,
        dr.summary,
        dr.next_steps AS nextSteps,
        u.full_name AS userName,
        p.name AS projectName
      FROM daily_reports dr
      INNER JOIN users u ON u.id = dr.user_id
      INNER JOIN projects p ON p.id = dr.project_id
      WHERE dr.report_date = ? AND IFNULL(p.is_archived, 0) = 0
      ORDER BY p.name ASC, u.full_name ASC
    `,
    [activeReportDate],
  );

  const workload = all<AdminEmployeeWorkloadRow>(
    db,
    `
      SELECT
        u.id,
        u.full_name AS fullName,
        u.email,
        (
          SELECT COUNT(*)
          FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          WHERE t.assignee_id = u.id
            AND t.status != 'done'
            AND IFNULL(p.is_archived, 0) = 0
        ) AS activeTasks,
        (
          SELECT COUNT(*)
          FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          WHERE t.assignee_id = u.id
            AND t.status = 'blocked'
            AND IFNULL(p.is_archived, 0) = 0
        ) AS blockedTasks,
        (
          SELECT COUNT(*)
          FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          WHERE t.assignee_id = u.id
            AND t.status != 'done'
            AND t.due_date IS NOT NULL
            AND t.due_date < ?
            AND IFNULL(p.is_archived, 0) = 0
        ) AS overdueTasks,
        (
          SELECT COUNT(DISTINCT t.project_id)
          FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          WHERE t.assignee_id = u.id
            AND t.status != 'done'
            AND IFNULL(p.is_archived, 0) = 0
        ) AS activeProjects,
        (
          SELECT IFNULL(SUM(t.estimated_hours), 0)
          FROM tasks t
          INNER JOIN projects p ON p.id = t.project_id
          WHERE t.assignee_id = u.id
            AND t.status != 'done'
            AND IFNULL(p.is_archived, 0) = 0
        ) AS queuedHours,
        (
          SELECT COUNT(*)
          FROM daily_reports dr
          INNER JOIN projects p ON p.id = dr.project_id
          WHERE dr.user_id = u.id
            AND dr.report_date = ?
            AND IFNULL(p.is_archived, 0) = 0
        ) AS reportCount,
        (
          SELECT IFNULL(SUM(dr.total_hours), 0)
          FROM daily_reports dr
          INNER JOIN projects p ON p.id = dr.project_id
          WHERE dr.user_id = u.id
            AND dr.report_date = ?
            AND IFNULL(p.is_archived, 0) = 0
        ) AS reportHours
      FROM users u
      WHERE u.role = 'employee' AND u.is_active = 1
      ORDER BY activeTasks DESC, blockedTasks DESC, overdueTasks DESC, u.full_name ASC
    `,
    [currentDate, activeReportDate, activeReportDate],
  );

  const overdueTasks = all<AdminTaskAlertRow>(
    db,
    `
      SELECT
        t.id,
        t.title,
        p.name AS projectName,
        u.full_name AS assigneeName,
        t.priority,
        t.due_date AS dueDate,
        t.result_note AS resultNote
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      INNER JOIN users u ON u.id = t.assignee_id
      WHERE t.status != 'done'
        AND t.due_date IS NOT NULL
        AND t.due_date < ?
        AND IFNULL(p.is_archived, 0) = 0
      ORDER BY t.due_date ASC, CASE t.priority
        WHEN 'urgent' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END
      LIMIT 8
    `,
    [currentDate],
  );

  const blockedTasks = all<AdminTaskAlertRow>(
    db,
    `
      SELECT
        t.id,
        t.title,
        p.name AS projectName,
        u.full_name AS assigneeName,
        t.priority,
        t.due_date AS dueDate,
        t.result_note AS resultNote,
        COALESCE(
          (
            SELECT tu.blockers
            FROM task_updates tu
            WHERE tu.task_id = t.id AND tu.blockers != ''
            ORDER BY tu.created_at DESC
            LIMIT 1
          ),
          'No blocker detail saved yet.'
        ) AS blockers
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      INNER JOIN users u ON u.id = t.assignee_id
      WHERE t.status = 'blocked'
        AND IFNULL(p.is_archived, 0) = 0
      ORDER BY t.due_date ASC, t.updated_at DESC
      LIMIT 8
    `,
  );

  const reportMonitor: AdminReportMonitorRow[] = all<Omit<AdminReportMonitorRow, "status">>(
    db,
    `
      SELECT
        u.id,
        u.full_name AS fullName,
        u.email,
        (
          SELECT COUNT(*)
          FROM daily_reports dr
          INNER JOIN projects p ON p.id = dr.project_id
          WHERE dr.user_id = u.id
            AND dr.report_date = ?
            AND IFNULL(p.is_archived, 0) = 0
        ) AS reportCount,
        (
          SELECT IFNULL(SUM(dr.total_hours), 0)
          FROM daily_reports dr
          INNER JOIN projects p ON p.id = dr.project_id
          WHERE dr.user_id = u.id
            AND dr.report_date = ?
            AND IFNULL(p.is_archived, 0) = 0
        ) AS totalHours,
        (
          SELECT GROUP_CONCAT(projectName, ', ')
          FROM (
            SELECT DISTINCT p.name AS projectName
            FROM daily_reports dr
            INNER JOIN projects p ON p.id = dr.project_id
            WHERE dr.user_id = u.id
              AND dr.report_date = ?
              AND IFNULL(p.is_archived, 0) = 0
            ORDER BY p.name ASC
          )
        ) AS projectNames
      FROM users u
      WHERE u.role = 'employee' AND u.is_active = 1
      ORDER BY u.full_name ASC
    `,
    [activeReportDate, activeReportDate, activeReportDate],
  ).map((row) => ({
    ...row,
    status: (row.reportCount > 0 ? "submitted" : "missing") as AdminReportMonitorRow["status"],
  })).sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "missing" ? -1 : 1;
    }

    return left.fullName.localeCompare(right.fullName);
  });

  return {
    stats,
    projects,
    archivedProjects,
    employees,
    strategies,
    tasks,
    updates,
    reports,
    workload,
    overdueTasks,
    blockedTasks,
    reportMonitor,
    activeReportDate,
    availableReportDates: reportDateOptions,
    reportSummary,
  };
}

export async function getEmployeeDashboardData(userId: string) {
  const db = await ensureProjectSchema();

  const tasks = all<{
    id: string;
    projectName: string;
    strategyTitle: string | null;
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string | null;
    estimatedHours: number;
    actualHours: number;
    resultNote: string;
  }>(
    db,
    `
      SELECT
        t.id,
        p.name AS projectName,
        s.title AS strategyTitle,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date AS dueDate,
        t.estimated_hours AS estimatedHours,
        t.actual_hours AS actualHours,
        t.result_note AS resultNote
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      LEFT JOIN strategies s ON s.id = t.strategy_id
      WHERE t.assignee_id = ?
        AND IFNULL(p.is_archived, 0) = 0
      ORDER BY CASE t.status
        WHEN 'blocked' THEN 0
        WHEN 'in_progress' THEN 1
        WHEN 'review' THEN 2
        WHEN 'todo' THEN 3
        ELSE 4
      END, t.due_date ASC
    `,
    [userId],
  );

  const projectOptions = all<{ id: string; name: string }>(
    db,
    `
      SELECT DISTINCT p.id, p.name
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.assignee_id = ?
        AND IFNULL(p.is_archived, 0) = 0
      ORDER BY p.name ASC
    `,
    [userId],
  );

  const reports = all<{
    id: string;
    reportDate: string;
    summary: string;
    nextSteps: string;
    totalHours: number;
    projectName: string;
  }>(
    db,
    `
      SELECT
        dr.id,
        dr.report_date AS reportDate,
        dr.summary,
        dr.next_steps AS nextSteps,
        dr.total_hours AS totalHours,
        p.name AS projectName
      FROM daily_reports dr
      INNER JOIN projects p ON p.id = dr.project_id
      WHERE dr.user_id = ?
        AND IFNULL(p.is_archived, 0) = 0
      ORDER BY dr.report_date DESC, dr.created_at DESC
    `,
    [userId],
  );

  return { tasks, projectOptions, reports };
}

export async function createUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: AppRole;
}) {
  const db = await getDb();
  const passwordHash = bcrypt.hashSync(input.password, 10);

  await run(
    db,
    `
      INSERT INTO users (id, full_name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `,
    [crypto.randomUUID(), input.fullName, input.email.toLowerCase(), passwordHash, input.role],
  );
}

export async function createProject(input: {
  name: string;
  clientName: string;
  sourceChannel: string;
  status: "planning" | "active" | "review" | "done";
  dueDate: string | null;
  summary: string;
  createdBy: string;
}) {
  const db = await ensureProjectSchema();

  await run(
    db,
    `
      INSERT INTO projects (id, name, client_name, source_channel, status, due_date, summary, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      crypto.randomUUID(),
      input.name,
      input.clientName,
      input.sourceChannel,
      input.status,
      input.dueDate,
      input.summary,
      input.createdBy,
    ],
  );
}

export async function updateProject(input: {
  projectId: string;
  name: string;
  clientName: string;
  sourceChannel: string;
  status: "planning" | "active" | "review" | "done";
  dueDate: string | null;
  summary: string;
}) {
  const db = await ensureProjectSchema();
  const project = getOne<{ id: string }>(db, "SELECT id FROM projects WHERE id = ?", [input.projectId]);

  if (!project) {
    throw new Error("Project not found.");
  }

  await run(
    db,
    `
      UPDATE projects
      SET
        name = ?,
        client_name = ?,
        source_channel = ?,
        status = ?,
        due_date = ?,
        summary = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      input.name,
      input.clientName,
      input.sourceChannel,
      input.status,
      input.dueDate,
      input.summary,
      input.projectId,
    ],
  );
}

export async function setProjectArchivedState(input: {
  projectId: string;
  archived: boolean;
}) {
  const db = await ensureProjectSchema();
  const project = getOne<{ id: string }>(db, "SELECT id FROM projects WHERE id = ?", [input.projectId]);

  if (!project) {
    throw new Error("Project not found.");
  }

  await run(
    db,
    `
      UPDATE projects
      SET
        is_archived = ?,
        archived_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      input.archived ? 1 : 0,
      input.archived ? new Date().toISOString() : null,
      input.projectId,
    ],
  );
}

export async function deleteProjectPermanently(projectId: string) {
  const db = await ensureProjectSchema();
  const project = getOne<{ id: string; is_archived: number }>(
    db,
    "SELECT id, IFNULL(is_archived, 0) AS is_archived FROM projects WHERE id = ?",
    [projectId],
  );

  if (!project) {
    throw new Error("Project not found.");
  }

  if (!project.is_archived) {
    throw new Error("Archive the project before deleting it permanently.");
  }

  await runBatch(db, [
    {
      sql: `
        DELETE FROM task_updates
        WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)
      `,
      params: [projectId],
    },
    {
      sql: "DELETE FROM daily_reports WHERE project_id = ?",
      params: [projectId],
    },
    {
      sql: "DELETE FROM tasks WHERE project_id = ?",
      params: [projectId],
    },
    {
      sql: "DELETE FROM strategies WHERE project_id = ?",
      params: [projectId],
    },
    {
      sql: "DELETE FROM projects WHERE id = ?",
      params: [projectId],
    },
  ]);
}

export async function createStrategy(input: {
  projectId: string;
  title: string;
  summary: string;
  objective: string;
  createdBy: string;
}) {
  const db = await getDb();

  await run(
    db,
    `
      INSERT INTO strategies (id, project_id, title, summary, objective, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      crypto.randomUUID(),
      input.projectId,
      input.title,
      input.summary,
      input.objective,
      input.createdBy,
    ],
  );
}

export async function createTask(input: {
  projectId: string;
  strategyId: string | null;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "blocked" | "review" | "done";
  assigneeId: string;
  estimatedHours: number;
  dueDate: string | null;
  createdBy: string;
}) {
  const db = await getDb();

  await run(
    db,
    `
      INSERT INTO tasks (id, project_id, strategy_id, title, description, priority, status, assignee_id, estimated_hours, due_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      crypto.randomUUID(),
      input.projectId,
      input.strategyId,
      input.title,
      input.description,
      input.priority,
      input.status,
      input.assigneeId,
      input.estimatedHours,
      input.dueDate,
      input.createdBy,
    ],
  );
}

export async function updateTaskProgress(input: {
  taskId: string;
  userId: string;
  status: "todo" | "in_progress" | "blocked" | "review" | "done";
  timeSpentHours: number;
  outcome: string;
  blockers: string;
}) {
  const db = await getDb();
  const task = getOne<{ actual_hours: number }>(db, "SELECT actual_hours FROM tasks WHERE id = ?", [input.taskId]);

  if (!task) {
    throw new Error("Task not found.");
  }

  await runBatch(db, [
    {
      sql: `
        UPDATE tasks
        SET status = ?, actual_hours = ?, result_note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      params: [
        input.status,
        Number((Number(task.actual_hours || 0) + input.timeSpentHours).toFixed(2)),
        input.outcome,
        input.taskId,
      ],
    },
    {
      sql: `
        INSERT INTO task_updates (id, task_id, user_id, status, time_spent_hours, outcome, blockers)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        crypto.randomUUID(),
        input.taskId,
        input.userId,
        input.status,
        input.timeSpentHours,
        input.outcome,
        input.blockers,
      ],
    },
  ]);
}

export async function createDailyReport(input: {
  projectId: string;
  userId: string;
  reportDate: string;
  summary: string;
  nextSteps: string;
  totalHours: number;
}) {
  const db = await getDb();

  await run(
    db,
    `
      INSERT INTO daily_reports (id, project_id, user_id, report_date, summary, next_steps, total_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, user_id, report_date)
      DO UPDATE SET summary = excluded.summary, next_steps = excluded.next_steps, total_hours = excluded.total_hours
    `,
    [
      crypto.randomUUID(),
      input.projectId,
      input.userId,
      input.reportDate,
      input.summary,
      input.nextSteps,
      input.totalHours,
    ],
  );
}
