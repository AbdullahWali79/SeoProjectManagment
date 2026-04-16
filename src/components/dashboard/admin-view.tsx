"use client";

import { useDeferredValue, useMemo, useState } from "react";

import {
  createProjectAction,
  archiveProjectAction,
  deleteProjectAction,
  restoreProjectAction,
  updateProjectAction,
} from "@/app/actions";
import { AdminWorkspaceShell } from "@/components/dashboard/admin-workspace-shell";
import {
  type AdminDailyReportRow,
  type AdminEmployeeWorkloadRow,
  type AdminProjectRow,
  type AdminReportMonitorRow,
  type AdminTaskAlertRow,
  type ArchivedProjectRow,
  type DashboardTaskRow,
} from "@/lib/data";
import type { AppRole } from "@/lib/auth";
import {
  getTaskStatusLabel,
  isTaskCompleted,
  TASK_WORKFLOW_STEPS,
  type TaskWorkflowStatus,
} from "@/lib/task-workflow";

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function taskStatusLabel(value: string) {
  return getTaskStatusLabel(value);
}

function priorityLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isPastDate(value: string | null) {
  return Boolean(value && value < new Date().toISOString().slice(0, 10));
}

function progressForProject(project: AdminProjectRow) {
  const totalTasks = Number(project.totalTasks || 0);
  const completedTasks = Number(project.completedTasks || 0);
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    progress,
  };
}

function projectHealthDetails(project: AdminProjectRow) {
  const { totalTasks, completedTasks, progress } = progressForProject(project);
  const activeTasks = Number(project.activeTasks || 0);
  const blockedTasks = Number(project.blockedTasks || 0);
  const overdueTasks = Number(project.overdueTasks || 0);

  if (project.status === "done" || (totalTasks > 0 && completedTasks === totalTasks)) {
    return {
      label: "Completed",
      pillClass: "pill-status-done",
      note: `${completedTasks}/${totalTasks} tasks completed.`,
      rank: 3,
      progress,
      totalTasks,
      completedTasks,
      activeTasks,
      blockedTasks,
      overdueTasks,
    };
  }

  if (project.displayStatus === "overdue" || overdueTasks > 0) {
    return {
      label: "Critical",
      pillClass: "pill-status-overdue",
      note: `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"} need attention.`,
      rank: 0,
      progress,
      totalTasks,
      completedTasks,
      activeTasks,
      blockedTasks,
      overdueTasks,
    };
  }

  if (blockedTasks > 0) {
    return {
      label: "At risk",
      pillClass: "pill-status-review",
      note: `${blockedTasks} blocked task${blockedTasks === 1 ? "" : "s"} are slowing delivery.`,
      rank: 1,
      progress,
      totalTasks,
      completedTasks,
      activeTasks,
      blockedTasks,
      overdueTasks,
    };
  }

  if (totalTasks === 0) {
    return {
      label: "No tasks yet",
      pillClass: "pill-status-planning",
      note: "Project is created but execution tasks have not been added yet.",
      rank: 2,
      progress,
      totalTasks,
      completedTasks,
      activeTasks,
      blockedTasks,
      overdueTasks,
    };
  }

  return {
    label: "Healthy",
    pillClass: "pill-status-active",
    note: `${activeTasks} active task${activeTasks === 1 ? "" : "s"} moving without current blockers.`,
    rank: 2,
    progress,
    totalTasks,
    completedTasks,
    activeTasks,
    blockedTasks,
    overdueTasks,
  };
}

function normalizeSearchValue(value: string | null | undefined) {
  return value?.toLowerCase() ?? "";
}

function matchesProject(project: AdminProjectRow, query: string) {
  if (!query) {
    return true;
  }

  return [
    project.name,
    project.clientName,
    project.sourceChannel,
    project.summary,
    project.status,
    project.displayStatus,
    project.dueDate,
  ].some((value) => normalizeSearchValue(value).includes(query));
}

function matchesArchivedProject(project: ArchivedProjectRow, query: string) {
  if (!query) {
    return true;
  }

  return [project.name, project.clientName, project.archivedAt].some((value) =>
    normalizeSearchValue(value).includes(query),
  );
}

