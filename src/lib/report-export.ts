import type { AdminDailyReportRow, DashboardTaskRow } from "@/lib/data";

type WorkbookCell =
  | string
  | number
  | {
      value: string | number;
      styleId?: string;
      type?: "String" | "Number";
      mergeAcross?: number;
    };

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatCell(cell: WorkbookCell) {
  if (typeof cell === "object") {
    return {
      value: cell.value,
      styleId: cell.styleId,
      type: cell.type ?? (typeof cell.value === "number" ? "Number" : "String"),
      mergeAcross: cell.mergeAcross,
    };
  }

  return {
    value: cell,
    styleId: undefined,
    type: typeof cell === "number" ? "Number" : "String",
    mergeAcross: undefined,
  };
}

function asCell(cell: WorkbookCell) {
  const formatted = formatCell(cell);
  const style = formatted.styleId ? ` ss:StyleID="${formatted.styleId}"` : "";
  const mergeAcross = typeof formatted.mergeAcross === "number" ? ` ss:MergeAcross="${formatted.mergeAcross}"` : "";
  const value = formatted.type === "Number" ? String(formatted.value) : escapeXml(String(formatted.value));

  return `<Cell${style}${mergeAcross}><Data ss:Type="${formatted.type}">${value}</Data></Cell>`;
}

function asWorksheet(name: string, rows: WorkbookCell[][], columnWidths: number[]) {
  const columnsXml = columnWidths.map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`).join("");
  const rowsXml = rows
    .map((row) => `<Row>${row.map((cell) => asCell(cell)).join("")}</Row>`)
    .join("");

  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${columnsXml}${rowsXml}</Table></Worksheet>`;
}

export function formatHumanDate(date: string) {
  const [year, month, day] = date.split("-").map((part) => Number(part));

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function buildDailyReportWorkbook({
  reportDate,
  reportSummary,
  reports,
  projects,
  tasks,
}: {
  reportDate: string;
  reportSummary: {
    totalHours: number;
    reportsCount: number;
    employeeCount: number;
    projectCount: number;
  };
  reports: AdminDailyReportRow[];
  projects: Array<{
    name: string;
    clientName: string;
    status: string;
    dueDate: string | null;
    totalTasks: number;
    completedTasks: number | null;
  }>;
  tasks: DashboardTaskRow[];
}) {
  const reportRows: WorkbookCell[][] = [
    [{ value: `Daily SEO Operations Report - ${formatHumanDate(reportDate)}`, styleId: "Title", mergeAcross: 4 }],
    [{ value: "Report date", styleId: "MetaLabel" }, { value: reportDate, styleId: "MetaValue" }],
    [{ value: "Total hours logged", styleId: "MetaLabel" }, { value: reportSummary.totalHours, styleId: "NumberValue" }],
    [{ value: "Reports submitted", styleId: "MetaLabel" }, { value: reportSummary.reportsCount, styleId: "MetaValue" }],
    [{ value: "Team members reporting", styleId: "MetaLabel" }, { value: reportSummary.employeeCount, styleId: "MetaValue" }],
    [{ value: "Projects covered", styleId: "MetaLabel" }, { value: reportSummary.projectCount, styleId: "MetaValue" }],
    [],
    [
      { value: "Employee", styleId: "Header" },
      { value: "Project", styleId: "Header" },
      { value: "Hours", styleId: "Header" },
      { value: "Summary", styleId: "Header" },
      { value: "Next steps", styleId: "Header" },
    ],
    ...(reports.length
      ? reports.map((report) => [
          { value: report.userName, styleId: "Body" },
          { value: report.projectName, styleId: "Body" },
          { value: report.totalHours, styleId: "NumberValue" },
          { value: report.summary, styleId: "Wrap" },
          { value: report.nextSteps, styleId: "Wrap" },
        ])
      : [[{ value: "No daily reports were submitted for this date.", styleId: "Empty", mergeAcross: 4 }]]),
  ];

  const projectRows: WorkbookCell[][] = [
    [{ value: "Project Snapshot", styleId: "Title", mergeAcross: 4 }],
    [],
    [
      { value: "Project", styleId: "Header" },
      { value: "Client", styleId: "Header" },
      { value: "Status", styleId: "Header" },
      { value: "Progress", styleId: "Header" },
      { value: "Due date", styleId: "Header" },
    ],
    ...projects.map((project) => {
      const totalTasks = Number(project.totalTasks || 0);
      const completedTasks = Number(project.completedTasks || 0);
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return [
        { value: project.name, styleId: "Body" },
        { value: project.clientName, styleId: "Body" },
        { value: project.status.replaceAll("_", " "), styleId: "Body" },
        { value: `${progress}%`, styleId: "Body" },
        { value: project.dueDate || "No deadline", styleId: "Body" },
      ];
    }),
  ];

  const taskRows: WorkbookCell[][] = [
    [{ value: "Task Snapshot", styleId: "Title", mergeAcross: 6 }],
    [],
    [
      { value: "Task", styleId: "Header" },
      { value: "Project", styleId: "Header" },
      { value: "Assignee", styleId: "Header" },
      { value: "Status", styleId: "Header" },
      { value: "Actual hours", styleId: "Header" },
      { value: "Estimated hours", styleId: "Header" },
      { value: "Result", styleId: "Header" },
    ],
    ...tasks.map((task) => [
      { value: task.title, styleId: "Body" },
      { value: task.projectName, styleId: "Body" },
      { value: task.assigneeName, styleId: "Body" },
      { value: task.status.replaceAll("_", " "), styleId: "Body" },
      { value: task.actualHours, styleId: "NumberValue" },
      { value: task.estimatedHours, styleId: "NumberValue" },
      { value: task.resultNote || "Awaiting update", styleId: "Wrap" },
    ]),
  ];

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Top"/>
      <Borders/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>
    <Style ss:ID="Title">
      <Alignment ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0F4C81" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="MetaLabel">
      <Alignment ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
      <Interior ss:Color="#EAF3FF" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="MetaValue">
      <Alignment ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="NumberValue">
      <Alignment ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11"/>
      <NumberFormat ss:Format="0.0"/>
    </Style>
    <Style ss:ID="Header">
      <Alignment ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#2364AA" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Body">
      <Alignment ss:Vertical="Top"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="Wrap">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="Empty">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#526174"/>
    </Style>
  </Styles>
  ${asWorksheet("Daily Reports", reportRows, [130, 180, 70, 320, 320])}
  ${asWorksheet("Project Snapshot", projectRows, [220, 180, 110, 90, 110])}
  ${asWorksheet("Task Snapshot", taskRows, [240, 180, 160, 110, 90, 100, 280])}
</Workbook>`;
}
