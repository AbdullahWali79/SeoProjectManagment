import { logoutAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getAdminDashboardData, getEmployeeDashboardData } from "@/lib/data";
import { AdminView } from "@/components/dashboard/admin-view";
import { EmployeeView } from "@/components/dashboard/employee-view";

function MessageNotice({ message }: { message?: string }) {
  if (!message) return null;

  const map: Record<string, string> = {
    "user-created": "New user saved successfully.",
    "project-created": "Project created successfully.",
    "project-updated": "Project updated successfully.",
    "project-archived": "Project archived successfully.",
    "project-restored": "Project restored successfully.",
    "project-deleted": "Project deleted permanently.",
    "strategy-created": "Strategy saved successfully.",
    "task-created": "Task assigned successfully.",
    "task-updated": "Task progress updated successfully.",
    "report-saved": "Daily report saved successfully.",
  };

  if (!map[message]) return null;
  return <div className="notice">{map[message]}</div>;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; reportDate?: string }>;
}) {
  const user = await requireUser();
  const { message, reportDate } = await searchParams;

  const adminData = user.role === "admin" ? await getAdminDashboardData(reportDate) : null;
  const employeeData = user.role === "employee" ? await getEmployeeDashboardData(user.id) : null;
  const heroPrimaryMetric =
    user.role === "admin"
      ? `${adminData?.stats.openTasks ?? 0}`
      : `${employeeData?.tasks.filter((task) => task.status !== "done").length ?? 0}`;
  const heroPrimaryLabel = user.role === "admin" ? "Open tasks in motion" : "Assigned tasks in motion";
  const heroSecondaryMetric =
    user.role === "admin"
      ? `${adminData?.stats.todayHours ?? 0}`
      : `${employeeData?.reports.length ?? 0}`;
  const heroSecondaryLabel = user.role === "admin" ? "Hours logged today" : "Reports submitted";

  return (
    <main className="shell dashboard-shell">
      <section className={`panel dashboard-banner ${user.role === "admin" ? "dashboard-banner-admin" : "dashboard-banner-employee"}`}>
        <div className="row g-4 align-items-center">
          <div className="col-xl-8">
            <div className="brand">
          <p className="eyebrow">{user.role === "admin" ? "Admin workspace" : "Employee workspace"}</p>
              <h1 className="display dashboard-banner-title">
                {user.role === "admin"
                  ? "Manage projects, tasks, reports, and client progress in one place."
                  : "Update assigned SEO tasks and submit your daily report."}
              </h1>
              <p className="dashboard-banner-copy">
                Signed in as <strong>{user.fullName}</strong> ({user.email})
              </p>
              <div className="dashboard-banner-tags d-flex flex-wrap gap-2">
                <span className="dashboard-tag">Client reporting</span>
                <span className="dashboard-tag">Task control</span>
                <span className="dashboard-tag">Daily visibility</span>
              </div>
            </div>
          </div>
          <div className="col-xl-4">
            <div className="dashboard-banner-side">
              <div className="dashboard-kpi-grid">
                <div className="dashboard-kpi">
                  <span className="dashboard-kpi-label">{heroPrimaryLabel}</span>
                  <strong className="dashboard-kpi-value">{heroPrimaryMetric}</strong>
                </div>
                <div className="dashboard-kpi">
                  <span className="dashboard-kpi-label">{heroSecondaryLabel}</span>
                  <strong className="dashboard-kpi-value">{heroSecondaryMetric}</strong>
                </div>
              </div>
              <form action={logoutAction}>
                <button className="button button-ghost btn btn-light btn-lg w-100 shadow-sm" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <MessageNotice message={message} />

      {adminData ? <AdminView {...adminData} /> : null}
      {employeeData ? <EmployeeView {...employeeData} /> : null}
    </main>
  );
}