export function AdminView({
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
  availableReportDates,
  reportSummary,
}: {
  stats: {
    totalProjects: number;
    openTasks: number;
    activeEmployees: number;
    todayHours: number;
    blockedTasks: number;
    overdueTasks: number;
    unassignedTasks: number;
    missingReports: number;
    archivedProjects: number;
  };
  projects: AdminProjectRow[];
  archivedProjects: ArchivedProjectRow[];
  employees: Array<{ id: string; fullName: string; email: string; role: AppRole }>;
  strategies: Array<{ id: string; title: string; projectId: string; projectName: string }>;
  tasks: DashboardTaskRow[];
  updates: Array<{
    id: string;
    createdAt: string;
    status: string;
    timeSpentHours: number;
    outcome: string;
    blockers: string;
    userName: string;
    taskTitle: string;
    projectName: string;
  }>;
  reports: AdminDailyReportRow[];
  workload: AdminEmployeeWorkloadRow[];
  overdueTasks: AdminTaskAlertRow[];
  blockedTasks: AdminTaskAlertRow[];
  unassignedTasks: AdminTaskAlertRow[];
  reportMonitor: AdminReportMonitorRow[];
  activeReportDate: string;
  availableReportDates: string[];
  reportSummary: {
    totalHours: number;
    reportsCount: number;
    employeeCount: number;
    projectCount: number;
  };
}) {
  const [projectSearch, setProjectSearch] = useState("");
  const deferredProjectSearch = useDeferredValue(projectSearch);
  const normalizedProjectSearch = deferredProjectSearch.trim().toLowerCase();

  const reportDateQuery = encodeURIComponent(activeReportDate);
  const focusTasks = tasks.slice(0, 4);
  const spotlightStrategies = strategies.slice(0, 4);
  const filteredProjects = useMemo(
    () => projects.filter((project) => matchesProject(project, normalizedProjectSearch)),
    [projects, normalizedProjectSearch],
  );
  const filteredArchivedProjects = useMemo(
    () => archivedProjects.filter((project) => matchesArchivedProject(project, normalizedProjectSearch)),
    [archivedProjects, normalizedProjectSearch],
  );
  const projectStatusSummary = useMemo(
    () =>
      filteredProjects.reduce(
        (summary, project) => {
          summary[project.displayStatus] = (summary[project.displayStatus] ?? 0) + 1;
          return summary;
        },
        {} as Record<string, number>,
      ),
    [filteredProjects],
  );
  const workflowSummary = useMemo(() => {
    const initialSummary = TASK_WORKFLOW_STEPS.reduce(
      (summary, step) => {
        summary[step.value] = 0;
        return summary;
      },
      {} as Record<TaskWorkflowStatus, number>,
    );

    for (const task of tasks) {
      const status = Object.prototype.hasOwnProperty.call(initialSummary, task.status)
        ? (task.status as TaskWorkflowStatus)
        : "backlog";
      initialSummary[status] += 1;
    }

    return initialSummary;
  }, [tasks]);
  const projectHealthRows = useMemo(
    () =>
      filteredProjects
        .map((project) => ({
          ...project,
          health: projectHealthDetails(project),
        }))
        .sort((left, right) => {
          if (left.health.rank !== right.health.rank) {
            return left.health.rank - right.health.rank;
          }

          return right.health.progress - left.health.progress;
        }),
    [filteredProjects],
  );
  const healthyProjectCount = projectHealthRows.filter((project) => project.health.label === "Healthy").length;
  const criticalProjectCount = projectHealthRows.filter((project) => project.health.label === "Critical").length;
  const atRiskProjectCount = projectHealthRows.filter((project) => project.health.label === "At risk").length;
  const totalQueuedHours = workload.reduce((sum, member) => sum + member.queuedHours, 0);
  const workloadPeak = workload[0];
  const hasProjectSearch = projectSearch.trim().length > 0;
  const commandCenterCount = stats.overdueTasks + stats.blockedTasks + stats.unassignedTasks;

  return (
    <AdminWorkspaceShell
      stats={stats}
      employees={employees}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        status: project.status,
      }))}
      strategies={strategies}
    >
      <section id="admin-overview" className="panel admin-hero admin-overview-hero">
        <div className="row g-4 align-items-stretch">
          <div className="col-xl-7">
            <div className="admin-hero-copy">
              <p className="eyebrow">Operations cockpit</p>
              <h2>Track project health, team workload, blocked work, and the full task workflow from one admin dashboard.</h2>
              <p className="subtle">
                Focus first on active projects, overdue items, blocked execution, and the fixed workflow without
                jumping between separate tools.
              </p>
              <div className="admin-hero-actions d-flex flex-wrap gap-2">
                <a className="button button-secondary compact-button btn btn-primary" href="#admin-health">
                  Open central dashboard
                </a>
                <a className="button button-ghost compact-button btn btn-light" href="#admin-reports">
                  Review report monitor
                </a>
                <a className="button button-ghost compact-button btn btn-light" href="#admin-queue">
                  Open command center
                </a>
              </div>
            </div>
          </div>
          <div className="col-xl-5">
            <div className="row g-3 h-100">
              <div className="col-sm-6">
                <div className="admin-mini-card admin-mini-card-primary h-100">
                  <span className="eyebrow">Projects live</span>
                  <strong>{stats.totalProjects}</strong>
                  <p>Active client workspaces currently under tracking.</p>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="admin-mini-card admin-mini-card-warm h-100">
                  <span className="eyebrow">Missing reports</span>
                  <strong>{stats.missingReports}</strong>
                  <p>Employees who have not submitted for {activeReportDate}.</p>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="admin-mini-card h-100">
                  <span className="eyebrow">Blocked tasks</span>
                  <strong>{stats.blockedTasks}</strong>
                  <p>Execution items currently waiting on blocker resolution.</p>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="admin-mini-card h-100">
                  <span className="eyebrow">Overdue alerts</span>
                  <strong>{stats.overdueTasks}</strong>
                  <p>Tasks already past due and needing immediate admin attention.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-4 stat-grid">
        <div className="panel stat-card stat-card-projects">
          <p className="eyebrow">Projects</p>
          <p className="metric">{stats.totalProjects}</p>
          <p className="subtle">Tracked client workspaces excluding archived items.</p>
        </div>
        <div className="panel stat-card stat-card-tasks">
          <p className="eyebrow">Open tasks</p>
          <p className="metric">{stats.openTasks}</p>
          <p className="subtle">All non-completed tasks currently moving across the team.</p>
        </div>
        <div className="panel stat-card stat-card-team">
          <p className="eyebrow">Reports missing</p>
          <p className="metric">{stats.missingReports}</p>
          <p className="subtle">Employees still missing their report for {activeReportDate}.</p>
        </div>
        <div className="panel stat-card stat-card-hours">
          <p className="eyebrow">Hours today</p>
          <p className="metric">{stats.todayHours}</p>
          <p className="subtle">Submitted hours visible from active projects right now.</p>
        </div>
      </section>

      <section id="admin-health" className="admin-central-grid">
        <section className="panel section admin-central-panel">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Central admin dashboard</p>
              <h3>One screen for the signals that matter most</h3>
              <p className="subtle">
                Active projects, overdue work, blocked tasks, team workload, and project health stay visible together.
              </p>
            </div>
          </div>
          <div className="admin-central-metrics">
            <article className="admin-central-card">
              <span className="eyebrow">Active projects</span>
              <strong>{stats.totalProjects}</strong>
              <p>{healthyProjectCount} healthy project{healthyProjectCount === 1 ? "" : "s"} currently moving.</p>
            </article>
            <article className="admin-central-card">
              <span className="eyebrow">Overdue tasks</span>
              <strong>{stats.overdueTasks}</strong>
              <p>{criticalProjectCount} project{criticalProjectCount === 1 ? "" : "s"} need fast intervention.</p>
            </article>
            <article className="admin-central-card">
              <span className="eyebrow">Blocked tasks</span>
              <strong>{stats.blockedTasks}</strong>
              <p>Separate blocker tracking keeps blocked work visible without breaking the workflow.</p>
            </article>
            <article className="admin-central-card">
              <span className="eyebrow">Unassigned tasks</span>
              <strong>{stats.unassignedTasks}</strong>
              <p>Execution items still waiting for an owner before delivery can begin.</p>
            </article>
            <article className="admin-central-card">
              <span className="eyebrow">Team workload</span>
              <strong>{totalQueuedHours}h</strong>
              <p>
                {workloadPeak
                  ? `${workloadPeak.fullName} carries the heaviest queue right now.`
                  : "No employee workload has been queued yet."}
              </p>
            </article>
            <article className="admin-central-card">
              <span className="eyebrow">Project health</span>
              <strong>{projectHealthRows.length}</strong>
              <p>{atRiskProjectCount} at risk and {criticalProjectCount} critical across the live portfolio.</p>
            </article>
          </div>
        </section>

        <section className="panel section admin-central-panel">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Task workflow</p>
              <h3>Backlog to completed, with one fixed path</h3>
              <p className="subtle">
                Every task now follows the same disciplined route: Backlog, To do, In progress, Review, Completed.
              </p>
            </div>
          </div>
          <div className="admin-workflow-grid">
            {TASK_WORKFLOW_STEPS.map((step) => (
              <article key={step.value} className="admin-workflow-card">
                <span className={`pill pill-status-${step.value}`}>{step.label}</span>
                <strong>{workflowSummary[step.value] ?? 0}</strong>
                <p>{step.note}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel section admin-health-panel">
        <div className="section-head">
          <div className="section-copy">
            <p className="eyebrow">Project health</p>
            <h3>Health snapshot across active client projects</h3>
            <p className="subtle">
              Health is calculated from overdue pressure, blocker count, and completion progress so admin can act fast.
            </p>
          </div>
        </div>
        <div className="admin-health-list">
          {projectHealthRows.length ? (
            projectHealthRows.map((project) => (
              <article key={project.id} className="admin-health-item">
                <div>
                  <strong>{project.name}</strong>
                  <p className="subtle mini">
                    {project.clientName} | {project.sourceChannel}
                  </p>
                  <p className="subtle mini">{project.health.note}</p>
                </div>
                <div className="admin-health-meta">
                  <span className={`pill ${project.health.pillClass}`}>{project.health.label}</span>
                  <span className="subtle mini">
                    {project.health.progress}% complete | {project.health.completedTasks}/{project.health.totalTasks} completed
                  </span>
                  <span className="subtle mini">
                    {project.health.activeTasks} open | {project.health.blockedTasks} blocked | {project.health.overdueTasks} overdue
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="report-empty">
              {hasProjectSearch ? "No active projects match this search." : "No active projects are available yet."}
            </div>
          )}
        </div>
      </section>

      <section className="admin-insight-grid">
        <section className="panel section admin-insight-panel">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Employee workload board</p>
              <h3>Who is carrying the queue right now</h3>
              <p className="subtle">Check task load, overdue pressure, and report activity before assigning more work.</p>
            </div>
          </div>
          <div className="admin-brief-list">
            {workload.length ? (
              workload.map((member) => (
                <article key={member.id} className="admin-brief-item">
                  <div>
                    <strong>{member.fullName}</strong>
                    <p className="subtle mini">{member.email}</p>
                    <div className="summary-inline admin-inline-pills">
                      <span className="pill pill-status-active">{member.activeTasks} active</span>
                      <span className="pill pill-status-blocked">{member.blockedTasks} blocked</span>
                      <span className="pill pill-status-overdue">{member.overdueTasks} overdue</span>
                      <span className="pill pill-status-review">{member.activeProjects} projects</span>
                    </div>
                  </div>
                  <div className="admin-brief-meta">
                    <span className={`pill ${member.reportCount ? "pill-status-done" : "pill-status-missing"}`}>
                      {member.reportCount ? "Reported" : "Missing report"}
                    </span>
                    <span className="subtle mini">
                      {member.queuedHours}h queued | {member.reportHours}h reported
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="subtle">No employees are active yet.</p>
            )}
          </div>
        </section>

        <section className="panel section admin-insight-panel">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Daily report monitor</p>
              <h3>Submitted vs missing for {activeReportDate}</h3>
              <p className="subtle">The fastest way to see who reported, how many hours came in, and which projects were touched.</p>
            </div>
          </div>
          <div className="admin-brief-list">
            {reportMonitor.length ? (
              reportMonitor.map((member) => (
                <article key={member.id} className="admin-brief-item">
                  <div>
                    <strong>{member.fullName}</strong>
                    <p className="subtle mini">{member.projectNames || "No projects reported yet"}</p>
                  </div>
                  <div className="admin-brief-meta">
                    <span className={`pill ${member.status === "submitted" ? "pill-status-done" : "pill-status-missing"}`}>
                      {member.status === "submitted" ? "Submitted" : "Missing"}
                    </span>
                    <span className="subtle mini">
                      {member.reportCount} report{member.reportCount === 1 ? "" : "s"} | {member.totalHours}h
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="subtle">No employee reporting data is available yet.</p>
            )}
          </div>
        </section>
      </section>

      <section id="admin-queue" className="panel section admin-command-panel">
        <div className="section-head">
          <div className="section-copy">
            <p className="eyebrow">Overdue + blocked command center</p>
            <h3>Immediate action items that need admin attention first</h3>
            <p className="subtle">
              Keep overdue work, blocker-heavy tasks, and unassigned execution items together so nothing urgent slips
              past the top of the dashboard.
            </p>
          </div>
        </div>
        <div className="summary-inline admin-command-summary">
          <span className="pill pill-status-overdue">{stats.overdueTasks} overdue</span>
          <span className="pill pill-status-blocked">{stats.blockedTasks} blocked</span>
          <span className="pill pill-status-planning">{stats.unassignedTasks} unassigned</span>
          <span className="pill pill-status-review">{commandCenterCount} total action items</span>
        </div>
        <div className="admin-command-grid">
          <article className="admin-command-card admin-command-card-overdue">
            <div className="admin-command-head">
              <div>
                <p className="eyebrow">Overdue tasks</p>
                <h4>Past due and waiting</h4>
              </div>
              <strong>{stats.overdueTasks}</strong>
            </div>
            <p className="subtle admin-command-copy">
              Move here first when you need to rescue delivery dates and follow up with the current owner immediately.
            </p>
            <div className="admin-command-list">
              {overdueTasks.length ? (
                overdueTasks.map((task) => (
                  <article key={task.id} className="admin-command-item">
                    <div>
                      <strong>{task.title}</strong>
                      <p className="subtle mini">
                        {task.assigneeName} | {task.projectName}
                      </p>
                      <p className="subtle mini">{task.resultNote || "Awaiting update"}</p>
                    </div>
                    <div className="admin-brief-meta">
                      <span className="pill pill-status-overdue">{priorityLabel(task.priority)} priority</span>
                      <span className="subtle mini">{task.dueDate || "No due date"}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="report-empty">No overdue tasks right now.</div>
              )}
            </div>
          </article>

          <article className="admin-command-card admin-command-card-blocked">
            <div className="admin-command-head">
              <div>
                <p className="eyebrow">Blocked tasks</p>
                <h4>Waiting on unblock</h4>
              </div>
              <strong>{stats.blockedTasks}</strong>
            </div>
            <p className="subtle admin-command-copy">
              Latest blocker notes stay visible here so you can clear dependencies without opening every single task.
            </p>
            <div className="admin-command-list">
              {blockedTasks.length ? (
                blockedTasks.map((task) => (
                  <article key={task.id} className="admin-command-item">
                    <div>
                      <strong>{task.title}</strong>
                      <p className="subtle mini">
                        {task.assigneeName} | {task.projectName}
                      </p>
                      <p className="subtle mini">{task.blockers || "Blocked without detail yet."}</p>
                    </div>
                    <div className="admin-brief-meta">
                      <span className="pill pill-status-blocked">Blocked</span>
                      <span className="subtle mini">{task.dueDate || "No due date"}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="report-empty">No blocked tasks at the moment.</div>
              )}
            </div>
          </article>

          <article className="admin-command-card admin-command-card-unassigned">
            <div className="admin-command-head">
              <div>
                <p className="eyebrow">Unassigned tasks</p>
                <h4>Ready but owner missing</h4>
              </div>
              <strong>{stats.unassignedTasks}</strong>
            </div>
            <p className="subtle admin-command-copy">
              These tasks are in the system but still waiting for ownership, so they cannot move through delivery yet.
            </p>
            <div className="admin-command-list">
              {unassignedTasks.length ? (
                unassignedTasks.map((task) => (
                  <article key={task.id} className="admin-command-item">
                    <div>
                      <strong>{task.title}</strong>
                      <p className="subtle mini">
                        {task.assigneeName} | {task.projectName}
                      </p>
                      <p className="subtle mini">{task.resultNote || "No update logged yet."}</p>
                    </div>
                    <div className="admin-brief-meta">
                      <span className="pill pill-status-planning">{priorityLabel(task.priority)} priority</span>
                      <span className="subtle mini">{task.dueDate || "No due date"}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="report-empty">No unassigned tasks waiting for ownership.</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="stack">
        <section id="admin-reports" className="panel section table-section">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Team reporting</p>
              <h3>Daily report pack for {activeReportDate}</h3>
              <p className="subtle">
                Export this day&apos;s report to Excel or open a print-friendly layout for PDF and printing.
              </p>
            </div>
            <div className="report-toolbar">
              <form className="toolbar-inline" method="get">
                <label className="label" htmlFor="reportDate">
                  Report date
                </label>
                <select id="reportDate" name="reportDate" className="select compact-select form-select" defaultValue={activeReportDate}>
                  {availableReportDates.map((date) => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
                <button className="button button-ghost compact-button btn btn-light" type="submit">
                  Apply
                </button>
              </form>
              <div className="toolbar-actions">
                <a className="button button-secondary compact-button btn btn-primary" href={`/dashboard/reports/export?date=${reportDateQuery}`}>
                  Export Excel
                </a>
                <a
                  className="button button-ghost compact-button btn btn-light"
                  href={`/dashboard/reports/print?date=${reportDateQuery}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Print / Save PDF
                </a>
              </div>
            </div>
          </div>
          <div className="summary-inline">
            <span className="pill pill-status-active">{reportSummary.totalHours}h logged</span>
            <span className="pill pill-status-planning">{reportSummary.employeeCount} team members reported</span>
            <span className="pill pill-status-review">{reportSummary.projectCount} projects touched</span>
            <span className="pill pill-status-done">{reportSummary.reportsCount} daily reports</span>
            <span className="pill pill-status-missing">{stats.missingReports} missing</span>
          </div>
          <div className="table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Project</th>
                  <th>Hours</th>
                  <th>Summary</th>
                  <th>Next steps</th>
                </tr>
              </thead>
              <tbody>
                {reports.length ? (
                  reports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.reportDate}</td>
                      <td>{report.userName}</td>
                      <td>{report.projectName}</td>
                      <td>{report.totalHours}</td>
                      <td>{report.summary}</td>
                      <td>{report.nextSteps}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="report-empty">
                        No daily reports are available for this date yet.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel section table-section">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Execution queue</p>
              <h3>Task tracking board</h3>
              <p className="subtle">
                Monitor the current owner, effort spent, result note, and deadline on every active deliverable.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Workflow</th>
                  <th>Effort</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      <div className="subtle mini">{task.strategyTitle || "No linked strategy"}</div>
                    </td>
                    <td>{task.projectName}</td>
                    <td>{task.assigneeName}</td>
                    <td>
                      <span className={`pill pill-status-${task.status}`}>{taskStatusLabel(task.status)}</span>
                    </td>
                    <td>
                      {task.actualHours}h / {task.estimatedHours}h
                      <div className={`subtle mini ${isPastDate(task.dueDate) && !isTaskCompleted(task.status) ? "admin-alert-note" : ""}`}>
                        {task.dueDate || "No due date"}
                      </div>
                    </td>
                    <td>
                      <div>{task.resultNote || "Awaiting update"}</div>
                      {task.currentBlockers ? (
                        <div className="admin-task-blocker">
                          <span className="pill pill-status-blocked">Blocked</span>
                          <span className="subtle mini">{task.currentBlockers}</span>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="admin-projects" className="panel section table-section">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Project tracker</p>
              <h3>Create, edit, archive, and track every project from one board</h3>
              <p className="subtle">
                Add from the top action, edit from each row, archive instantly, and delete permanently from the archived list.
              </p>
            </div>
            <div className="admin-project-toolbar">
              <div className="field admin-project-search">
                <label className="label" htmlFor="project-search">
                  Search projects
                </label>
                <div className="toolbar-inline">
                  <input
                    id="project-search"
                    name="projectSearch"
                    className="input form-control admin-project-search-input"
                    value={projectSearch}
                    onChange={(event) => setProjectSearch(event.target.value)}
                    placeholder="Project, client, source, summary, or status"
                  />
                  {hasProjectSearch ? (
                    <button
                      type="button"
                      className="button button-ghost compact-button btn btn-light"
                      onClick={() => setProjectSearch("")}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
              <details className="admin-add-project">
                <summary className="button button-secondary compact-button btn btn-primary">Add project</summary>
                <div className="admin-project-manage-panel">
                  <form action={createProjectAction} className="form-grid admin-inline-form">
                    <div className="field">
                      <label className="label" htmlFor="tracker-project-name">
                        Project name
                      </label>
                      <input id="tracker-project-name" name="name" className="input form-control" />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="tracker-client-name">
                        Client
                      </label>
                      <input id="tracker-client-name" name="clientName" className="input form-control" />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="tracker-source">
                        Source
                      </label>
                      <input id="tracker-source" name="sourceChannel" className="input form-control" placeholder="Fiverr, Upwork, referral" />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="tracker-status">
                        Status
                      </label>
                      <select id="tracker-status" name="status" className="select form-select" defaultValue="planning">
                        <option value="planning">Planning</option>
                        <option value="active">Active</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="tracker-due-date">
                        Due date
                      </label>
                      <input id="tracker-due-date" name="dueDate" type="date" className="input form-control" />
                    </div>
                    <div className="field field-full">
                      <label className="label" htmlFor="tracker-summary">
                        Summary
                      </label>
                      <textarea id="tracker-summary" name="summary" className="textarea form-control" />
                    </div>
                    <div className="field field-full admin-inline-actions">
                      <button className="button button-secondary compact-button btn btn-primary" type="submit">
                        Create project
                      </button>
                    </div>
                  </form>
                </div>
              </details>
            </div>
          </div>
          {hasProjectSearch ? (
            <p className="subtle mini admin-project-search-note">
              Showing {filteredProjects.length} of {projects.length} live project{projects.length === 1 ? "" : "s"} and{" "}
              {filteredArchivedProjects.length} of {archivedProjects.length} archived project
              {archivedProjects.length === 1 ? "" : "s"} matching "{projectSearch.trim()}".
            </p>
          ) : null}
          <div className="summary-inline">
            <span className="pill pill-status-active">{projectStatusSummary.active ?? 0} active</span>
            <span className="pill pill-status-planning">{projectStatusSummary.planning ?? 0} planning</span>
            <span className="pill pill-status-review">{projectStatusSummary.review ?? 0} review</span>
            <span className="pill pill-status-done">{projectStatusSummary.done ?? 0} done</span>
            <span className="pill pill-status-overdue">{projectStatusSummary.overdue ?? 0} overdue</span>
          </div>
          <div className="table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Status tracker</th>
                  <th>Progress</th>
                  <th>Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length ? (
                  filteredProjects.map((project) => {
                    const { totalTasks, completedTasks, progress } = progressForProject(project);

                    return (
                      <tr key={project.id}>
                        <td>
                          <strong>{project.name}</strong>
                          <div className="subtle mini">{project.summary}</div>
                        </td>
                        <td>
                          {project.clientName}
                          <div className="subtle mini">{project.sourceChannel}</div>
                        </td>
                        <td>
                          <span className={`pill pill-status-${project.displayStatus}`}>{statusLabel(project.displayStatus)}</span>
                          <div className="subtle mini">
                            {Number(project.activeTasks || 0)} active | {Number(project.blockedTasks || 0)} blocked |{" "}
                            {Number(project.overdueTasks || 0)} overdue
                          </div>
                        </td>
                        <td>
                          <div className="admin-progress">
                            <div className="admin-progress-track">
                              <span className="admin-progress-bar" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="subtle mini">
                              {progress}% complete | {completedTasks}/{totalTasks} tasks completed
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={isPastDate(project.dueDate) && project.displayStatus === "overdue" ? "admin-alert-note" : undefined}>
                            {project.dueDate || "No deadline"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <details className="admin-project-manage">
                              <summary className="button button-ghost compact-button btn btn-light">Edit</summary>
                              <div className="admin-project-manage-panel">
                                <form action={updateProjectAction} className="form-grid admin-inline-form">
                                  <input type="hidden" name="projectId" value={project.id} />
                                  <div className="field">
                                    <label className="label" htmlFor={`project-name-${project.id}`}>
                                      Project name
                                    </label>
                                    <input
                                      id={`project-name-${project.id}`}
                                      name="name"
                                      className="input form-control"
                                      defaultValue={project.name}
                                    />
                                  </div>
                                  <div className="field">
                                    <label className="label" htmlFor={`project-client-${project.id}`}>
                                      Client
                                    </label>
                                    <input
                                      id={`project-client-${project.id}`}
                                      name="clientName"
                                      className="input form-control"
                                      defaultValue={project.clientName}
                                    />
                                  </div>
                                  <div className="field">
                                    <label className="label" htmlFor={`project-source-${project.id}`}>
                                      Source
                                    </label>
                                    <input
                                      id={`project-source-${project.id}`}
                                      name="sourceChannel"
                                      className="input form-control"
                                      defaultValue={project.sourceChannel}
                                    />
                                  </div>
                                  <div className="field">
                                    <label className="label" htmlFor={`project-status-${project.id}`}>
                                      Status
                                    </label>
                                    <select
                                      id={`project-status-${project.id}`}
                                      name="status"
                                      className="select form-select"
                                      defaultValue={project.status}
                                    >
                                      <option value="planning">Planning</option>
                                      <option value="active">Active</option>
                                      <option value="review">Review</option>
                                      <option value="done">Done</option>
                                    </select>
                                  </div>
                                  <div className="field">
                                    <label className="label" htmlFor={`project-due-${project.id}`}>
                                      Due date
                                    </label>
                                    <input
                                      id={`project-due-${project.id}`}
                                      name="dueDate"
                                      type="date"
                                      className="input form-control"
                                      defaultValue={project.dueDate || ""}
                                    />
                                  </div>
                                  <div className="field field-full">
                                    <label className="label" htmlFor={`project-summary-${project.id}`}>
                                      Summary
                                    </label>
                                    <textarea
                                      id={`project-summary-${project.id}`}
                                      name="summary"
                                      className="textarea form-control"
                                      defaultValue={project.summary}
                                    />
                                  </div>
                                  <div className="field field-full admin-inline-actions">
                                    <button className="button button-secondary compact-button btn btn-primary" type="submit">
                                      Save changes
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </details>
                            <form action={archiveProjectAction} className="admin-action-form">
                              <input type="hidden" name="projectId" value={project.id} />
                              <button className="button button-ghost compact-button btn btn-light admin-archive-button" type="submit">
                                Archive
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="report-empty">
                        {hasProjectSearch ? "No projects match this search." : "No projects are available yet."}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {archivedProjects.length ? (
            <div className="admin-archived-block">
              <div className="section-head">
                <div className="section-copy">
                  <p className="eyebrow">Archived projects</p>
                  <h3>
                    {hasProjectSearch
                      ? `${filteredArchivedProjects.length} archived workspace${filteredArchivedProjects.length === 1 ? "" : "s"} match this search`
                      : `${archivedProjects.length} archived workspace${archivedProjects.length === 1 ? "" : "s"}`}
                  </h3>
                  <p className="subtle">Restore archived workspaces whenever they need to come back into the live board.</p>
                </div>
              </div>
              {filteredArchivedProjects.length ? (
                <div className="admin-people-grid admin-archived-grid">
                  {filteredArchivedProjects.map((project) => (
                    <article key={project.id} className="admin-person-tile admin-archived-item">
                      <div>
                        <strong>{project.name}</strong>
                        <p className="subtle mini">
                          {project.clientName} | {project.totalTasks} tasks
                        </p>
                        <p className="subtle mini">Archived {project.archivedAt || "recently"}</p>
                      </div>
                      <div className="admin-row-actions">
                        <form action={restoreProjectAction} className="admin-action-form">
                          <input type="hidden" name="projectId" value={project.id} />
                          <button className="button button-ghost compact-button btn btn-light" type="submit">
                            Restore
                          </button>
                        </form>
                        <form action={deleteProjectAction} className="admin-action-form">
                          <input type="hidden" name="projectId" value={project.id} />
                          <button className="button button-ghost compact-button btn btn-light admin-delete-button" type="submit">
                            Delete
                          </button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              ) : hasProjectSearch ? (
                <div className="report-empty">No archived projects match this search.</div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section id="admin-activity" className="panel section table-section">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Activity stream</p>
              <h3>Recent team updates</h3>
              <p className="subtle">Blockers and outcomes appear here as soon as team members update their tasks.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Hours</th>
                  <th>Outcome</th>
                  <th>Blockers</th>
                </tr>
              </thead>
              <tbody>
                {updates.map((update) => (
                  <tr key={update.id}>
                    <td>
                      <strong>{update.userName}</strong>
                      <div className="subtle mini">{update.projectName}</div>
                    </td>
                    <td>{update.taskTitle}</td>
                    <td>
                      <span className={`pill pill-status-${update.status}`}>{taskStatusLabel(update.status)}</span>
                    </td>
                    <td>{update.timeSpentHours}</td>
                    <td>{update.outcome}</td>
                    <td>{update.blockers || "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="admin-team" className="panel section admin-team-section">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">People and planning</p>
              <h3>Team snapshot</h3>
              <p className="subtle">See the active roster, strategy library, and priority tasks in one clean workspace section.</p>
            </div>
          </div>
          <div className="admin-team-grid">
            <article className="admin-team-card">
              <h4>Active users</h4>
              <div className="admin-list-stack">
                {employees.map((employee) => (
                  <div key={employee.id} className="admin-list-row">
                    <div>
                      <strong>{employee.fullName}</strong>
                      <p className="subtle mini">{employee.email}</p>
                    </div>
                    <span className="pill pill-status-planning">
                      {employee.role === "admin" ? "Admin" : "Employee"}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="admin-team-card">
              <h4>Strategy library</h4>
              <div className="admin-list-stack">
                {spotlightStrategies.length ? (
                  spotlightStrategies.map((strategy) => (
                    <div key={strategy.id} className="admin-list-row">
                      <div>
                        <strong>{strategy.title}</strong>
                        <p className="subtle mini">{strategy.projectName}</p>
                      </div>
                      <span className="pill pill-status-review">Strategy</span>
                    </div>
                  ))
                ) : (
                  <p className="subtle">No strategies saved yet.</p>
                )}
              </div>
            </article>

            <article className="admin-team-card">
              <h4>Priority tasks</h4>
              <div className="admin-list-stack">
                {focusTasks.length ? (
                  focusTasks.map((task) => (
                    <div key={task.id} className="admin-list-row">
                      <div>
                        <strong>{task.title}</strong>
                        <p className="subtle mini">
                          {task.assigneeName} | {task.projectName}
                        </p>
                      </div>
                      <span className={`pill pill-status-${task.status}`}>{taskStatusLabel(task.status)}</span>
                    </div>
                  ))
                ) : (
                  <p className="subtle">No tasks assigned yet.</p>
                )}
              </div>
            </article>
          </div>
        </section>
      </section>
    </AdminWorkspaceShell>
  );
}
