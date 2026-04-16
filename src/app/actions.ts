"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb, getOne } from "@/lib/db";
import { loginWithPassword, logout, requireAdmin, requireUser } from "@/lib/auth";
import {
  createDailyReport,
  createProject,
  createStrategy,
  createTask,
  createUser,
  deleteProjectPermanently,
  setProjectArchivedState,
  updateProject,
  updateTaskProgress,
} from "@/lib/data";
import { TASK_WORKFLOW_STATUSES } from "@/lib/task-workflow";

const loginSchema = z.object({
  email: z.email("Valid email is required."),
  password: z.string().min(6, "Password is required."),
});

const createUserSchema = z.object({
  fullName: z.string().min(2, "Name is required."),
  email: z.email("Valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["admin", "employee"]),
});

const createProjectSchema = z.object({
  name: z.string().min(3),
  clientName: z.string().min(2),
  sourceChannel: z.string().min(2),
  status: z.enum(["planning", "active", "review", "done"]),
  dueDate: z.string().optional().transform((value) => value || null),
  summary: z.string().min(10),
});

const updateProjectSchema = createProjectSchema.extend({
  projectId: z.string().min(1),
});

const projectArchiveSchema = z.object({
  projectId: z.string().min(1),
});

const createStrategySchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(3),
  summary: z.string().min(10),
  objective: z.string().min(10),
});

const createTaskSchema = z.object({
  projectId: z.string().min(1),
  strategyId: z.string().optional().transform((value) => value || null),
  title: z.string().min(3),
  description: z.string().min(10),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(TASK_WORKFLOW_STATUSES),
  assigneeId: z.string().min(1),
  estimatedHours: z.coerce.number().min(0),
  dueDate: z.string().optional().transform((value) => value || null),
});

const updateTaskSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(TASK_WORKFLOW_STATUSES),
  timeSpentHours: z.coerce.number().min(0),
  outcome: z.string().min(3),
  blockers: z.string().optional().default(""),
});

const dailyReportSchema = z.object({
  projectId: z.string().min(1),
  reportDate: z.string().min(1),
  summary: z.string().min(10),
  nextSteps: z.string().min(10),
  totalHours: z.coerce.number().min(0),
});

export type LoginState = {
  error?: string;
};

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid form submission." };
  }

  const result = await loginWithPassword(parsed.data.email.toLowerCase(), parsed.data.password);
  if (!result.success) {
    return { error: result.message };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const parsed = createUserSchema.parse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  await createUser({
    fullName: parsed.fullName,
    email: parsed.email,
    password: parsed.password,
    role: parsed.role,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?message=user-created");
}

export async function createProjectAction(formData: FormData) {
  const user = await requireAdmin();

  const parsed = createProjectSchema.parse({
    name: formData.get("name"),
    clientName: formData.get("clientName"),
    sourceChannel: formData.get("sourceChannel"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    summary: formData.get("summary"),
  });

  await createProject({
    ...parsed,
    createdBy: user.id,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?message=project-created");
}

export async function updateProjectAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateProjectSchema.parse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    clientName: formData.get("clientName"),
    sourceChannel: formData.get("sourceChannel"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    summary: formData.get("summary"),
  });

  await updateProject(parsed);

  revalidatePath("/dashboard");
  redirect("/dashboard?message=project-updated#admin-projects");
}

export async function archiveProjectAction(formData: FormData) {
  await requireAdmin();

  const parsed = projectArchiveSchema.parse({
    projectId: formData.get("projectId"),
  });

  await setProjectArchivedState({
    projectId: parsed.projectId,
    archived: true,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?message=project-archived#admin-projects");
}

export async function restoreProjectAction(formData: FormData) {
  await requireAdmin();

  const parsed = projectArchiveSchema.parse({
    projectId: formData.get("projectId"),
  });

  await setProjectArchivedState({
    projectId: parsed.projectId,
    archived: false,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?message=project-restored#admin-projects");
}

export async function deleteProjectAction(formData: FormData) {
  await requireAdmin();

  const parsed = projectArchiveSchema.parse({
    projectId: formData.get("projectId"),
  });

  await deleteProjectPermanently(parsed.projectId);

  revalidatePath("/dashboard");
  redirect("/dashboard?message=project-deleted#admin-projects");
}

export async function createStrategyAction(formData: FormData) {
  const user = await requireAdmin();

  const parsed = createStrategySchema.parse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    objective: formData.get("objective"),
  });

  await createStrategy({
    ...parsed,
    createdBy: user.id,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?message=strategy-created");
}

export async function createTaskAction(formData: FormData) {
  const user = await requireAdmin();

  const parsed = createTaskSchema.parse({
    projectId: formData.get("projectId"),
    strategyId: formData.get("strategyId"),
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    status: formData.get("status"),
    assigneeId: formData.get("assigneeId"),
    estimatedHours: formData.get("estimatedHours"),
    dueDate: formData.get("dueDate"),
  });

  await createTask({
    ...parsed,
    createdBy: user.id,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?message=task-created");
}

export async function updateTaskProgressAction(formData: FormData) {
  const user = await requireUser();

  const parsed = updateTaskSchema.parse({
    taskId: formData.get("taskId"),
    status: formData.get("status"),
    timeSpentHours: formData.get("timeSpentHours"),
    outcome: formData.get("outcome"),
    blockers: formData.get("blockers"),
  });

  const db = await getDb();
  const task = getOne<{ assignee_id: string }>(
    db,
    "SELECT assignee_id FROM tasks WHERE id = ?",
    [parsed.taskId],
  );

  if (!task) {
    throw new Error("Task not found.");
  }

  if (user.role !== "admin" && task.assignee_id !== user.id) {
    throw new Error("You can only update your own assigned tasks.");
  }

  await updateTaskProgress({
    taskId: parsed.taskId,
    userId: user.id,
    status: parsed.status,
    timeSpentHours: parsed.timeSpentHours,
    outcome: parsed.outcome,
    blockers: parsed.blockers,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?message=task-updated");
}

export async function submitDailyReportAction(formData: FormData) {
  const user = await requireUser();

  const parsed = dailyReportSchema.parse({
    projectId: formData.get("projectId"),
    reportDate: formData.get("reportDate"),
    summary: formData.get("summary"),
    nextSteps: formData.get("nextSteps"),
    totalHours: formData.get("totalHours"),
  });

  await createDailyReport({
    ...parsed,
    userId: user.id,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?message=report-saved");
}
