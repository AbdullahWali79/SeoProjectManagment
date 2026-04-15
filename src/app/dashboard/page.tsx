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

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <p className="eyebrow">{user.role === "admin" ? "Admin workspace" : "Employee workspace"}</p>
          <h1 className="display" style={{ fontSize: "clamp(2rem, 3vw, 3.2rem)" }}>
            {user.role === "admin"
              ? "Manage projects, tasks, reports, and client progress in one place."
              : "Update assigned SEO tasks and submit your daily report."}
          </h1>
          <p className="subtle" style={{ maxWidth: 780 }}>
            Signed in as <strong>{user.fullName}</strong> ({user.email})
          </p>
        </div>
        <form action={logoutAction}>
          <button className="button button-ghost" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <MessageNotice message={message} />

      {adminData ? <AdminView {...adminData} /> : null}
      {employeeData ? <EmployeeView {...employeeData} /> : null}
    </main>
  );
}
