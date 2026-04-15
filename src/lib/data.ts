import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import { all, getDb, getOne, run, runBatch } from "@/lib/db";
import type { AppRole } from "@/lib/auth";

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

export async function getAdminDashboardData(reportDate?: string) {
  const db = await getDb();

  const stats = getOne<{
    totalProjects: number;
    openTasks: number;
    activeEmployees: number;
    todayHours: number;
  }>(
    db,
    `
      SELECT
        (SELECT COUNT(*) FROM projects) AS totalProjects,
        (SELECT COUNT(*) FROM tasks WHERE status != 'done') AS openTasks,
        (SELECT COUNT(*) FROM users WHERE role = 'employee' AND is_active = 1) AS activeEmployees,
        (SELECT IFNULL(SUM(total_hours), 0) FROM daily_reports WHERE report_date = date('now')) AS todayHours
    `,
  ) ?? { totalProjects: 0, openTasks: 0, activeEmployees: 0, todayHours: 0 };

  const projects = all<{
    id: string;
    name: string;
    clientName: string;
    sourceChannel: string;
    status: string;
    dueDate: string | null;
    summary: string;
    totalTasks: number;
    completedTasks: number | null;
  }>(
    db,
    `
      SELECT
        p.id,
        p.name,
        p.client_name AS clientName,
        p.source_channel AS sourceChannel,
        p.status,
        p.due_date AS dueDate,
        p.summary,
        COUNT(t.id) AS totalTasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completedTasks
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
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
      ORDER BY tu.created_at DESC
      LIMIT 10
    `,
  );

  const availableReportDates = all<{ reportDate: string }>(
    db,
    `
      SELECT DISTINCT report_date AS reportDate
      FROM daily_reports
      ORDER BY report_date DESC
    `,
  ).map((row) => row.reportDate);

  const activeReportDate =
    reportDate && availableReportDates.includes(reportDate)
      ? reportDate
      : (availableReportDates[0] ?? new Date().toISOString().slice(0, 10));

  const reportDateOptions = availableReportDates.includes(activeReportDate)
    ? availableReportDates
    : [activeReportDate, ...availableReportDates];

  const reportSummary = getOne<{
    totalHours: number;
    reportsCount: number;
    employeeCount: number;
    projectCount: number;
  }>(
    db,
    `
      SELECT
        IFNULL(SUM(total_hours), 0) AS totalHours,
        COUNT(*) AS reportsCount,
        COUNT(DISTINCT user_id) AS employeeCount,
        COUNT(DISTINCT project_id) AS projectCount
      FROM daily_reports
      WHERE report_date = ?
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
      WHERE dr.report_date = ?
      ORDER BY p.name ASC, u.full_name ASC
    `,
    [activeReportDate],
  );

  return {
    stats,
    projects,
    employees,
    strategies,
    tasks,
    updates,
    reports,
    activeReportDate,
    availableReportDates: reportDateOptions,
    reportSummary,
  };
}

export async function getEmployeeDashboardData(userId: string) {
  const db = await getDb();

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
  const db = await getDb();

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
