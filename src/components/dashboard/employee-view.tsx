import { updateTaskProgressAction } from "@/app/actions";
import { EmployeeWorkspaceShell } from "@/components/dashboard/employee-workspace-shell";
import { getTaskStatusLabel, isTaskCompleted, TASK_WORKFLOW_STEPS } from "@/lib/task-workflow";

function statusLabel(value: string) {
  return getTaskStatusLabel(value);
}

export function EmployeeView({
  tasks,
  projectOptions,
  reports,
}: {
  tasks: Array<{
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
  }>;
  projectOptions: Array<{ id: string; name: string }>;
  reports: Array<{
    id: string;
    reportDate: string;
    summary: string;
    nextSteps: string;
    totalHours: number;
    projectName: string;
  }>;
}) {
  const activeTasks = tasks.filter((task) => !isTaskCompleted(task.status));
  const totalReportedHours = reports.reduce((sum, report) => sum + report.totalHours, 0);
  const focusTasks = tasks.slice(0, 4);
  const recentReports = reports.slice(0, 6);

  return (
    <EmployeeWorkspaceShell
      projectOptions={projectOptions}
      stats={{
        totalTasks: tasks.length,
        activeTasks: activeTasks.length,
        reportCount: reports.length,
        totalHours: totalReportedHours,
      }}
    >
      <section id="employee-overview" className="panel employee-hero">
        <div className="employee-hero-grid">
          <div className="employee-hero-main">
            <div className="employee-hero-copy">
              <p className="eyebrow">Delivery workspace</p>
              <h2>Run your delivery desk with a clean task queue and daily reporting flow.</h2>
              <p className="subtle">
                Keep updates, blockers, and report notes in one tidy workspace without stepping into admin controls.
              </p>
              <div className="employee-hero-actions d-flex flex-wrap gap-2">
                <a className="button button-ghost compact-button btn btn-light" href="#employee-reporting">
                  Open daily report
                </a>
                <a className="button button-secondary compact-button btn btn-primary" href="#employee-queue">
                  Open my tasks
                </a>
                <a className="button button-ghost compact-button btn btn-light" href="#employee-activity">
                  View history
                </a>
              </div>
            </div>
          </div>
          <div className="employee-hero-side">
            <div className="employee-hero-metrics h-100">
              <div className="employee-mini-card employee-mini-card-primary h-100">
                <span className="eyebrow">Tasks active</span>
                <strong>{activeTasks.length}</strong>
                <p>Tasks currently moving through your workflow.</p>
              </div>
              <div className="employee-mini-card employee-mini-card-accent h-100">
                <span className="eyebrow">Reports sent</span>
                <strong>{reports.length}</strong>
                <p>Daily reports already visible to the admin.</p>
              </div>
              <div className="employee-mini-card h-100">
                <span className="eyebrow">Projects assigned</span>
                <strong>{projectOptions.length}</strong>
                <p>Projects currently attached to your task list.</p>
              </div>
              <div className="employee-mini-card h-100">
                <span className="eyebrow">Hours reported</span>
                <strong>{totalReportedHours}</strong>
                <p>Total hours already submitted through your daily reports.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-4 stat-grid employee-stat-grid">
        <div className="panel stat-card employee-stat-card employee-stat-card-projects">
          <p className="eyebrow">Assigned projects</p>
          <p className="metric">{projectOptions.length}</p>
          <p className="subtle">Project spaces currently assigned to you.</p>
        </div>
        <div className="panel stat-card employee-stat-card employee-stat-card-tasks">
          <p className="eyebrow">My task queue</p>
          <p className="metric">{activeTasks.length}</p>
          <p className="subtle">Tasks still moving inside your workflow.</p>
        </div>
        <div className="panel stat-card employee-stat-card employee-stat-card-team">
          <p className="eyebrow">Reports sent</p>
          <p className="metric">{reports.length}</p>
          <p className="subtle">Daily submissions already visible to the admin.</p>
        </div>
        <div className="panel stat-card employee-stat-card employee-stat-card-hours">
          <p className="eyebrow">Hours logged</p>
          <p className="metric">{totalReportedHours}</p>
          <p className="subtle">Total hours already submitted through your reports.</p>
        </div>
      </section>

      <section className="employee-insight-grid">
        <section className="panel section employee-insight-panel">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Today&apos;s focus</p>
              <h3>My tasks to touch first</h3>
              <p className="subtle">Use this shortlist to decide which updates should be sent before you close the day.</p>
            </div>
          </div>
          <div className="employee-focus-list">
            {focusTasks.length ? (
              focusTasks.map((task, index) => (
                <article key={task.id} className="employee-focus-item">
                  <div className="employee-focus-copy">
                    <span className="employee-focus-index">Focus {index + 1}</span>
                    <strong className="employee-focus-title">{task.title}</strong>
                    <p className="subtle mini">
                      {task.projectName} | {task.strategyTitle || "No linked strategy"}
                    </p>
                    <div className="employee-focus-flags">
                      <span className="pill pill-status-planning">Priority: {task.priority}</span>
                      {task.currentBlockers ? <span className="pill pill-status-blocked">Blocked</span> : null}
                    </div>
                  </div>
                  <div className="employee-focus-meta">
                    <span className={`pill pill-status-${task.status}`}>{statusLabel(task.status)}</span>
                    <span className="subtle mini">{task.dueDate || "No due date"}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="subtle">No assigned tasks yet.</p>
            )}
          </div>
        </section>

        <section id="employee-guide" className="panel section employee-insight-panel">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Daily guide</p>
              <h3>Before you submit your report</h3>
              <p className="subtle">Keep your updates clean so the admin can immediately reuse them in client communication.</p>
            </div>
          </div>
          <div className="mini-list">
            <article className="mini-item employee-guide-item employee-guide-item-olive">
              <span className="employee-guide-kicker">01</span>
              <strong>Update active tasks first</strong>
              <p className="subtle">Log hours, blockers, and outcomes directly inside each task card.</p>
            </article>
            <article className="mini-item employee-guide-item employee-guide-item-gold">
              <span className="employee-guide-kicker">02</span>
              <strong>Write clear result notes</strong>
              <p className="subtle">Use short plain-English summaries the admin can forward without rewriting.</p>
            </article>
            <article className="mini-item employee-guide-item employee-guide-item-sky">
              <span className="employee-guide-kicker">03</span>
              <strong>Report the next step</strong>
              <p className="subtle">Mention the immediate next action so the queue stays predictable for tomorrow.</p>
            </article>
          </div>
        </section>
      </section>

      <section id="employee-reporting" className="panel section table-section employee-report-panel">
        <div className="section-head">
          <div className="section-copy">
            <p className="eyebrow">Daily reporting</p>
            <h3>Your reporting status for today</h3>
            <p className="subtle">Use the sidebar quick action to submit your report after task cards are updated.</p>
          </div>
        </div>
        <div className="summary-inline">
          <span className="pill pill-status-active">{activeTasks.length} tasks in motion</span>
          <span className="pill pill-status-planning">{projectOptions.length} projects assigned</span>
          <span className="pill pill-status-review">{reports.length} reports sent</span>
          <span className="pill pill-status-done">{totalReportedHours}h logged</span>
        </div>
        <div className="summary-grid">
          <div className="summary-card employee-summary-card employee-summary-card-projects">
            <p className="eyebrow">Projects</p>
            <p className="summary-value">{projectOptions.length}</p>
            <p className="subtle">Projects currently assigned to you.</p>
          </div>
          <div className="summary-card employee-summary-card employee-summary-card-reports">
            <p className="eyebrow">Reports sent</p>
            <p className="summary-value">{reports.length}</p>
            <p className="subtle">Saved daily reports already visible to the admin.</p>
          </div>
          <div className="summary-card employee-summary-card employee-summary-card-hours">
            <p className="eyebrow">Hours submitted</p>
            <p className="summary-value">{totalReportedHours}</p>
            <p className="subtle">Total hours reflected in your reports so far.</p>
          </div>
          <div className="summary-card employee-summary-card employee-summary-card-total">
            <p className="eyebrow">Total tasks</p>
            <p className="summary-value">{tasks.length}</p>
            <p className="subtle">Everything currently attached to your account.</p>
          </div>
        </div>
      </section>

      <section id="employee-queue" className="panel section employee-queue-panel">
        <div className="section-head">
          <div className="section-copy">
            <p className="eyebrow">Execution queue</p>
            <h3>My assigned SEO tasks</h3>
            <p className="subtle">
              Update task progress directly from the card so the admin can see your status, results, and blockers in
              real time.
            </p>
          </div>
        </div>
        <div className="stack">
          {tasks.length ? (
            tasks.map((task) => (
              <article key={task.id} className="task-card task-card-strong employee-task-card">
                <div className="task-header employee-task-header">
                  <div className="employee-task-heading">
                    <p className="eyebrow employee-task-kicker">{task.projectName}</p>
                    <h3 className="employee-task-title">{task.title}</h3>
                    <p className="subtle employee-task-strategy">{task.strategyTitle || "No linked strategy"}</p>
                  </div>
                  <span className={`pill pill-status-${task.status} employee-task-status`}>{statusLabel(task.status)}</span>
                </div>
                <p className="employee-task-description">{task.description}</p>
                <div className="task-meta employee-task-meta">
                  <span className="pill pill-status-planning">Priority: {task.priority}</span>
                  <span className="pill pill-status-review">Due: {task.dueDate || "No due date"}</span>
                  <span className="pill pill-status-active">
                    {task.actualHours}h logged / {task.estimatedHours}h estimated
                  </span>
                </div>
                {task.currentBlockers ? (
                  <div className="employee-blocker-note">
                    <span className="pill pill-status-blocked">Blocked</span>
                    <p className="subtle mini">{task.currentBlockers}</p>
                  </div>
                ) : null}
                <form action={updateTaskProgressAction} className="form-grid employee-task-form">
                  <input type="hidden" name="taskId" value={task.id} />
                  <div className="field">
                    <label className="label" htmlFor={`status-${task.id}`}>
                      Status
                    </label>
                    <select id={`status-${task.id}`} name="status" className="select form-select" defaultValue={task.status}>
                      {TASK_WORKFLOW_STEPS.map((step) => (
                        <option key={step.value} value={step.value}>
                          {step.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor={`time-${task.id}`}>
                      Time spent now
                    </label>
                    <input
                      id={`time-${task.id}`}
                      name="timeSpentHours"
                      type="number"
                      step="0.5"
                      min="0"
                      className="input form-control"
                      defaultValue="0.5"
                    />
                  </div>
                  <div className="field field-full">
                    <label className="label" htmlFor={`outcome-${task.id}`}>
                      Result update
                    </label>
                    <textarea
                      id={`outcome-${task.id}`}
                      name="outcome"
                      className="textarea form-control"
                      defaultValue={task.resultNote}
                    />
                  </div>
                  <div className="field field-full">
                    <label className="label" htmlFor={`blockers-${task.id}`}>
                      Blockers
                    </label>
                    <textarea
                      id={`blockers-${task.id}`}
                      name="blockers"
                      className="textarea form-control"
                      defaultValue={task.currentBlockers}
                      placeholder="Leave blank once the blocker is resolved"
                    />
                  </div>
                  <div className="field field-full">
                    <button className="button button-primary btn btn-warning" type="submit">
                      Save task update
                    </button>
                  </div>
                </form>
              </article>
            ))
          ) : (
            <div className="report-empty">No tasks are assigned to you yet.</div>
          )}
        </div>
      </section>

      <section id="employee-activity" className="panel section table-section employee-history-panel">
        <div className="section-head">
          <div className="section-copy">
            <p className="eyebrow">History</p>
            <h3>Your recent report history</h3>
            <p className="subtle">Recent daily reports stay visible here after each submission.</p>
          </div>
        </div>
        <div className="report-list">
          {recentReports.length ? (
            recentReports.map((report) => (
              <article key={report.id} className="report-card employee-report-card">
                <div className="report-meta">
                  <span className="pill pill-status-planning">{report.reportDate}</span>
                  <span className="pill pill-status-review">{report.totalHours}h logged</span>
                </div>
                <strong className="employee-report-title">{report.projectName}</strong>
                <p className="employee-report-summary">{report.summary}</p>
                <p className="subtle mini">Next: {report.nextSteps}</p>
              </article>
            ))
          ) : (
            <div className="report-empty">No daily reports submitted yet.</div>
          )}
        </div>
      </section>
    </EmployeeWorkspaceShell>
  );
}
