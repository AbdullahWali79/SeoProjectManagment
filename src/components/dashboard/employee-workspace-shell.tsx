"use client";

import { useEffect, useState } from "react";

import { submitDailyReportAction } from "@/app/actions";
import { DashboardModal } from "@/components/dashboard/dashboard-modal";

type IconName = "panel" | "list" | "report" | "activity" | "folder" | "spark" | "collapse" | "expand";

type SidebarItem = {
  href?: string;
  label: string;
  note: string;
  icon: IconName;
  action?: () => void;
};

function SidebarIcon({ name }: { name: IconName }) {
  switch (name) {
    case "list":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
        </svg>
      );
    case "report":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm7 1v5h5" />
          <path d="M9 13h6M9 17h6M9 9h2" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12h4l2.5-5 5 10 2.5-5H21" />
        </svg>
      );
    case "folder":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v5M12 16v5M4 12h5M15 12h5M6.8 6.8l3.5 3.5M13.7 13.7l3.5 3.5M17.2 6.8l-3.5 3.5M10.3 13.7l-3.5 3.5" />
        </svg>
      );
    case "collapse":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18 9 12l6-6" />
        </svg>
      );
    case "expand":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "panel":
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16v14H4z" />
          <path d="M9 5v14" />
        </svg>
      );
  }
}

function SidebarLink({
  item,
  collapsed,
}: {
  item: SidebarItem;
  collapsed: boolean;
}) {
  const content = (
    <>
      <span className="employee-nav-icon">
        <SidebarIcon name={item.icon} />
      </span>
      <span className="employee-nav-copy">
        <strong>{item.label}</strong>
        <span>{item.note}</span>
      </span>
    </>
  );

  if (item.href) {
    return (
      <a className="employee-nav-link" href={item.href} aria-label={item.label} title={collapsed ? item.label : undefined}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="employee-nav-link employee-nav-button"
      onClick={item.action}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
    >
      {content}
    </button>
  );
}

export function EmployeeWorkspaceShell({
  stats,
  projectOptions,
  children,
}: {
  stats: {
    totalTasks: number;
    activeTasks: number;
    reportCount: number;
    totalHours: number;
  };
  projectOptions: Array<{ id: string; name: string }>;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("employee-sidebar-collapsed");
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("employee-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const navigationItems: SidebarItem[] = [
    {
      href: "#employee-overview",
      label: "Overview",
      note: "My workday snapshot",
      icon: "panel",
    },
    {
      href: "#employee-reporting",
      label: "Daily report",
      note: "Submit and review today",
      icon: "report",
    },
    {
      href: "#employee-queue",
      label: "My tasks",
      note: "Assigned execution work",
      icon: "list",
    },
    {
      href: "#employee-activity",
      label: "History",
      note: "Recent submissions",
      icon: "activity",
    },
    {
      href: "#employee-guide",
      label: "Guide",
      note: "Checklist and focus",
      icon: "folder",
    },
  ];

  return (
    <>
      <section className={`employee-shell ${collapsed ? "employee-shell-collapsed" : ""}`}>
        <aside className="panel employee-sidebar">
          <div className="employee-sidebar-head">
            <button
              type="button"
              className="employee-sidebar-toggle"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="employee-nav-icon">
                <SidebarIcon name={collapsed ? "expand" : "collapse"} />
              </span>
              <span className="employee-sidebar-toggle-copy">
                {collapsed ? "Expand menu" : "Collapse menu"}
              </span>
            </button>

            <div className="employee-sidebar-brand">
              <p className="eyebrow">Employee workspace</p>
              <h2>Delivery desk</h2>
              <p className="subtle">
                Keep your own tasks, reports, and updates inside one compact control rail.
              </p>
            </div>
          </div>

          <div className="employee-sidebar-group">
            <p className="eyebrow employee-sidebar-group-title">Navigation</p>
            <nav className="employee-sidebar-nav" aria-label="Employee sections">
              {navigationItems.map((item) => (
                <SidebarLink key={item.label} item={item} collapsed={collapsed} />
              ))}
            </nav>
          </div>

          <div className="employee-sidebar-group">
            <p className="eyebrow employee-sidebar-group-title">Quick actions</p>
            <div className="employee-sidebar-actions">
              <SidebarLink
                item={{
                  label: "Daily report",
                  note: "Send today update",
                  icon: "spark",
                  action: () => setOpen(true),
                }}
                collapsed={collapsed}
              />
            </div>
          </div>

          <div className="employee-sidebar-group employee-sidebar-metrics">
            <div className="employee-sidebar-metric">
              <span className="employee-nav-icon">
                <SidebarIcon name="folder" />
              </span>
              <div className="employee-sidebar-metric-copy">
                <strong>{projectOptions.length}</strong>
                <span>Assigned projects</span>
              </div>
            </div>
            <div className="employee-sidebar-metric">
              <span className="employee-nav-icon">
                <SidebarIcon name="list" />
              </span>
              <div className="employee-sidebar-metric-copy">
                <strong>{stats.activeTasks}</strong>
                <span>My tasks active</span>
              </div>
            </div>
            <div className="employee-sidebar-metric">
              <span className="employee-nav-icon">
                <SidebarIcon name="report" />
              </span>
              <div className="employee-sidebar-metric-copy">
                <strong>{stats.reportCount}</strong>
                <span>Reports sent</span>
              </div>
            </div>
            <div className="employee-sidebar-metric">
              <span className="employee-nav-icon">
                <SidebarIcon name="spark" />
              </span>
              <div className="employee-sidebar-metric-copy">
                <strong>{stats.totalHours}</strong>
                <span>Hours logged</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="employee-workspace">{children}</div>
      </section>

      {open ? (
        <DashboardModal
          title="Submit your daily report"
          description="Summarize completed work, logged hours, and the next steps so the admin can review everything in one place."
          onClose={() => setOpen(false)}
        >
          <form action={submitDailyReportAction} className="form-grid">
            <div className="field">
              <label className="label" htmlFor="employee-projectId">
                Project
              </label>
              <select id="employee-projectId" name="projectId" className="select form-select">
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="employee-reportDate">
                Report date
              </label>
              <input
                id="employee-reportDate"
                name="reportDate"
                type="date"
                className="input form-control"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="employee-totalHours">
                Total hours
              </label>
              <input
                id="employee-totalHours"
                name="totalHours"
                type="number"
                min="0"
                step="0.5"
                className="input form-control"
                defaultValue="1"
              />
            </div>
            <div className="field field-full">
              <label className="label" htmlFor="employee-summary">
                What did you complete?
              </label>
              <textarea id="employee-summary" name="summary" className="textarea form-control" />
            </div>
            <div className="field field-full">
              <label className="label" htmlFor="employee-nextSteps">
                Next steps
              </label>
              <textarea id="employee-nextSteps" name="nextSteps" className="textarea form-control" />
            </div>
            <div className="field field-full">
              <button className="button button-secondary btn btn-primary" type="submit">
                Save daily report
              </button>
            </div>
          </form>
        </DashboardModal>
      ) : null}
    </>
  );
}
