import { getCurrentUser } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/data";
import { buildDailyReportWorkbook } from "@/lib/report-export";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const reportDate = searchParams.get("date") ?? undefined;
  const data = await getAdminDashboardData(reportDate);

  const workbook = buildDailyReportWorkbook({
    reportDate: data.activeReportDate,
    reportSummary: data.reportSummary,
    reports: data.reports,
    projects: data.projects,
    tasks: data.tasks,
  });

  return new Response(workbook, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="daily-report-${data.activeReportDate}.xls"`,
      "Cache-Control": "no-store",
    },
  });
}
