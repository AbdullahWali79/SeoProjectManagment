import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/data";
import { formatHumanDate } from "@/lib/report-export";
import { PrintReportButton } from "@/components/dashboard/print-report-button";

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const { date } = await searchParams;
  const data = await getAdminDashboardData(date);
  const reportDateQuery = encodeURIComponent(data.activeReportDate);

  return (
    <main className="print-shell">
      <div className="print-actions">
        <a className="button button-ghost compact-button" href="/dashboard">
          Back to dashboard
        </a>
        <a className="button button-ghost compact-button" href={`/dashboard/reports/export?date=${reportDateQuery}`}>
          Export Excel
        </a>
        <PrintReportButton />
      </div>

      <section className="print-page">
        <header className="print-header">
          <div>
            <p className="eyebrow">Client-ready daily report</p>
            <h1>Operations report for {formatHumanDate(data.activeReportDate)}</h1>
            <p className="subtle">
              Prepared from the internal SEO operations dashboard. Use this layout for printing or saving as a PDF.
            </p>
          </div>
          <div className="print-summary-grid">
            <div className="summary-card">
              <p className="eyebrow">Hours logged</p>
              <p className="summary-value">{data.reportSummary.totalHours}</p>
            </div>
            <div className="summary-card">
              <p className="eyebrow">Reports</p>
              <p className="summary-value">{data.reportSummary.reportsCount}</p>
            </div>
            <div className="summary-card">
              <p className="eyebrow">Team members</p>
              <p className="summary-value">{data.reportSummary.employeeCount}</p>
            </div>
            <div className="summary-card">
              <p className="eyebrow">Projects</p>
              <p className="summary-value">{data.reportSummary.projectCount}</p>
            </div>
          </div>
        </header>

        <section className="print-section">
          <h2>Daily report entries</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Project</th>
                <th>Hours</th>
                <th>Summary</th>
                <th>Next steps</th>
              </tr>
            </thead>
            <tbody>
              {data.reports.length ? (
                data.reports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.userName}</td>
                    <td>{report.projectName}</td>
                    <td>{report.totalHours}</td>
                    <td>{report.summary}</td>
                    <td>{report.nextSteps}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No daily reports were submitted for this date.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="print-grid">
          <section className="print-section">
            <h2>Project snapshot</h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((project) => {
                  const totalTasks = Number(project.totalTasks || 0);
                  const completedTasks = Number(project.completedTasks || 0);
                  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                  return (
                    <tr key={project.id}>
                      <td>{project.name}</td>
                      <td>{project.clientName}</td>
                      <td>{statusLabel(project.displayStatus ?? project.status)}</td>
                      <td>{progress}%</td>
                      <td>{project.dueDate || "No deadline"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="print-section">
            <h2>Current task snapshot</h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th>Effort</th>
                </tr>
              </thead>
              <tbody>
                {data.tasks.slice(0, 12).map((task) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{task.projectName}</td>
                    <td>{task.assigneeName}</td>
                    <td>{statusLabel(task.status)}</td>
                    <td>
                      {task.actualHours}h / {task.estimatedHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </section>
      </section>
    </main>
  );
}
