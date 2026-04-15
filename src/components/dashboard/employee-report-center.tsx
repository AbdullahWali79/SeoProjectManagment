"use client";

import { useState } from "react";

import { submitDailyReportAction } from "@/app/actions";
import { DashboardModal } from "@/components/dashboard/dashboard-modal";

export function EmployeeReportCenter({
  projectOptions,
  reportCount,
}: {
  projectOptions: Array<{ id: string; name: string }>;
  reportCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="panel section side-panel">
        <div className="section-head">
          <div className="section-copy">
            <p className="eyebrow">Reporting hub</p>
            <h3>Keep delivery updates clean and quick</h3>
            <p className="subtle">
              Submit the end-of-day report from a focused modal while keeping your task board visible.
            </p>
          </div>
        </div>

        <div className="action-grid">
          <button type="button" className="action-button action-button-primary" onClick={() => setOpen(true)}>
            <span className="action-kicker">Daily report</span>
            <strong>Submit today&apos;s update</strong>
            <span>Share completed work, total hours, and the next steps for the project.</span>
          </button>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <p className="eyebrow">Projects</p>
            <p className="summary-value">{projectOptions.length}</p>
            <p className="subtle">Projects currently assigned to you.</p>
          </div>
          <div className="summary-card">
            <p className="eyebrow">Reports sent</p>
            <p className="summary-value">{reportCount}</p>
            <p className="subtle">Saved daily reports already visible to the admin.</p>
          </div>
        </div>

        <section className="subpanel">
          <div className="section-copy">
            <p className="eyebrow">Reporting checklist</p>
            <h4>Before you submit</h4>
          </div>
          <div className="mini-list">
            <div className="mini-item">
              <strong>Update every active task</strong>
              <p className="subtle">Make sure hours, blockers, and outcomes are reflected on the task cards.</p>
            </div>
            <div className="mini-item">
              <strong>Summarize results clearly</strong>
              <p className="subtle">Use plain English so the admin can reuse the update in client conversations.</p>
            </div>
          </div>
        </section>
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
