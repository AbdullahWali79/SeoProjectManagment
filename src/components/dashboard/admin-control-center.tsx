"use client";

import { useMemo, useState } from "react";

import {
  createProjectAction,
  createStrategyAction,
  createTaskAction,
  createUserAction,
} from "@/app/actions";
import { DashboardModal } from "@/components/dashboard/dashboard-modal";
import type { AppRole } from "@/lib/auth";

type ModalKey = "user" | "project" | "strategy" | "task" | null;

export function AdminControlCenter({
  employees,
  projects,
  strategies,
  openTasks,
  todayHours,
  focusTasks,
}: {
  employees: Array<{ id: string; fullName: string; email: string; role: AppRole }>;
  projects: Array<{ id: string; name: string; clientName: string; status: string }>;
  strategies: Array<{ id: string; title: string; projectId: string; projectName: string }>;
  openTasks: number;
  todayHours: number;
  focusTasks: Array<{
    id: string;
    title: string;
    assigneeName: string;
    status: string;
    dueDate: string | null;
  }>;
}) {
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  const employeeOptions = useMemo(
    () => employees.filter((employee) => employee.role === "employee"),
    [employees],
  );

  return (
    <>
      <section className="panel section side-panel sticky-rail">
        <div className="section-head">
          <div className="section-copy">
            <p className="eyebrow">Command center</p>
            <h3>Launch actions without crowding the dashboard</h3>
            <p className="subtle">
              Keep reporting visible while opening forms only when you need to create users, projects, strategies, or
              new assignments.
            </p>
          </div>
        </div>

        <div className="action-grid">
          <button type="button" className="action-button action-button-primary" onClick={() => setActiveModal("user")}>
            <span className="action-kicker">User setup</span>
            <strong>Create admin or employee</strong>
            <span>Add another team member without leaving the operations view.</span>
          </button>
          <button
            type="button"
            className="action-button"
            onClick={() => setActiveModal("project")}
          >
            <span className="action-kicker">Client intake</span>
            <strong>Create a project</strong>
            <span>Capture the new client, source, deadline, and project summary.</span>
          </button>
          <button
            type="button"
            className="action-button"
            onClick={() => setActiveModal("strategy")}
            disabled={projects.length === 0}
          >
            <span className="action-kicker">Planning</span>
            <strong>Save a strategy</strong>
            <span>Record the execution plan before assigning delivery work.</span>
          </button>
          <button
            type="button"
            className="action-button"
            onClick={() => setActiveModal("task")}
            disabled={projects.length === 0 || employeeOptions.length === 0}
          >
            <span className="action-kicker">Execution</span>
            <strong>Assign a task</strong>
            <span>Push the next SEO task to the right team member in seconds.</span>
          </button>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <p className="eyebrow">Open queue</p>
            <p className="summary-value">{openTasks}</p>
            <p className="subtle">Tasks still moving across the delivery team.</p>
          </div>
          <div className="summary-card">
            <p className="eyebrow">Hours today</p>
            <p className="summary-value">{todayHours}</p>
            <p className="subtle">Reported effort already available for client updates.</p>
          </div>
        </div>

        <section className="subpanel">
          <div className="section-copy">
            <p className="eyebrow">Meeting brief</p>
            <h4>Tasks to mention in the next client call</h4>
          </div>
          <div className="mini-list">
            {focusTasks.length ? (
              focusTasks.map((task) => (
                <div key={task.id} className="mini-item">
                  <strong>{task.title}</strong>
                  <p className="subtle">
                    {task.assigneeName} | {task.status.replaceAll("_", " ")} | {task.dueDate || "No due date"}
                  </p>
                </div>
              ))
            ) : (
              <p className="subtle">No active tasks yet.</p>
            )}
          </div>
        </section>

        <section className="subpanel">
          <div className="section-copy">
            <p className="eyebrow">Team snapshot</p>
            <h4>Current active users</h4>
          </div>
          <div className="mini-list">
            {employees.map((employee) => (
              <div key={employee.id} className="mini-item">
                <strong>{employee.fullName}</strong>
                <p className="subtle">
                  {employee.role === "admin" ? "Admin" : "Employee"} | {employee.email}
                </p>
              </div>
            ))}
          </div>
        </section>
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
              <select id="modal-task-status" name="status" className="select form-select" defaultValue="todo">
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
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
