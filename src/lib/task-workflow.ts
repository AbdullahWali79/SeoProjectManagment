export const TASK_WORKFLOW_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "completed",
] as const;

export type TaskWorkflowStatus = (typeof TASK_WORKFLOW_STATUSES)[number];

export const TASK_WORKFLOW_STEPS: Array<{
  value: TaskWorkflowStatus;
  label: string;
  note: string;
}> = [
  {
    value: "backlog",
    label: "Backlog",
    note: "Captured but not ready for delivery yet.",
  },
  {
    value: "todo",
    label: "To do",
    note: "Ready to assign or start next.",
  },
  {
    value: "in_progress",
    label: "In progress",
    note: "Currently being executed by the team.",
  },
  {
    value: "review",
    label: "Review",
    note: "Waiting for admin or QA sign-off.",
  },
  {
    value: "completed",
    label: "Completed",
    note: "Closed work that is fully finished.",
  },
];

const TASK_STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  completed: "Completed",
  done: "Completed",
  blocked: "In progress",
};

const TASK_STATUS_SORT_RANK: Record<TaskWorkflowStatus, number> = {
  backlog: 4,
  todo: 3,
  in_progress: 1,
  review: 2,
  completed: 5,
};

export function normalizeTaskWorkflowStatus(status: string | null | undefined): TaskWorkflowStatus {
  switch (status) {
    case "completed":
    case "review":
    case "in_progress":
    case "todo":
    case "backlog":
      return status;
    case "done":
      return "completed";
    case "blocked":
      return "in_progress";
    default:
      return "backlog";
  }
}

export function getTaskStatusLabel(status: string | null | undefined) {
  if (!status) {
    return "Backlog";
  }

  return TASK_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export function isTaskCompleted(status: string | null | undefined) {
  return normalizeTaskWorkflowStatus(status) === "completed";
}

export function getTaskWorkflowSortRank(status: string | null | undefined) {
  return TASK_STATUS_SORT_RANK[normalizeTaskWorkflowStatus(status)];
}
