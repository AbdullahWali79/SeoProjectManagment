"use client";

import { useEffect, useState } from "react";

import {
  createProjectAction,
  createStrategyAction,
  createTaskAction,
  createUserAction,
} from "@/app/actions";
import { DashboardModal } from "@/components/dashboard/dashboard-modal";
import type { AppRole } from "@/lib/auth";
import { TASK_WORKFLOW_STEPS } from "@/lib/task-workflow";

type ModalKey = "user" | "project" | "strategy" | "task" | null;

type SidebarItem = {
  href?: string;
  label: string;
  note: string;
  icon: IconName;
  disabled?: boolean;
  action?: () => void;
};

type IconName =
  | "panel"
  | "folder"
  | "list"
  | "report"
  | "activity"
  | "team"
  | "user-plus"
  | "folder-plus"
  | "map"
  | "spark"
  | "collapse"
  | "expand";

function SidebarIcon({ name }: { name: IconName }) {
  switch (name) {
    case "folder":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
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
    case "team":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16.5 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "user-plus":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          <path d="M19 8v6M16 11h6" />
        </svg>
      );
    case "folder-plus":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M12 11v5M9.5 13.5h5" />
        </svg>
      );
    case "map":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
          <path d="M9 4v14M15 6v14" />
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
      <span className="admin-nav-icon">
        <SidebarIcon name={item.icon} />
      </span>
      <span className="admin-nav-copy">
        <strong>{item.label}</strong>
        <span>{item.note}</span>
      </span>
    </>
  );

  if (item.href) {
    return (
      <a className="admin-nav-link" href={item.href} aria-label={item.label} title={collapsed ? item.label : undefined}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="admin-nav-link admin-nav-button"
      onClick={item.action}
      disabled={item.disabled}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
    >
      {content}
    </button>
  );
}

