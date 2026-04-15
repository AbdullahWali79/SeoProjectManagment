import { AdminControlCenter } from "@/components/dashboard/admin-control-center";
import { type AdminDailyReportRow, type DashboardTaskRow } from "@/lib/data";
import type { AppRole } from "@/lib/auth";

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function AdminView({
  stats,
  projects,
  employees,
  strategies,
  tasks,
  updates,
  reports,
  activeReportDate,
  availableReportDates,
  reportSummary,
}: {
  stats: {
    totalProjects: number;
    openTasks: number;
    activeEmployees: number;
    todayHours: number;
  };
  projects: Array<{
    id: string;
    name: string;
    clientName: string;
    sourceChannel: string;
    status: string;
    dueDate: string | null;
    summary: string;
    totalTasks: number;
    completedTasks: number | null;
  }>;
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
  activeReportDate: string;
  availableReportDates: string[];
  reportSummary: {
    totalHours: number;
    reportsCount: number;
    employeeCount: number;
    projectCount: number;
  };
}) {
  const reportDateQuery = encodeURIComponent(activeReportDate);

  return (
    <>
      <section className="panel admin-hero mb-4">
        <div className="row g-4 align-items-stretch">
          <div className="col-xl-7">
            <div className="admin-hero-copy">
              <p className="eyebrow">Operations cockpit</p>
              <h2>Keep client delivery, assignments, and reporting inside one colorful control room.</h2>
              <p className="subtle">
                Jump between project portfolio, execution queue, daily reports, and team updates without losing context.
              </p>
              <div className="admin-hero-actions d-flex flex-wrap gap-2">
                <a className="button button-secondary compact-button btn btn-primary" href="#admin-reports">
                  Open daily reports
                </a>
                <a className="button button-ghost compact-button btn btn-light" href="#admin-queue">
                  View execution queue
                </a>
                <a className="button button-ghost compact-button btn btn-light" href="#admin-projects">
                  Review projects
                </a>
              </div>
            </div>
          </div>
          <div className="col-xl-5">
            <div className="row g-3 h-100">
              <div className="col-sm-6">
                <div className="admin-mini-card admin-mini-card-primary h-100">
                  <span className="eyebrow">Report coverage</span>
                  <strong>{reportSummary.reportsCount}</strong>
                  <p>Daily reports already saved for the selected date.</p>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="admin-mini-card admin-mini-card-warm h-100">
                  <span className="eyebrow">Team active</span>
                  <strong>{stats.activeEmployees}</strong>
                  <p>Employees currently visible in the delivery workflow.</p>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="admin-mini-card h-100">
                  <span className="eyebrow">Projects tracked</span>
                  <strong>{stats.totalProjects}</strong>
                  <p>Client workspaces now moving through your dashboard.</p>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="admin-mini-card h-100">
                  <span className="eyebrow">Hours logged</span>
                  <strong>{reportSummary.totalHours}</strong>
                  <p>Reported hours ready to reuse in the next client call.</p>
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
          <p className="subtle">Client workspaces currently tracked.</p>
        </div>
        <div className="panel stat-card stat-card-tasks">
          <p className="eyebrow">Open tasks</p>
          <p className="metric">{stats.openTasks}</p>
          <p className="subtle">Tasks still moving across the team.</p>
        </div>
        <div className="panel stat-card stat-card-team">
          <p className="eyebrow">Employees</p>
          <p className="metric">{stats.activeEmployees}</p>
          <p className="subtle">Active executors under your account.</p>
        </div>
        <div className="panel stat-card stat-card-hours">
          <p className="eyebrow">Hours today</p>
          <p className="metric">{stats.todayHours}</p>
          <p className="subtle">Reported work already ready for client reporting.</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="primary-column stack">
          <section id="admin-projects" className="panel section table-section">
            <div className="section-head">
              <div className="section-copy">
                <p className="eyebrow">Portfolio overview</p>
                <h3>Project summary for client meetings</h3>
                <p className="subtle">
                  Review each client, its source, current status, and completion progress before the next call.
                </p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Client</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const totalTasks = Number(project.totalTasks || 0);
                    const completedTasks = Number(project.completedTasks || 0);
                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                    return (
                      <tr key={project.id}>
                        <td>
                          <strong>{project.name}</strong>
                          <div className="subtle mini">{project.summary}</div>
                        </td>
                        <td>{project.clientName}</td>
                        <td>{project.sourceChannel}</td>
                        <td>
                          <span className={`pill pill-status-${project.status}`}>{statusLabel(project.status)}</span>
                        </td>
                        <td>{progress}%</td>
                        <td>{project.dueDate || "No deadline"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section id="admin-queue" className="panel section table-section">
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
                    <th>Status</th>
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
                        <span className={`pill pill-status-${task.status}`}>{statusLabel(task.status)}</span>
                      </td>
                      <td>
                        {task.actualHours}h / {task.estimatedHours}h
                        <div className="subtle mini">{task.dueDate || "No due date"}</div>
                      </td>
                      <td>{task.resultNote || "Awaiting update"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

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
              <span className="pill pill-status-planning">{reportSummary.employeeCount} team members</span>
              <span className="pill pill-status-review">{reportSummary.projectCount} projects</span>
              <span className="pill pill-status-done">{reportSummary.reportsCount} daily reports</span>
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
                        <span className={`pill pill-status-${update.status}`}>{statusLabel(update.status)}</span>
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
        </div>

        <div className="side-rail">
          <AdminControlCenter
            employees={employees}
            projects={projects.map((project) => ({
              id: project.id,
              name: project.name,
              clientName: project.clientName,
              status: project.status,
            }))}
            strategies={strategies}
            openTasks={stats.openTasks}
            todayHours={stats.todayHours}
            focusTasks={tasks.slice(0, 4).map((task) => ({
              id: task.id,
              title: task.title,
              assigneeName: task.assigneeName,
              status: task.status,
              dueDate: task.dueDate,
            }))}
          />
        </div>
      </section>
    </>
  );
}
