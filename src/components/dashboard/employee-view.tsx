import { updateTaskProgressAction } from "@/app/actions";
import { EmployeeReportCenter } from "@/components/dashboard/employee-report-center";

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
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
  return (
    <section className="dashboard-grid employee-dashboard">
      <div className="primary-column stack">
        <section className="panel section">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">My execution board</p>
              <h3>Assigned SEO tasks</h3>
              <p className="subtle">
                Update task progress directly from the card so the admin can see your status, results, and blockers in
                real time.
              </p>
            </div>
          </div>
          <div className="stack">
            {tasks.map((task) => (
              <article key={task.id} className="task-card task-card-strong">
                <div className="task-header">
                  <div>
                    <h3 style={{ margin: 0 }}>{task.title}</h3>
                    <p className="subtle" style={{ marginBottom: 0 }}>
                      {task.projectName} | {task.strategyTitle || "No linked strategy"}
                    </p>
                  </div>
                  <span className={`pill pill-status-${task.status}`}>{statusLabel(task.status)}</span>
                </div>
                <p style={{ margin: 0 }}>{task.description}</p>
                <div className="task-meta">
                  <span className="pill pill-status-planning">Priority: {task.priority}</span>
                  <span className="pill pill-status-review">Due: {task.dueDate || "No due date"}</span>
                  <span className="pill pill-status-active">
                    {task.actualHours}h logged / {task.estimatedHours}h estimated
                  </span>
                </div>
                <form action={updateTaskProgressAction} className="form-grid">
                  <input type="hidden" name="taskId" value={task.id} />
                  <div className="field">
                    <label className="label" htmlFor={`status-${task.id}`}>
                      Status
                    </label>
                    <select id={`status-${task.id}`} name="status" className="select form-select" defaultValue={task.status}>
                      <option value="todo">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
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
                      placeholder="Optional blockers or dependency notes"
                    />
                  </div>
                  <div className="field field-full">
                    <button className="button button-primary btn btn-warning" type="submit">
                      Save task update
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="side-rail">
        <EmployeeReportCenter projectOptions={projectOptions} reportCount={reports.length} />

        <section className="panel section table-section">
          <div className="section-head">
            <div className="section-copy">
              <p className="eyebrow">Recent reports</p>
              <h3>Your submitted updates</h3>
              <p className="subtle">Recent daily reports stay visible here after each submission.</p>
            </div>
          </div>
          <div className="report-list">
            {reports.map((report) => (
              <article key={report.id} className="report-card">
                <div className="report-meta">
                  <span className="pill pill-status-planning">{report.reportDate}</span>
                  <span className="pill pill-status-review">{report.totalHours}h logged</span>
                </div>
                <strong>{report.projectName}</strong>
                <p>{report.summary}</p>
                <p className="subtle mini">Next: {report.nextSteps}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