export function AdminWorkspaceShell({
  stats,
  employees,
  projects,
  strategies,
  children,
}: {
  stats: {
    totalProjects: number;
    openTasks: number;
    activeEmployees: number;
    todayHours: number;
  };
  employees: Array<{ id: string; fullName: string; email: string; role: AppRole }>;
  projects: Array<{ id: string; name: string; clientName: string; status: string }>;
  strategies: Array<{ id: string; title: string; projectId: string; projectName: string }>;
  children: React.ReactNode;
}) {
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("admin-sidebar-collapsed");
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("admin-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const employeeOptions = employees.filter((employee) => employee.role === "employee");

  const navigationItems: SidebarItem[] = [
    {
      href: "#admin-overview",
      label: "Overview",
      note: "Daily command view",
      icon: "panel",
    },
    {
      href: "#admin-health",
      label: "Health",
      note: "Central dashboard",
      icon: "activity",
    },
    {
      href: "#admin-reports",
      label: "Reports",
      note: "Daily report pack",
      icon: "report",
    },
    {
      href: "#admin-queue",
      label: "Queue",
      note: "Command center",
      icon: "list",
    },
    {
      href: "#admin-projects",
      label: "Projects",
      note: "Client portfolio",
      icon: "folder",
    },
    {
      href: "#admin-activity",
      label: "Activity",
      note: "Recent updates",
      icon: "activity",
    },
    {
      href: "#admin-team",
      label: "Team",
      note: "People and strategy",
      icon: "team",
    },
  ];

  const actionItems: SidebarItem[] = [
    {
      label: "New user",
      note: "Add admin or employee",
      icon: "user-plus",
      action: () => setActiveModal("user"),
    },
    {
      label: "New project",
      note: "Capture client scope",
      icon: "folder-plus",
      action: () => setActiveModal("project"),
    },
    {
      label: "New strategy",
      note: "Save delivery plan",
      icon: "map",
      disabled: projects.length === 0,
      action: () => setActiveModal("strategy"),
    },
    {
      label: "New task",
      note: "Assign execution work",
      icon: "spark",
      disabled: projects.length === 0 || employeeOptions.length === 0,
      action: () => setActiveModal("task"),
    },
  ];

  return (
    <>
      <section className={`admin-shell ${collapsed ? "admin-shell-collapsed" : ""}`}>
        <aside className="panel admin-sidebar">
          <div className="admin-sidebar-head">
            <button
              type="button"
              className="admin-sidebar-toggle"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="admin-nav-icon">
                <SidebarIcon name={collapsed ? "expand" : "collapse"} />
              </span>
              <span className="admin-sidebar-toggle-copy">
                {collapsed ? "Expand menu" : "Collapse menu"}
              </span>
            </button>

            <div className="admin-sidebar-brand">
              <p className="eyebrow">Admin system</p>
              <h2>SEO operations</h2>
              <p className="subtle">
                Keep navigation, creation flows, and the daily queue inside one compact control rail.
              </p>
            </div>
          </div>

          <div className="admin-sidebar-group">
            <p className="eyebrow admin-sidebar-group-title">Navigation</p>
            <nav className="admin-sidebar-nav" aria-label="Admin sections">
              {navigationItems.map((item) => (
                <SidebarLink key={item.label} item={item} collapsed={collapsed} />
              ))}
            </nav>
          </div>

          <div className="admin-sidebar-group">
            <p className="eyebrow admin-sidebar-group-title">Quick actions</p>
            <div className="admin-sidebar-actions">
              {actionItems.map((item) => (
                <SidebarLink key={item.label} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>

          <div className="admin-sidebar-group admin-sidebar-metrics">
            <div className="admin-sidebar-metric">
              <span className="admin-nav-icon">
                <SidebarIcon name="folder" />
              </span>
              <div className="admin-sidebar-metric-copy">
                <strong>{stats.totalProjects}</strong>
                <span>Projects live</span>
              </div>
            </div>
            <div className="admin-sidebar-metric">
              <span className="admin-nav-icon">
                <SidebarIcon name="list" />
              </span>
              <div className="admin-sidebar-metric-copy">
                <strong>{stats.openTasks}</strong>
                <span>Open tasks</span>
              </div>
            </div>
            <div className="admin-sidebar-metric">
              <span className="admin-nav-icon">
                <SidebarIcon name="team" />
              </span>
              <div className="admin-sidebar-metric-copy">
                <strong>{stats.activeEmployees}</strong>
                <span>Active employees</span>
              </div>
            </div>
            <div className="admin-sidebar-metric">
              <span className="admin-nav-icon">
                <SidebarIcon name="report" />
              </span>
              <div className="admin-sidebar-metric-copy">
                <strong>{stats.todayHours}</strong>
                <span>Hours today</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="admin-workspace">{children}</div>
      </section>

      {activeModal === "user" ? (
        <DashboardModal
          title="Create admin or employee"
          description="Add a new team member with the correct role so they can access the dashboard immediately."
          onClose={() => setActiveModal(null)}
        >
          <form action={createUserAction} className="form-grid">
            <div className="field">
              <label className="label" htmlFor="modal-fullName">
                Full name
              </label>
              <input id="modal-fullName" name="fullName" className="input form-control" />
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-email">
                Email
              </label>
              <input id="modal-email" name="email" type="email" className="input form-control" />
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-password">
                Password
              </label>
              <input id="modal-password" name="password" type="password" className="input form-control" defaultValue="Passw0rd!" />
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-role">
                Role
              </label>
              <select id="modal-role" name="role" className="select form-select" defaultValue="employee">
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <div className="field field-full">
              <button className="button button-secondary btn btn-primary" type="submit">
                Save user
              </button>
            </div>
          </form>
        </DashboardModal>
      ) : null}

      {activeModal === "project" ? (
        <DashboardModal
          title="Create a client project"
          description="Capture the source, client, scope summary, and target deadline before assigning work."
          onClose={() => setActiveModal(null)}
        >
          <form action={createProjectAction} className="form-grid">
            <div className="field">
              <label className="label" htmlFor="modal-project-name">
                Project name
              </label>
              <input id="modal-project-name" name="name" className="input form-control" />
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-client-name">
                Client name
              </label>
              <input id="modal-client-name" name="clientName" className="input form-control" />
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-source">
                Source
              </label>
              <input id="modal-source" name="sourceChannel" className="input form-control" placeholder="Fiverr, Upwork, referral" />
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-project-status">
                Status
              </label>
              <select id="modal-project-status" name="status" className="select form-select" defaultValue="planning">
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-project-due">
                Due date
              </label>
              <input id="modal-project-due" name="dueDate" type="date" className="input form-control" />
            </div>
            <div className="field field-full">
              <label className="label" htmlFor="modal-project-summary">
                Summary
              </label>
              <textarea id="modal-project-summary" name="summary" className="textarea form-control" />
            </div>
            <div className="field field-full">
              <button className="button button-primary btn btn-warning" type="submit">
                Create project
              </button>
            </div>
          </form>
        </DashboardModal>
      ) : null}

      {activeModal === "strategy" ? (
        <DashboardModal
          title="Save a project strategy"
          description="Document the plan and objective so task assignments stay tied to a clear direction."
          onClose={() => setActiveModal(null)}
        >
          <form action={createStrategyAction} className="form-grid">
            <div className="field">
              <label className="label" htmlFor="modal-strategy-project">
                Project
              </label>
              <select id="modal-strategy-project" name="projectId" className="select form-select">
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-strategy-title">
                Strategy title
              </label>
              <input id="modal-strategy-title" name="title" className="input form-control" />
            </div>
            <div className="field field-full">
              <label className="label" htmlFor="modal-strategy-summary">
                Strategy summary
              </label>
              <textarea id="modal-strategy-summary" name="summary" className="textarea form-control" />
            </div>
            <div className="field field-full">
              <label className="label" htmlFor="modal-strategy-objective">
                Objective
              </label>
              <textarea id="modal-strategy-objective" name="objective" className="textarea form-control" />
            </div>
            <div className="field field-full">
              <button className="button button-secondary btn btn-primary" type="submit">
                Save strategy
              </button>
            </div>
          </form>
        </DashboardModal>
      ) : null}

      {activeModal === "task" ? (
        <DashboardModal
          title="Assign the next SEO task"
          description="Push the next deliverable to the right assignee without losing sight of current reporting."
          onClose={() => setActiveModal(null)}
        >
          <form action={createTaskAction} className="form-grid">
            <div className="field">
              <label className="label" htmlFor="modal-task-project">
                Project
              </label>
              <select id="modal-task-project" name="projectId" className="select form-select">
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-task-strategy">
                Strategy
              </label>
              <select id="modal-task-strategy" name="strategyId" className="select form-select">
                <option value="">No linked strategy</option>
                {strategies.map((strategy) => (
                  <option key={strategy.id} value={strategy.id}>
                    {strategy.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-task-title">
                Task title
              </label>
              <input id="modal-task-title" name="title" className="input form-control" />
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-task-assignee">
                Assign to
              </label>
              <select id="modal-task-assignee" name="assigneeId" className="select form-select">
                <option value="">Unassigned for now</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-task-priority">
                Priority
              </label>
              <select id="modal-task-priority" name="priority" className="select form-select" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-task-status">
                Initial status
              </label>
              <select id="modal-task-status" name="status" className="select form-select" defaultValue="backlog">
                {TASK_WORKFLOW_STEPS.map((step) => (
                  <option key={step.value} value={step.value}>
                    {step.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-task-hours">
                Estimated hours
              </label>
              <input id="modal-task-hours" name="estimatedHours" type="number" step="0.5" min="0" className="input form-control" defaultValue="1" />
            </div>
            <div className="field">
              <label className="label" htmlFor="modal-task-due">
                Due date
              </label>
              <input id="modal-task-due" name="dueDate" type="date" className="input form-control" />
            </div>
            <div className="field field-full">
              <label className="label" htmlFor="modal-task-description">
                Work details
              </label>
              <textarea id="modal-task-description" name="description" className="textarea form-control" />
            </div>
            <div className="field field-full">
              <button className="button button-primary btn btn-warning" type="submit">
                Assign task
              </button>
            </div>
          </form>
        </DashboardModal>
      ) : null}
    </>
  );
}
