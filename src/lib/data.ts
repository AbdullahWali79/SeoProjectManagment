import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import { all, getDb, getOne, run, runBatch } from "@/lib/db";
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

export async function getAdminDashboardData(reportDate?: string) {
  const db = await getDb();
  const currentDate = todayDate();

  const availableReportDates = (
    await all<{ reportDate: string }>(
      db,
      `
        SELECT DISTINCT dr.report_date::text AS "reportDate"
        FROM public.daily_reports dr
        INNER JOIN public.projects p ON p.id = dr.project_id
        WHERE NOT COALESCE(p.is_archived, false)
        ORDER BY dr.report_date DESC
      `,
    )
  ).map((row) => row.reportDate);

  const activeReportDate =
    reportDate && availableReportDates.includes(reportDate)
      ? reportDate
      : (availableReportDates[0] ?? currentDate);

  const reportDateOptions = availableReportDates.includes(activeReportDate)
    ? availableReportDates
    : [activeReportDate, ...availableReportDates];

  const stats =
    (await getOne<{
      totalProjects: number;
      openTasks: number;
      activeEmployees: number;
      todayHours: number;
      blockedTasks: number;
      overdueTasks: number;
      unassignedTasks: number;
      missingReports: number;
      archivedProjects: number;
    }>(
      db,
      `
        SELECT
          (SELECT COUNT(*)::int FROM public.projects WHERE NOT COALESCE(is_archived, false)) AS "totalProjects",
          (
            SELECT COUNT(*)::int
            FROM public.tasks t
            INNER JOIN public.projects p ON p.id = t.project_id
            WHERE t.status != 'completed'
              AND NOT COALESCE(p.is_archived, false)
          ) AS "openTasks",
          (
            SELECT COUNT(*)::int
            FROM public.users
            WHERE role = 'employee' AND is_active = true
          ) AS "activeEmployees",
          (
            SELECT COALESCE(SUM(dr.total_hours), 0)::float8
            FROM public.daily_reports dr
            INNER JOIN public.projects p ON p.id = dr.project_id
            WHERE dr.report_date = $1::date
              AND NOT COALESCE(p.is_archived, false)
          ) AS "todayHours",
          (
            SELECT COUNT(*)::int
            FROM public.tasks t
            INNER JOIN public.projects p ON p.id = t.project_id
            WHERE t.status != 'completed'
              AND TRIM(COALESCE(t.current_blockers, '')) != ''
              AND NOT COALESCE(p.is_archived, false)
          ) AS "blockedTasks",
          (
            SELECT COUNT(*)::int
            FROM public.tasks t
            INNER JOIN public.projects p ON p.id = t.project_id
            WHERE t.status != 'completed'
              AND t.due_date IS NOT NULL
              AND t.due_date < $2::date
              AND NOT COALESCE(p.is_archived, false)
          ) AS "overdueTasks",
          (
            SELECT COUNT(*)::int
            FROM public.tasks t
            INNER JOIN public.projects p ON p.id = t.project_id
            WHERE t.status != 'completed'
              AND t.assignee_id IS NULL
              AND NOT COALESCE(p.is_archived, false)
          ) AS "unassignedTasks",
          (
            (SELECT COUNT(*)::int FROM public.users WHERE role = 'employee' AND is_active = true)
            -
            (
              SELECT COUNT(DISTINCT dr.user_id)::int
              FROM public.daily_reports dr
              INNER JOIN public.projects p ON p.id = dr.project_id
              WHERE dr.report_date = $3::date
                AND NOT COALESCE(p.is_archived, false)
            )
          ) AS "missingReports",
          (
            SELECT COUNT(*)::int
            FROM public.projects
            WHERE COALESCE(is_archived, false)
          ) AS "archivedProjects"
      `,
      [currentDate, currentDate, activeReportDate],
    )) ?? {
      totalProjects: 0,
      openTasks: 0,
      activeEmployees: 0,
      todayHours: 0,
      blockedTasks: 0,
      overdueTasks: 0,
      unassignedTasks: 0,
      missingReports: 0,
      archivedProjects: 0,
    };

  const projects = await all<AdminProjectRow>(
    db,
    `
      SELECT
        p.id,
        p.name,
        p.client_name AS "clientName",
        p.source_channel AS "sourceChannel",
        p.status,
        CASE
          WHEN p.status != 'done' AND p.due_date IS NOT NULL AND p.due_date < $1::date THEN 'overdue'
          ELSE p.status
        END AS "displayStatus",
        p.due_date::text AS "dueDate",
        p.summary,
        COUNT(t.id)::int AS "totalTasks",
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0)::int AS "completedTasks",
        COALESCE(SUM(CASE WHEN t.status != 'completed' THEN 1 ELSE 0 END), 0)::int AS "activeTasks",
        COALESCE(
          SUM(CASE WHEN t.status != 'completed' AND TRIM(COALESCE(t.current_blockers, '')) != '' THEN 1 ELSE 0 END),
          0
        )::int AS "blockedTasks",
        COALESCE(
          SUM(CASE WHEN t.status != 'completed' AND t.due_date IS NOT NULL AND t.due_date < $2::date THEN 1 ELSE 0 END),
          0
        )::int AS "overdueTasks"
      FROM public.projects p
      LEFT JOIN public.tasks t ON t.project_id = p.id
      WHERE NOT COALESCE(p.is_archived, false)
      GROUP BY p.id
      ORDER BY
        CASE
          WHEN p.status != 'done' AND p.due_date IS NOT NULL AND p.due_date < $3::date THEN 0
          WHEN p.status = 'active' THEN 1
          WHEN p.status = 'review' THEN 2
          WHEN p.status = 'planning' THEN 3
          ELSE 4
        END,
        p.due_date ASC NULLS LAST,
        p.created_at DESC
    `,
    [currentDate, currentDate, currentDate],
  );

  const archivedProjects = await all<ArchivedProjectRow>(
    db,
    `
      SELECT
        p.id,
        p.name,
        p.client_name AS "clientName",
        p.archived_at::text AS "archivedAt",
        COUNT(t.id)::int AS "totalTasks"
      FROM public.projects p
      LEFT JOIN public.tasks t ON t.project_id = p.id
      WHERE COALESCE(p.is_archived, false)
      GROUP BY p.id
      ORDER BY p.archived_at DESC NULLS LAST, p.created_at DESC
    `,
  );

  const employees = await all<{ id: string; fullName: string; email: string; role: AppRole }>(
    db,
    `
      SELECT
        id,
        full_name AS "fullName",
        email,
        role
      FROM public.users
      WHERE is_active = true
      ORDER BY role ASC, full_name ASC
    `,
  );

  const strategies = await all<{ id: string; title: string; projectId: string; projectName: string }>(
    db,
    `
      SELECT
        s.id,
        s.title,
        s.project_id AS "projectId",
        p.name AS "projectName"
      FROM public.strategies s
      INNER JOIN public.projects p ON p.id = s.project_id
      WHERE NOT COALESCE(p.is_archived, false)
      ORDER BY s.created_at DESC
    `,
  );

  const tasks = await all<DashboardTaskRow>(
    db,
    `
      SELECT
        t.id,
        p.name AS "projectName",
        s.title AS "strategyTitle",
        t.title,
        t.status,
        t.priority,
        COALESCE(u.full_name, 'Unassigned') AS "assigneeName",
        t.due_date::text AS "dueDate",
        t.estimated_hours::float8 AS "estimatedHours",
        t.actual_hours::float8 AS "actualHours",
        t.result_note AS "resultNote",
        t.current_blockers AS "currentBlockers"
      FROM public.tasks t
      INNER JOIN public.projects p ON p.id = t.project_id
      LEFT JOIN public.strategies s ON s.id = t.strategy_id
      LEFT JOIN public.users u ON u.id = t.assignee_id
      WHERE NOT COALESCE(p.is_archived, false)
      ORDER BY
        CASE
          WHEN t.status != 'completed' AND TRIM(COALESCE(t.current_blockers, '')) != '' THEN 0
          WHEN t.status = 'in_progress' THEN 1
          WHEN t.status = 'review' THEN 2
          WHEN t.status = 'todo' THEN 3
          WHEN t.status = 'backlog' THEN 4
          ELSE 5
        END,
        t.due_date ASC NULLS LAST,
        t.updated_at DESC
    `,
  );

  const updates = await all<{
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
        tu.created_at::text AS "createdAt",
        tu.status,
        tu.time_spent_hours::float8 AS "timeSpentHours",
        tu.outcome,
        tu.blockers,
        u.full_name AS "userName",
        t.title AS "taskTitle",
        p.name AS "projectName"
      FROM public.task_updates tu
      INNER JOIN public.users u ON u.id = tu.user_id
      INNER JOIN public.tasks t ON t.id = tu.task_id
      INNER JOIN public.projects p ON p.id = t.project_id
      WHERE NOT COALESCE(p.is_archived, false)
      ORDER BY tu.created_at DESC
      LIMIT 10
    `,
  );

  const reportSummary =
    (await getOne<{
      totalHours: number;
      reportsCount: number;
      employeeCount: number;
      projectCount: number;
    }>(
      db,
      `
        SELECT
          COALESCE(SUM(dr.total_hours), 0)::float8 AS "totalHours",
          COUNT(*)::int AS "reportsCount",
          COUNT(DISTINCT dr.user_id)::int AS "employeeCount",
          COUNT(DISTINCT dr.project_id)::int AS "projectCount"
        FROM public.daily_reports dr
        INNER JOIN public.projects p ON p.id = dr.project_id
        WHERE dr.report_date = $1::date
          AND NOT COALESCE(p.is_archived, false)
      `,
      [activeReportDate],
    )) ?? {
      totalHours: 0,
      reportsCount: 0,
      employeeCount: 0,
      projectCount: 0,
    };

  const reports = await all<AdminDailyReportRow>(
    db,
    `
      SELECT
        dr.id,
        dr.report_date::text AS "reportDate",
        dr.total_hours::float8 AS "totalHours",
        dr.summary,
        dr.next_steps AS "nextSteps",
        u.full_name AS "userName",
        p.name AS "projectName"
      FROM public.daily_reports dr
      INNER JOIN public.users u ON u.id = dr.user_id
      INNER JOIN public.projects p ON p.id = dr.project_id
      WHERE dr.report_date = $1::date
        AND NOT COALESCE(p.is_archived, false)
      ORDER BY p.name ASC, u.full_name ASC
    `,
    [activeReportDate],
  );

  const workload = await all<AdminEmployeeWorkloadRow>(
    db,
    `
      SELECT
        u.id,
        u.full_name AS "fullName",
        u.email,
        (
          SELECT COUNT(*)::int
          FROM public.tasks t
          INNER JOIN public.projects p ON p.id = t.project_id
          WHERE t.assignee_id = u.id
            AND t.status != 'completed'
            AND NOT COALESCE(p.is_archived, false)
        ) AS "activeTasks",
        (
          SELECT COUNT(*)::int
          FROM public.tasks t
          INNER JOIN public.projects p ON p.id = t.project_id
          WHERE t.assignee_id = u.id
            AND t.status != 'completed'
            AND TRIM(COALESCE(t.current_blockers, '')) != ''
            AND NOT COALESCE(p.is_archived, false)
        ) AS "blockedTasks",
        (
          SELECT COUNT(*)::int
          FROM public.tasks t
          INNER JOIN public.projects p ON p.id = t.project_id
          WHERE t.assignee_id = u.id
            AND t.status != 'completed'
            AND t.due_date IS NOT NULL
            AND t.due_date < $1::date
            AND NOT COALESCE(p.is_archived, false)
        ) AS "overdueTasks",
        (
          SELECT COUNT(DISTINCT t.project_id)::int
          FROM public.tasks t
          INNER JOIN public.projects p ON p.id = t.project_id
          WHERE t.assignee_id = u.id
            AND t.status != 'completed'
            AND NOT COALESCE(p.is_archived, false)
        ) AS "activeProjects",
        (
          SELECT COALESCE(SUM(t.estimated_hours), 0)::float8
          FROM public.tasks t
          INNER JOIN public.projects p ON p.id = t.project_id
          WHERE t.assignee_id = u.id
            AND t.status != 'completed'
            AND NOT COALESCE(p.is_archived, false)
        ) AS "queuedHours",
        (
          SELECT COUNT(*)::int
          FROM public.daily_reports dr
          INNER JOIN public.projects p ON p.id = dr.project_id
          WHERE dr.user_id = u.id
            AND dr.report_date = $2::date
            AND NOT COALESCE(p.is_archived, false)
        ) AS "reportCount",
        (
          SELECT COALESCE(SUM(dr.total_hours), 0)::float8
          FROM public.daily_reports dr
          INNER JOIN public.projects p ON p.id = dr.project_id
          WHERE dr.user_id = u.id
            AND dr.report_date = $3::date
            AND NOT COALESCE(p.is_archived, false)
        ) AS "reportHours"
      FROM public.users u
      WHERE u.role = 'employee'
        AND u.is_active = true
      ORDER BY "activeTasks" DESC, "blockedTasks" DESC, "overdueTasks" DESC, u.full_name ASC
    `,
    [currentDate, activeReportDate, activeReportDate],
  );

  const overdueTasks = await all<AdminTaskAlertRow>(
    db,
    `
      SELECT
        t.id,
        t.title,
        p.name AS "projectName",
        COALESCE(u.full_name, 'Unassigned') AS "assigneeName",
        t.priority,
        t.due_date::text AS "dueDate",
        t.result_note AS "resultNote"
      FROM public.tasks t
      INNER JOIN public.projects p ON p.id = t.project_id
      LEFT JOIN public.users u ON u.id = t.assignee_id
      WHERE t.status != 'completed'
        AND t.due_date IS NOT NULL
        AND t.due_date < $1::date
        AND NOT COALESCE(p.is_archived, false)
      ORDER BY
        t.due_date ASC,
        CASE t.priority
          WHEN 'urgent' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END
      LIMIT 8
    `,
    [currentDate],
  );

  const blockedTasks = await all<AdminTaskAlertRow>(
    db,
    `
      SELECT
        t.id,
        t.title,
        p.name AS "projectName",
        COALESCE(u.full_name, 'Unassigned') AS "assigneeName",
        t.priority,
        t.due_date::text AS "dueDate",
        t.result_note AS "resultNote",
        t.current_blockers AS blockers
      FROM public.tasks t
      INNER JOIN public.projects p ON p.id = t.project_id
      LEFT JOIN public.users u ON u.id = t.assignee_id
      WHERE t.status != 'completed'
        AND TRIM(COALESCE(t.current_blockers, '')) != ''
        AND NOT COALESCE(p.is_archived, false)
      ORDER BY t.due_date ASC NULLS LAST, t.updated_at DESC
      LIMIT 8
    `,
  );

  const unassignedTasks = await all<AdminTaskAlertRow>(
    db,
    `
      SELECT
        t.id,
        t.title,
        p.name AS "projectName",
        'Unassigned' AS "assigneeName",
        t.priority,
        t.due_date::text AS "dueDate",
        t.result_note AS "resultNote",
        t.current_blockers AS blockers
      FROM public.tasks t
      INNER JOIN public.projects p ON p.id = t.project_id
      WHERE t.status != 'completed'
        AND t.assignee_id IS NULL
        AND NOT COALESCE(p.is_archived, false)
      ORDER BY
        CASE t.priority
          WHEN 'urgent' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        t.created_at DESC
      LIMIT 8
    `,
  );

  const reportMonitorRows = await all<Omit<AdminReportMonitorRow, "status">>(
    db,
    `
      SELECT
        u.id,
        u.full_name AS "fullName",
        u.email,
        (
          SELECT COUNT(*)::int
          FROM public.daily_reports dr
          INNER JOIN public.projects p ON p.id = dr.project_id
          WHERE dr.user_id = u.id
            AND dr.report_date = $1::date
            AND NOT COALESCE(p.is_archived, false)
        ) AS "reportCount",
        (
          SELECT COALESCE(SUM(dr.total_hours), 0)::float8
          FROM public.daily_reports dr
          INNER JOIN public.projects p ON p.id = dr.project_id
          WHERE dr.user_id = u.id
            AND dr.report_date = $2::date
            AND NOT COALESCE(p.is_archived, false)
        ) AS "totalHours",
        (
          SELECT STRING_AGG(project_name, ', ')
          FROM (
            SELECT DISTINCT p.name AS project_name
            FROM public.daily_reports dr
            INNER JOIN public.projects p ON p.id = dr.project_id
            WHERE dr.user_id = u.id
              AND dr.report_date = $3::date
              AND NOT COALESCE(p.is_archived, false)
            ORDER BY p.name ASC
          ) project_names
        ) AS "projectNames"
      FROM public.users u
      WHERE u.role = 'employee'
        AND u.is_active = true
      ORDER BY u.full_name ASC
    `,
    [activeReportDate, activeReportDate, activeReportDate],
  );

  const reportMonitor: AdminReportMonitorRow[] = reportMonitorRows
    .map((row) => ({
      ...row,
      status: (row.reportCount > 0 ? "submitted" : "missing") as AdminReportMonitorRow["status"],
    }))
    .sort((left, right) => {
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
    unassignedTasks,
    reportMonitor,
    activeReportDate,
    availableReportDates: reportDateOptions,
    reportSummary,
  };
}

export async function getEmployeeDashboardData(userId: string) {
  const db = await getDb();

  const tasks = await all<{
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
    currentBlockers: string;
  }>(
    db,
    `
      SELECT
        t.id,
        p.name AS "projectName",
        s.title AS "strategyTitle",
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date::text AS "dueDate",
        t.estimated_hours::float8 AS "estimatedHours",
        t.actual_hours::float8 AS "actualHours",
        t.result_note AS "resultNote",
        t.current_blockers AS "currentBlockers"
      FROM public.tasks t
      INNER JOIN public.projects p ON p.id = t.project_id
      LEFT JOIN public.strategies s ON s.id = t.strategy_id
      WHERE t.assignee_id = $1::uuid
        AND NOT COALESCE(p.is_archived, false)
      ORDER BY
        CASE
          WHEN t.status != 'completed' AND TRIM(COALESCE(t.current_blockers, '')) != '' THEN 0
          WHEN t.status = 'in_progress' THEN 1
          WHEN t.status = 'review' THEN 2
          WHEN t.status = 'todo' THEN 3
          WHEN t.status = 'backlog' THEN 4
          ELSE 5
        END,
        t.due_date ASC NULLS LAST,
        t.updated_at DESC
    `,
    [userId],
  );

  const projectOptions = await all<{ id: string; name: string }>(
    db,
    `
      SELECT DISTINCT p.id, p.name
      FROM public.tasks t
      INNER JOIN public.projects p ON p.id = t.project_id
      WHERE t.assignee_id = $1::uuid
        AND NOT COALESCE(p.is_archived, false)
      ORDER BY p.name ASC
    `,
    [userId],
  );

  const reports = await all<{
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
        dr.report_date::text AS "reportDate",
        dr.summary,
        dr.next_steps AS "nextSteps",
        dr.total_hours::float8 AS "totalHours",
        p.name AS "projectName"
      FROM public.daily_reports dr
      INNER JOIN public.projects p ON p.id = dr.project_id
      WHERE dr.user_id = $1::uuid
        AND NOT COALESCE(p.is_archived, false)
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
      INSERT INTO public.users (id, full_name, email, password_hash, role)
      VALUES ($1::uuid, $2, $3, $4, $5)
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
      INSERT INTO public.projects (
        id,
        name,
        client_name,
        source_channel,
        status,
        due_date,
        summary,
        created_by
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7, $8::uuid)
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
  const db = await getDb();
  const project = await getOne<{ id: string }>(
    db,
    "SELECT id FROM public.projects WHERE id = $1::uuid",
    [input.projectId],
  );

  if (!project) {
    throw new Error("Project not found.");
  }

  await run(
    db,
    `
      UPDATE public.projects
      SET
        name = $1,
        client_name = $2,
        source_channel = $3,
        status = $4,
        due_date = $5::date,
        summary = $6,
        updated_at = now()
      WHERE id = $7::uuid
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
  const db = await getDb();
  const project = await getOne<{ id: string }>(
    db,
    "SELECT id FROM public.projects WHERE id = $1::uuid",
    [input.projectId],
  );

  if (!project) {
    throw new Error("Project not found.");
  }

  await run(
    db,
    `
      UPDATE public.projects
      SET
        is_archived = $1,
        archived_at = $2::timestamptz,
        updated_at = now()
      WHERE id = $3::uuid
    `,
    [input.archived, input.archived ? new Date().toISOString() : null, input.projectId],
  );
}

export async function deleteProjectPermanently(projectId: string) {
  const db = await getDb();
  const project = await getOne<{ id: string; is_archived: boolean }>(
    db,
    `
      SELECT id, COALESCE(is_archived, false) AS is_archived
      FROM public.projects
      WHERE id = $1::uuid
    `,
    [projectId],
  );

  if (!project) {
    throw new Error("Project not found.");
  }

  if (!project.is_archived) {
    throw new Error("Archive the project before deleting it permanently.");
  }

  await run(db, "DELETE FROM public.projects WHERE id = $1::uuid", [projectId]);
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
      INSERT INTO public.strategies (id, project_id, title, summary, objective, created_by)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::uuid)
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
  status: TaskWorkflowStatus;
  assigneeId: string | null;
  estimatedHours: number;
  dueDate: string | null;
  createdBy: string;
}) {
  const db = await getDb();

  await run(
    db,
    `
      INSERT INTO public.tasks (
        id,
        project_id,
        strategy_id,
        title,
        description,
        priority,
        status,
        assignee_id,
        estimated_hours,
        due_date,
        current_blockers,
        created_by
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8::uuid, $9::float8, $10::date, $11, $12::uuid)
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
      "",
      input.createdBy,
    ],
  );
}

export async function updateTaskProgress(input: {
  taskId: string;
  userId: string;
  status: TaskWorkflowStatus;
  timeSpentHours: number;
  outcome: string;
  blockers: string;
}) {
  const db = await getDb();
  const task = await getOne<{ actual_hours: number }>(
    db,
    "SELECT actual_hours::float8 AS actual_hours FROM public.tasks WHERE id = $1::uuid",
    [input.taskId],
  );

  if (!task) {
    throw new Error("Task not found.");
  }

  const currentBlockers = input.status === "completed" ? "" : input.blockers.trim();

  await runBatch(db, [
    {
      sql: `
        UPDATE public.tasks
        SET
          status = $1,
          actual_hours = $2::float8,
          result_note = $3,
          current_blockers = $4,
          updated_at = now()
        WHERE id = $5::uuid
      `,
      params: [
        input.status,
        Number((Number(task.actual_hours || 0) + input.timeSpentHours).toFixed(2)),
        input.outcome,
        currentBlockers,
        input.taskId,
      ],
    },
    {
      sql: `
        INSERT INTO public.task_updates (
          id,
          task_id,
          user_id,
          status,
          time_spent_hours,
          outcome,
          blockers
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::float8, $6, $7)
      `,
      params: [
        crypto.randomUUID(),
        input.taskId,
        input.userId,
        input.status,
        input.timeSpentHours,
        input.outcome,
        currentBlockers,
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
      INSERT INTO public.daily_reports (
        id,
        project_id,
        user_id,
        report_date,
        summary,
        next_steps,
        total_hours
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::date, $5, $6, $7::float8)
      ON CONFLICT (project_id, user_id, report_date)
      DO UPDATE SET
        summary = EXCLUDED.summary,
        next_steps = EXCLUDED.next_steps,
        total_hours = EXCLUDED.total_hours
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
